import {
  buildClearAuthCookie,
  getAuthToken,
  verifyToken
} from '../api/_shared/auth.js';
import { loginAdmin } from '../api/_shared/authService.js';

const sendAuthResult = (res, result) => {
  Object.entries(result.headers || {}).forEach(([name, value]) => res.set(name, value));
  return res.status(result.status).json(result.body);
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
    try {
      let storageMode = null;
      const result = await loginAdmin({
        request: req,
        body: req.body,
        authSecret,
        loginRateLimiter,
        readPrivateData: async () => {
          const { mode, privateData } = await storage.readPrivateOrDefault();
          storageMode = mode;
          return privateData;
        },
        writePrivateData: (privateData) => storage.writeDataToStorage(storageMode, 'private.json', privateData)
      });
      return sendAuthResult(res, result);
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
