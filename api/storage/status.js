import { getWritableAuthPayload } from '../_shared/auth.js';
import { getUpdatedAt } from '../_shared/data.js';
import { fetchWebDavJson, getWebDavEnv, hasWebDavConfig } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const auth = getWritableAuthPayload(request, AUTH_SECRET);
  if (!auth.payload) {
    const status = auth.error === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 401;
    return response.status(status).json({ error: status === 403 ? 'Password change required' : 'Unauthorized', code: auth.error });
  }

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
