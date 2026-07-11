import {
  buildClearAuthCookie,
  createDefaultPrivateData,
  getAuthPayload
} from './_shared/auth.js';
import { loginAdmin } from './_shared/authService.js';
import { createLoginRateLimiter } from './_shared/rateLimit.js';
import { withTimestamp } from './_shared/data.js';
import { fetchWebDavJson, getWebDavEnv, hasWebDavConfig, putWebDavJson } from './_shared/webdav.js';

const getVercelClientIp = (request) => {
  const forwarded = request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return request.socket?.remoteAddress || 'unknown';
};

const loginRateLimiter = createLoginRateLimiter({ getClientIp: getVercelClientIp });

const sendAuthResult = (response, result) => {
  Object.entries(result.headers || {}).forEach(([name, value]) => response.setHeader(name, value));
  return response.status(result.status).json(result.body);
};

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  if (request.method === 'GET') {
    const payload = getAuthPayload(request, AUTH_SECRET);
    if (!payload) return response.status(401).json({ ok: false });
    return response.json({ ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword });
  }

  if (request.method === 'DELETE') {
    response.setHeader('Set-Cookie', buildClearAuthCookie());
    return response.json({ ok: true });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getWebDavEnv({ WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH });
    const result = await loginAdmin({
      request,
      body: request.body,
      authSecret: AUTH_SECRET,
      loginRateLimiter,
      readPrivateData: async () => {
        const privateData = await fetchWebDavJson('private.json', env);
        if (privateData) return privateData;
        const defaultPrivateData = createDefaultPrivateData();
        await putWebDavJson('private.json', withTimestamp('private.json', defaultPrivateData), env);
        return defaultPrivateData;
      },
      writePrivateData: (privateData) => putWebDavJson('private.json', withTimestamp('private.json', privateData), env)
    });
    return sendAuthResult(response, result);
  } catch (error) {
    console.error('[Auth] Exception:', error);
    return response.status(500).json({ error: 'Auth Error', message: error.message });
  }
}
