import crypto from 'crypto';

const verifyToken = (token, secret) => {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  const valid = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
};

const fetchWebDavJson = async (fileName, env) => {
  const baseUrl = env.WEBDAV_URL.replace(/\/+$/, '');
  const davPath = (env.WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, '');
  const targetUrl = `${baseUrl}/${davPath}/${fileName}`;
  const authHeader = 'Basic ' + Buffer.from(`${env.WEBDAV_USERNAME}:${env.WEBDAV_PASSWORD}`).toString('base64');
  const response = await fetch(targetUrl, { method: 'GET', headers: { Authorization: authHeader } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`WebDAV read failed: ${response.status}`);
  return response.json();
};

const getUpdatedAt = (data) => {
  if (!data || !data._meta || !data._meta.updatedAt) return null;
  return data._meta.updatedAt;
};

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  const payload = verifyToken(token, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  try {
    const env = { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH };
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
