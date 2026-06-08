import { getAuthPayload } from '../_shared/auth.js';
import { hasWebDavConfig } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

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
