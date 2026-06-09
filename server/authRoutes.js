import {
  DEFAULT_ADMIN_PASSWORD,
  buildAuthCookie,
  buildClearAuthCookie,
  getAuthToken,
  normalizePrivateData,
  signToken,
  verifyPassword,
  verifyToken
} from '../api/_shared/auth.js';
import { withTimestamp } from '../api/_shared/data.js';
import { validateLoginPayload } from '../api/_shared/validation.js';

const sendValidationError = (res, error) => {
  if (error?.statusCode === 400) return res.status(400).json({ error: error.message });
  throw error;
};

export const createRequireAuth = (authSecret) => (req, res) => {
  const token = getAuthToken(req);
  const payload = verifyToken(token, authSecret);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return payload;
};

export const registerAuthRoutes = ({ app, authSecret, loginRateLimiter, storage }) => {
  app.post('/api/auth/login', async (req, res) => {
    let loginPayload;
    try {
      loginPayload = validateLoginPayload(req.body);
    } catch (error) {
      return sendValidationError(res, error);
    }

    const { username, password, remember } = loginPayload;
    const rateKey = loginRateLimiter.getKey(req, username);
    const rateState = loginRateLimiter.getState(rateKey);
    if (rateState.limited) {
      res.set('Retry-After', String(rateState.retryAfterSeconds));
      return res.status(429).json({ error: 'Too many login attempts, please try again later' });
    }

    try {
      const { mode, privateData } = await storage.readPrivateOrDefault();
      const stored = privateData?.admin?.passwordHash || '';
      const isValid = verifyPassword(password, stored);
      if (!isValid || privateData?.admin?.username !== username) {
        loginRateLimiter.recordFailure(rateKey);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      loginRateLimiter.clear(rateKey);
      const mustChangePassword = verifyPassword(DEFAULT_ADMIN_PASSWORD, stored);

      if (stored && !stored.startsWith('scrypt$')) {
        const upgraded = normalizePrivateData(privateData);
        await storage.writeDataToStorage(mode, 'private.json', withTimestamp('private.json', upgraded));
      }

      const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const exp = Date.now() + duration;
      const token = signToken({ username, exp, mustChangePassword }, authSecret);
      res.set('Set-Cookie', buildAuthCookie(token, exp));
      return res.json({ exp, mustChangePassword });
    } catch (error) {
      console.error(`[Auth Error] ${error.message}`);
      return res.status(500).json({ error: 'Auth Error' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.set('Set-Cookie', buildClearAuthCookie());
    return res.json({ ok: true });
  });

  app.get('/api/auth/verify', (req, res) => {
    const token = getAuthToken(req);
    const payload = verifyToken(token, authSecret);
    if (!payload) return res.status(401).json({ ok: false });
    return res.json({ ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword });
  });
};
