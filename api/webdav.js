import { getAuthPayload, normalizePrivateData } from './_shared/auth.js';
import { getRequestedDataFile, withTimestamp } from './_shared/data.js';
import { hasWebDavConfig } from './_shared/webdav.js';
import { proxyWebDavDataFile } from './_shared/webdavProxy.js';
import { validateDataFilePayload } from './_shared/validation.js';

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

  if (isPrivate || isWrite) {
    if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
    const payload = getAuthPayload(request, AUTH_SECRET);
    if (!payload) return response.status(401).json({ error: 'Unauthorized' });
  }
  
  const method = request.method;

  try {
    let body;
    if (method === 'PUT') {
      const validated = validateDataFilePayload(fileName, request.body);
      const bodyData = isPrivate ? normalizePrivateData(validated) : validated;
      body = withTimestamp(fileName, bodyData);
    }

    const result = await proxyWebDavDataFile({ method, fileName, body });
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
