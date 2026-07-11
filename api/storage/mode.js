import { getWritableAuthPayload } from '../_shared/auth.js';
import { hasWebDavConfig } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const auth = getWritableAuthPayload(request, AUTH_SECRET);
  if (!auth.payload) {
    const status = auth.error === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 401;
    return response.status(status).json({ error: status === 403 ? 'Password change required' : 'Unauthorized', code: auth.error });
  }

  if (request.method === 'GET') {
    return response.json({ mode: 'webdav', available: { local: false, webdav: true } });
  }

  if (request.method === 'PUT') {
    const { mode } = request.body || {};
    if (mode && mode !== 'webdav') return response.status(400).json({ error: 'Local storage not available on Vercel' });
    return response.json({ mode: 'webdav', available: { local: false, webdav: true } });
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
