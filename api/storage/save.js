import { getAuthPayload } from '../_shared/auth.js';
import { withTimestamp } from '../_shared/data.js';
import { prepareSaveData } from '../_shared/saveData.js';
import { fetchWebDavJsonWithMeta, getWebDavEnv, hasWebDavConfig, putWebDavJsonBatch } from '../_shared/webdav.js';

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  try {
    const env = getWebDavEnv({ WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH });
    const currentPublic = await fetchWebDavJsonWithMeta('public.json', env);
    const currentPrivate = await fetchWebDavJsonWithMeta('private.json', env);
    const prepared = prepareSaveData({
      currentPublic: currentPublic.data,
      currentPrivate: currentPrivate.data,
      publicData: request.body?.publicData,
      privateData: request.body?.privateData,
      expected: request.body?.expected
    });
    const savedPublic = withTimestamp('public.json', prepared.publicData);
    const savedPrivate = withTimestamp('private.json', prepared.privateData);
    await putWebDavJsonBatch({
      entries: [
        {
          fileName: 'public.json',
          data: savedPublic,
          ifMatch: currentPublic.etag,
          ifNoneMatch: currentPublic.data == null
        },
        {
          fileName: 'private.json',
          data: savedPrivate,
          ifMatch: currentPrivate.etag,
          ifNoneMatch: currentPrivate.data == null
        }
      ],
      originals: {
        'public.json': currentPublic.data,
        'private.json': currentPrivate.data
      },
      env
    });
    return response.json({ publicData: savedPublic, privateData: savedPrivate });
  } catch (error) {
    if (error?.statusCode === 400 || error?.statusCode === 409) {
      return response.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return response.status(500).json({ error: 'Save Error', message: error.message });
  }
}
