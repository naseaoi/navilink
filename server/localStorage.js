import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { fetchWebDavJson, fetchWebDavJsonWithMeta, putWebDavJson, putWebDavJsonBatch } from '../api/_shared/webdav.js';
import { getUpdatedAt, withTimestamp } from '../api/_shared/data.js';
import { prepareSaveData } from '../api/_shared/saveData.js';

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

  const memoryCache = {
    'public.json': null,
    'private.json': null
  };
  const parsedPublicCacheTtlMs = Number(publicCacheTtlMs);
  const effectivePublicCacheTtlMs = Number.isSafeInteger(parsedPublicCacheTtlMs)
    && parsedPublicCacheTtlMs >= 0
    && parsedPublicCacheTtlMs <= 300_000
    ? parsedPublicCacheTtlMs
    : 15_000;
  let publicCacheExpiresAt = 0;
  let writeQueue = Promise.resolve();

  const runWrite = (operation) => {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.then(() => undefined, () => undefined);
    return result;
  };

  const updateMemoryCache = (fileName, data) => {
    memoryCache[fileName] = data;
    if (fileName === 'public.json') publicCacheExpiresAt = Date.now() + effectivePublicCacheTtlMs;
  };

  const readLocalJson = async (filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  };

  const writeLocalJsonAtomic = async (filePath, data) => {
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, filePath);
  };

  const restoreLocalBackup = async ({ filePath, backupPath, hadOriginal }) => {
    if (hadOriginal) {
      await fs.rename(backupPath, filePath);
      return;
    }
    await fs.rm(filePath, { force: true });
  };

  const writeLocalJsonBatchAtomic = async (items) => {
    const txId = randomUUID();
    const prepared = items.map(({ filePath, data }) => ({
      filePath,
      data,
      tempPath: `${filePath}.${txId}.tmp`,
      backupPath: `${filePath}.${txId}.bak`,
      hadOriginal: false,
      committed: false
    }));

    try {
      for (const item of prepared) {
        await fs.mkdir(path.dirname(item.filePath), { recursive: true });
        await fs.writeFile(item.tempPath, JSON.stringify(item.data, null, 2));
        try {
          await fs.copyFile(item.filePath, item.backupPath);
          item.hadOriginal = true;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }

      for (const item of prepared) {
        await fs.rename(item.tempPath, item.filePath);
        item.committed = true;
      }
    } catch (error) {
      for (const item of prepared.filter((entry) => entry.committed).reverse()) {
        try {
          await restoreLocalBackup(item);
        } catch (rollbackError) {
          console.error(`[Storage Rollback Error] ${path.basename(item.filePath)}: ${rollbackError.message}`);
        }
      }
      throw error;
    } finally {
      await Promise.all(prepared.flatMap((item) => [
        fs.rm(item.tempPath, { force: true }),
        fs.rm(item.backupPath, { force: true })
      ]));
    }
  };

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
    storageModeCache = nextMode === 'webdav' && !useWebDav ? 'local' : nextMode;
    await writeLocalJsonAtomic(storageConfigPath, { mode: storageModeCache });
    memoryCache['public.json'] = null;
    publicCacheExpiresAt = 0;
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
    updateMemoryCache(fileName, payload);
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
      updateMemoryCache(fileName, data);
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
    const prepared = prepareSaveData({ currentPublic, currentPrivate, publicData, privateData, expected });
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

  const readPublicOrDefault = async () => {
    if (memoryCache['public.json'] && publicCacheExpiresAt > Date.now()) {
      return memoryCache['public.json'];
    }
    const mode = await getStorageMode();
    let publicData = await readDataFromStorage(mode, 'public.json');
    if (!publicData) publicData = await writeDataToStorage(mode, 'public.json', defaultPublicData);
    else updateMemoryCache('public.json', publicData);
    return publicData;
  };

  const readStatus = async () => {
    const localPublic = await readDataFromStorage('local', 'public.json');
    const localPrivate = await readDataFromStorage('local', 'private.json');
    let webdavPublic = null;
    let webdavPrivate = null;
    if (useWebDav) {
      webdavPublic = await readDataFromStorage('webdav', 'public.json');
      webdavPrivate = await readDataFromStorage('webdav', 'private.json');
    }
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
        if (memoryCache[fileName]) return res.json(memoryCache[fileName]);
        const jsonData = await readLocalJson(filePath);
        if (!jsonData) return res.status(404).json({ error: 'File not found' });
        updateMemoryCache(fileName, jsonData);
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
