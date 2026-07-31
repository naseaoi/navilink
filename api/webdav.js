import { getAuthPayload, getWritableAuthPayload, normalizePrivateDataAsync } from './_shared/auth.js';
import { createDefaultPublicData } from './_shared/defaultData.js';
import { getRequestedDataFile, withTimestamp } from './_shared/data.js';
import { hasWebDavConfig, putWebDavJson } from './_shared/webdav.js';
import { proxyWebDavDataFile } from './_shared/webdavProxy.js';
import { validateDataFilePayload } from './_shared/validation.js';
import { getPublicDataCacheControl, isCacheablePublicDataRequest } from './_shared/httpCache.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;

  if (!['GET', 'PUT'].includes(request.method)) {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const { file } = request.query;
  const fileName = getRequestedDataFile(file);
  if (!fileName) {
    return response.status(400).json({ error: 'Invalid file parameter' });
  }

  const isPrivate = fileName === 'private.json';
  const isWrite = request.method === 'PUT';

  const isCacheablePublicRead = isCacheablePublicDataRequest({
    method: request.method,
    file,
    fresh: request.query.fresh
  });
  response.setHeader('Cache-Control', isCacheablePublicRead ? getPublicDataCacheControl() : 'no-store');

  if (isPrivate || isWrite) {
    if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
    const auth = isWrite
      ? getWritableAuthPayload(request, AUTH_SECRET)
      : { payload: getAuthPayload(request, AUTH_SECRET), error: 'UNAUTHORIZED' };
    if (!auth.payload) {
      const status = auth.error === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 401;
      return response.status(status).json({ error: auth.error === 'PASSWORD_CHANGE_REQUIRED' ? 'Password change required' : 'Unauthorized', code: auth.error });
    }
  }
  
  const method = request.method;

  try {
    let body;
    if (method === 'PUT') {
      const validated = validateDataFilePayload(fileName, request.body);
      const bodyData = isPrivate ? await normalizePrivateDataAsync(validated) : validated;
      body = withTimestamp(fileName, bodyData);
    }

    const result = await proxyWebDavDataFile({ method, fileName, body });
    if (method === 'GET' && fileName === 'public.json' && result.status === 404) {
      const publicData = withTimestamp('public.json', createDefaultPublicData());
      await putWebDavJson('public.json', publicData);
      return response.json(publicData);
    }
    if (result.json) return response.status(result.status).json(result.body);
    return response.status(result.status).send(result.body);

  } catch (error) {
    if (error?.statusCode === 400) {
      return response.status(400).json({ error: error.message });
    }
    console.error('[WebDAV Proxy] Exception:', error);
    return response.status(500).json({ error: 'Server proxy error', message: error.message });
  }
}
