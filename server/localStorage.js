import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fetchWebDavJson, putWebDavJson } from '../api/_shared/webdav.js';
import { getUpdatedAt, withTimestamp } from '../api/_shared/data.js';

export const createStorageService = ({ dataDir, storageConfigPath, useWebDav, defaultPrivateData }) => {
  if (!existsSync(dataDir)) {
    console.log(`[System] Creating data directory: ${dataDir}`);
    mkdirSync(dataDir, { recursive: true });
  }

  const memoryCache = {
    'public.json': null,
    'private.json': null
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
    memoryCache[fileName] = payload;
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

  const readPrivateOrDefault = async () => {
    const mode = await getStorageMode();
    let privateData = await readDataFromStorage(mode, 'private.json');
    if (!privateData) {
      privateData = defaultPrivateData;
      await writeDataToStorage(mode, 'private.json', privateData);
    }
    return { mode, privateData };
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
        if (memoryCache[fileName]) return res.json(memoryCache[fileName]);
        const jsonData = await readLocalJson(filePath);
        if (!jsonData) return res.status(404).json({ error: 'File not found' });
        memoryCache[fileName] = jsonData;
        return res.json(jsonData);
      }
      if (req.method === 'PUT') {
        memoryCache[fileName] = req.body;
        await writeLocalJsonAtomic(filePath, req.body);
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
    readPrivateOrDefault,
    readStatus,
    handleLocalStorage
  };
};
