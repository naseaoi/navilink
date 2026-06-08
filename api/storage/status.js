import { getAuthPayload } from '../_shared/auth.js';
import { getUpdatedAt } from '../_shared/data.js';
import { fetchWebDavJson, getWebDavEnv, hasWebDavConfig } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  try {
    const env = getWebDavEnv({ WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH });
    const publicData = await fetchWebDavJson('public.json', env);
    const privateData = await fetchWebDavJson('private.json', env);
    return response.json({
      local: { publicUpdatedAt: null, privateUpdatedAt: null },
      webdav: { publicUpdatedAt: getUpdatedAt(publicData), privateUpdatedAt: getUpdatedAt(privateData) },
      available: { local: false, webdav: true }
    });
  } catch (error) {
    return response.status(500).json({ error: 'Status Error', message: error.message });
  }
}
