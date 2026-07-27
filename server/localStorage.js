import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fetchWebDavJson, fetchWebDavJsonWithMeta, putWebDavJson, putWebDavJsonBatch } from '../api/_shared/webdav.js';
import { getUpdatedAt, withTimestamp } from '../api/_shared/data.js';

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
    const tempPath = `${filePath}.tmp`;
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
    const txId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  const setStorageMode = async (mode) => {
    storageModeCache = normalizeStorageMode(mode);
    if (storageModeCache === 'webdav' && !useWebDav) storageModeCache = 'local';
    await writeLocalJsonAtomic(storageConfigPath, { mode: storageModeCache });
    memoryCache['public.json'] = null;
    publicCacheExpiresAt = 0;
    return storageModeCache;
  };

  const readDataFromStorage = async (mode, fileName) => {
    if (mode === 'webdav') return fetchWebDavJson(fileName);
    return readLocalJson(path.join(dataDir, fileName));
  };

  const writeDataToStorage = async (mode, fileName, data) => {
    const payload = withTimestamp(fileName, data);
    if (mode === 'webdav') {
      await putWebDavJson(fileName, payload);
      return payload;
    }
    await writeLocalJsonAtomic(path.join(dataDir, fileName), payload);
    updateMemoryCache(fileName, payload);
    return payload;
  };

  const readCurrentData = async (fileName) => {
    const mode = await getStorageMode();
    return readDataFromStorage(mode, fileName);
  };

  const writeCurrentData = async (fileName, data) => {
    const mode = await getStorageMode();
    return writeDataToStorage(mode, fileName, data);
  };

  const writeDataBatchToStorage = async (mode, entries) => {
    const payloads = entries.map(({ fileName, data }) => ({ fileName, data: withTimestamp(fileName, data) }));
    if (mode === 'webdav') {
      const originals = Object.fromEntries(await Promise.all(
        payloads.map(async ({ fileName }) => {
          const original = await fetchWebDavJsonWithMeta(fileName);
          return [fileName, original];
        })
      ));
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

  const writeCurrentDataBatch = async (entries) => {
    const mode = await getStorageMode();
    return writeDataBatchToStorage(mode, entries);
  };

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
        await writeLocalJsonAtomic(filePath, req.body);
        updateMemoryCache(fileName, req.body);
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
    readCurrentData,
    writeCurrentData,
    writeDataBatchToStorage,
    writeCurrentDataBatch,
    readPrivateOrDefault,
    readPublicOrDefault,
    readStatus,
    handleLocalStorage,
    updateMemoryCache
  };
};
