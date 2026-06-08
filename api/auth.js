import {
  DEFAULT_ADMIN_PASSWORD,
  createDefaultPrivateData,
  getAuthPayload,
  normalizePrivateData,
  signToken,
  verifyPassword
} from './_shared/auth.js';
import { createLoginRateLimiter } from './_shared/rateLimit.js';
import { withTimestamp } from './_shared/data.js';
import { fetchWebDavJson, getWebDavEnv, hasWebDavConfig, putWebDavJson } from './_shared/webdav.js';

const loginRateLimiter = createLoginRateLimiter();

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

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, remember } = request.body || {};
  if (!username || !password) return response.status(400).json({ error: 'Missing credentials' });
  const rateKey = loginRateLimiter.getKey(request, username);
  const rateState = loginRateLimiter.getState(rateKey);
  if (rateState.limited) {
    response.setHeader('Retry-After', String(rateState.retryAfterSeconds));
    return response.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  try {
    const env = getWebDavEnv({ WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH });
    let privateData = await fetchWebDavJson('private.json', env);
    if (!privateData) {
      privateData = createDefaultPrivateData();
      await putWebDavJson('private.json', withTimestamp('private.json', privateData), env);
    }

    const stored = privateData?.admin?.passwordHash || '';
    const isValid = verifyPassword(password, stored) && privateData?.admin?.username === username;
    if (!isValid) {
      loginRateLimiter.recordFailure(rateKey);
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    loginRateLimiter.clear(rateKey);

    if (stored && !stored.startsWith('scrypt$')) {
      const upgraded = normalizePrivateData(privateData);
      await putWebDavJson('private.json', withTimestamp('private.json', upgraded), env);
    }

    const mustChangePassword = verifyPassword(DEFAULT_ADMIN_PASSWORD, stored);
    const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const exp = Date.now() + duration;
    const token = signToken({ username, exp, mustChangePassword }, AUTH_SECRET);
    return response.json({ token, exp, mustChangePassword });
  } catch (error) {
    console.error('[Auth] Exception:', error);
    return response.status(500).json({ error: 'Auth Error', message: error.message });
  }
}
