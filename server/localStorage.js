import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createLocalJsonStore } from './localJsonStore.js';
import { fetchWebDavJson, fetchWebDavJsonWithMeta, putWebDavJson, putWebDavJsonBatch } from '../api/_shared/webdav.js';
import { getUpdatedAt, withTimestamp } from '../api/_shared/data.js';
import { prepareSaveData } from '../api/_shared/saveData.js';
import { createPublicDataCache } from './publicDataCache.js';

export const createStorageService = ({
  dataDir,
  storageConfigPath,
  useWebDav,
  defaultPublicData,
  defaultPrivateData,
  publicCacheTtlMs = process.env.PUBLIC_DATA_CACHE_TTL_MS
}) => {
  if (!existsSync(dataDir)) {
    console.log(`[System] Creating data directory: ${dataDir}`);
    mkdirSync(dataDir, { recursive: true });
  }

  const parsedPublicCacheTtlMs = Number(publicCacheTtlMs);
  const effectivePublicCacheTtlMs = Number.isSafeInteger(parsedPublicCacheTtlMs)
    && parsedPublicCacheTtlMs >= 0
    && parsedPublicCacheTtlMs <= 300_000
    ? parsedPublicCacheTtlMs
    : 15_000;
  const publicCache = createPublicDataCache(effectivePublicCacheTtlMs);
  let writeQueue = Promise.resolve();

  const runWrite = (operation) => {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.then(() => undefined, () => undefined);
    return result;
  };

  const updateMemoryCache = (mode, fileName, data) => {
    if (fileName === 'public.json') publicCache.store(mode, data);
  };

  const localFiles = createLocalJsonStore(dataDir);
  const readLocalJson = localFiles.read;
  const writeLocalJsonAtomic = localFiles.write;
  const writeLocalJsonBatchAtomic = localFiles.writeBatch;

  const normalizeStorageMode = (mode) => (mode === 'webdav' ? 'webdav' : 'local');
  const defaultStorageMode = useWebDav ? 'webdav' : 'local';
  let storageModeCache = null;

  const getStorageMode = async () => {
    if (storageModeCache) return storageModeCache;
    const config = await readLocalJson(storageConfigPath);
    if (config?.mode) storageModeCache = normalizeStorageMode(config.mode);
    else storageModeCache = defaultStorageMode;
    if (storageModeCache === 'webdav' && !useWebDav) storageModeCache = 'local';
    return storageModeCache;
  };

  const setStorageMode = (mode) => runWrite(async () => {
    const nextMode = normalizeStorageMode(mode);
    const availableMode = nextMode === 'webdav' && !useWebDav ? 'local' : nextMode;
    await writeLocalJsonAtomic(storageConfigPath, { mode: availableMode });
    storageModeCache = availableMode;
    publicCache.invalidate();
    return storageModeCache;
  });

  const readDataFromStorage = async (mode, fileName) => {
    if (mode === 'webdav') return fetchWebDavJson(fileName);
    return readLocalJson(path.join(dataDir, fileName));
  };

  const writeDataToStorageUnlocked = async (mode, fileName, data) => {
    const payload = withTimestamp(fileName, data);
    if (mode === 'webdav') {
      await putWebDavJson(fileName, payload);
    } else {
      await writeLocalJsonAtomic(path.join(dataDir, fileName), payload);
    }
    updateMemoryCache(mode, fileName, payload);
    return payload;
  };

  const writeDataToStorage = (mode, fileName, data) => runWrite(
    () => writeDataToStorageUnlocked(mode, fileName, data)
  );

  const writeCurrentData = (fileName, data) => runWrite(async () => {
    const mode = await getStorageMode();
    return writeDataToStorageUnlocked(mode, fileName, data);
  });

  const loadWebDavOriginals = async (entries) => Object.fromEntries(await Promise.all(
    entries.map(async ({ fileName }) => [fileName, await fetchWebDavJsonWithMeta(fileName)])
  ));

  const writeDataBatchToStorageUnlocked = async (mode, entries, providedOriginals = null) => {
    const payloads = entries.map(({ fileName, data }) => ({ fileName, data: withTimestamp(fileName, data) }));
    if (mode === 'webdav') {
      const originals = providedOriginals || await loadWebDavOriginals(payloads);
      await putWebDavJsonBatch({
        entries: payloads.map((payload) => ({
          ...payload,
          ifMatch: originals[payload.fileName].etag,
          ifNoneMatch: originals[payload.fileName].data == null
        })),
        originals: Object.fromEntries(
          Object.entries(originals).map(([fileName, original]) => [fileName, original.data])
        )
      });
    } else {
      await writeLocalJsonBatchAtomic(payloads.map(({ fileName, data }) => ({
        filePath: path.join(dataDir, fileName),
        data
      })));
    }
    payloads.forEach(({ fileName, data }) => {
      updateMemoryCache(mode, fileName, data);
    });
    return Object.fromEntries(payloads.map(({ fileName, data }) => [fileName, data]));
  };

  const writeDataBatchToStorage = (mode, entries) => runWrite(
    () => writeDataBatchToStorageUnlocked(mode, entries)
  );

  const saveCurrentData = ({ publicData, privateData, expected }) => runWrite(async () => {
    const mode = await getStorageMode();
    let currentPublic;
    let currentPrivate;
    let webDavOriginals = null;
    if (mode === 'webdav') {
      webDavOriginals = await loadWebDavOriginals([
        { fileName: 'public.json' },
        { fileName: 'private.json' }
      ]);
      currentPublic = webDavOriginals['public.json'].data;
      currentPrivate = webDavOriginals['private.json'].data;
    } else {
      [currentPublic, currentPrivate] = await Promise.all([
        readDataFromStorage(mode, 'public.json'),
        readDataFromStorage(mode, 'private.json')
      ]);
    }
    const prepared = await prepareSaveData({ currentPublic, currentPrivate, publicData, privateData, expected });
    return writeDataBatchToStorageUnlocked(mode, [
      { fileName: 'public.json', data: prepared.publicData },
      { fileName: 'private.json', data: prepared.privateData }
    ], webDavOriginals);
  });

  const readPrivateOrDefault = async () => {
    const mode = await getStorageMode();
    let privateData = await readDataFromStorage(mode, 'private.json');
    if (!privateData) {
      privateData = defaultPrivateData;
      await writeDataToStorage(mode, 'private.json', privateData);
    }
    return { mode, privateData };
  };

  const readPublicOrDefault = async ({ forceRefresh = false } = {}) => {
    while (true) {
      const mode = await getStorageMode();
      const publicData = await publicCache.read(mode, async () => {
        const stored = await readDataFromStorage(mode, 'public.json');
        if (stored) return stored;
        if (mode !== await getStorageMode()) return undefined;
        return writeDataToStorage(mode, 'public.json', defaultPublicData);
      }, { forceRefresh });
      if (publicData !== undefined && mode === await getStorageMode()) return publicData;
    }
  };

  const readStatus = async () => {
    const [localPublic, localPrivate, webdavPublic, webdavPrivate] = await Promise.all([
      readDataFromStorage('local', 'public.json'),
      readDataFromStorage('local', 'private.json'),
      useWebDav ? readDataFromStorage('webdav', 'public.json') : null,
      useWebDav ? readDataFromStorage('webdav', 'private.json') : null
    ]);
    return {
      local: { publicUpdatedAt: getUpdatedAt(localPublic), privateUpdatedAt: getUpdatedAt(localPrivate) },
      webdav: { publicUpdatedAt: getUpdatedAt(webdavPublic), privateUpdatedAt: getUpdatedAt(webdavPrivate) },
      available: { local: true, webdav: useWebDav }
    };
  };

  const handleLocalStorage = async (req, res, fileName) => {
    const filePath = path.join(dataDir, fileName);
    try {
      if (req.method === 'GET') {
        if (fileName === 'public.json') return res.json(await readPublicOrDefault());
        const jsonData = await readLocalJson(filePath);
        if (!jsonData) return res.status(404).json({ error: 'File not found' });
        return res.json(jsonData);
      }
      if (req.method === 'PUT') {
        await writeDataToStorage('local', fileName, req.body);
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      console.error(`[Storage Error] ${error.message}`);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  };

  return {
    getStorageMode,
    setStorageMode,
    readDataFromStorage,
    writeDataToStorage,
    writeCurrentData,
    writeDataBatchToStorage,
    saveCurrentData,
    readPrivateOrDefault,
    readPublicOrDefault,
    readStatus,
    handleLocalStorage
  };
};
