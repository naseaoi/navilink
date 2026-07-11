import { getAuthPayload } from '../_shared/auth.js';
import { changeAdminPassword } from '../_shared/passwordService.js';
import { fetchWebDavJson, getWebDavEnv, hasWebDavConfig, putWebDavJson } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });

  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  try {
    const env = getWebDavEnv({ WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH });
    const currentPrivate = await fetchWebDavJson('private.json', env);
    if (!currentPrivate) return response.status(409).json({ error: 'Private data is missing' });
    const result = await changeAdminPassword({
      body: request.body,
      authPayload: payload,
      authSecret: AUTH_SECRET,
      writePrivateData: (privateData) => putWebDavJson('private.json', privateData, env)
    });
    Object.entries(result.headers || {}).forEach(([name, value]) => response.setHeader(name, value));
    return response.status(result.status).json(result.body);
  } catch (error) {
    return response.status(500).json({ error: 'Password Error', message: error.message });
  }
}
