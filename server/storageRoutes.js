import { getRequestedDataFile, withTimestamp } from '../api/_shared/data.js';
import { normalizePrivateData } from '../api/_shared/auth.js';
import { proxyWebDavDataFile } from '../api/_shared/webdavProxy.js';
import { validateDataFilePayload } from '../api/_shared/validation.js';
import { prepareSaveData } from '../api/_shared/saveData.js';

const sendValidationError = (res, error) => {
  if (error?.statusCode === 400 || error?.statusCode === 409) {
    return res.status(error.statusCode).json({ error: error.message, code: error.code });
  }
  throw error;
};

export const registerStorageRoutes = ({ app, storage, requireAuth, useWebDav }) => {
  app.all('/api/webdav', async (req, res) => {
    if (!['GET', 'PUT'].includes(req.method)) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const fileName = getRequestedDataFile(req.query.file);
    if (!fileName) return res.status(400).json({ error: 'Invalid file parameter' });

    const isPrivate = fileName === 'private.json';
    const isWrite = req.method === 'PUT';
    if (isPrivate || isWrite) {
      const payload = requireAuth(req, res, { allowPasswordChangeRequired: isPrivate && !isWrite });
      if (!payload) return;
    }

    if (isWrite) {
      try {
        req.body = validateDataFilePayload(fileName, req.body);
        if (isPrivate) req.body = normalizePrivateData(req.body);
        req.body = withTimestamp(fileName, req.body);
      } catch (error) {
        return sendValidationError(res, error);
      }
    }

    const storageMode = await storage.getStorageMode();
    if (storageMode === 'webdav') {
      try {
        const result = await proxyWebDavDataFile({ method: req.method, fileName, body: req.body });
        if (result.status === 404 && fileName === 'public.json') {
          return res.json(await storage.readPublicOrDefault());
        }
        if (result.json) return res.status(result.status).json(result.body);
        return res.status(result.status).send(result.body);
      } catch (error) {
        console.error(`[WebDAV Proxy Error] ${error.message}`);
        return res.status(500).json({ error: 'Proxy Error' });
      }
    }
    return storage.handleLocalStorage(req, res, fileName);
  });

  app.post('/api/storage/save', async (req, res) => {
    const payload = requireAuth(req, res);
    if (!payload) return;

    try {
      const currentPublic = await storage.readCurrentData('public.json');
      const currentPrivate = await storage.readCurrentData('private.json');
      const prepared = prepareSaveData({
        currentPublic,
        currentPrivate,
        publicData: req.body?.publicData,
        privateData: req.body?.privateData,
        expected: req.body?.expected
      });
      const saved = await storage.writeCurrentDataBatch([
        { fileName: 'public.json', data: prepared.publicData },
        { fileName: 'private.json', data: prepared.privateData }
      ]);
      return res.json({ publicData: saved['public.json'], privateData: saved['private.json'] });
    } catch (error) {
      return sendValidationError(res, error);
    }
  });

  app.get('/api/storage/mode', async (req, res) => {
    const payload = requireAuth(req, res);
    if (!payload) return;
    const mode = await storage.getStorageMode();
    return res.json({ mode, available: { local: true, webdav: useWebDav } });
  });

  app.get('/api/storage/status', async (req, res) => {
    const payload = requireAuth(req, res);
    if (!payload) return;
    try {
      return res.json(await storage.readStatus());
    } catch (error) {
      console.error(`[Storage Status Error] ${error.message}`);
      return res.status(500).json({ error: 'Status Error' });
    }
  });

  app.put('/api/storage/mode', async (req, res) => {
    const payload = requireAuth(req, res);
    if (!payload) return;
    const { mode } = req.body || {};
    if (!mode || !['local', 'webdav'].includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
    if (mode === 'webdav' && !useWebDav) return res.status(400).json({ error: 'WebDAV not available' });
    const next = await storage.setStorageMode(mode);
    return res.json({ mode: next, available: { local: true, webdav: useWebDav } });
  });

  app.post('/api/storage/sync', async (req, res) => {
    const payload = requireAuth(req, res);
    if (!payload) return;
    const { from, to } = req.body || {};
    if (!from || !to || !['local', 'webdav'].includes(from) || !['local', 'webdav'].includes(to)) {
      return res.status(400).json({ error: 'Invalid source/target' });
    }
    if (from === to) return res.status(400).json({ error: 'Source and target are the same' });
    if ((from === 'webdav' || to === 'webdav') && !useWebDav) {
      return res.status(400).json({ error: 'WebDAV not available' });
    }

    try {
      const publicData = await storage.readDataFromStorage(from, 'public.json');
      if (!publicData) return res.status(404).json({ error: 'public.json not found in source' });
      let privateData = await storage.readDataFromStorage(from, 'private.json');
      if (!privateData) {
        const current = await storage.readPrivateOrDefault();
        privateData = current.privateData;
      }
      await storage.writeDataBatchToStorage(to, [
        { fileName: 'public.json', data: validateDataFilePayload('public.json', publicData) },
        { fileName: 'private.json', data: normalizePrivateData(validateDataFilePayload('private.json', privateData)) }
      ]);
      return res.json({ success: true });
    } catch (error) {
      if (error?.statusCode === 400) return sendValidationError(res, error);
      console.error(`[Storage Sync Error] ${error.message}`);
      return res.status(500).json({ error: 'Sync Error' });
    }
  });
};
