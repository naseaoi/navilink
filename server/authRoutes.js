import { getAuthToken, verifyToken } from '../api/_shared/auth.js';
import { logoutAuthRequest, verifyAuthRequest } from '../api/_shared/authEndpoints.js';
import { loginAdmin } from '../api/_shared/authService.js';
import { changeAdminPassword } from '../api/_shared/passwordService.js';

const sendAuthResult = (res, result) => {
  Object.entries(result.headers || {}).forEach(([name, value]) => res.set(name, value));
  return res.status(result.status).json(result.body);
};

export const createRequireAuth = (authSecret) => (req, res, options = {}) => {
  const token = getAuthToken(req);
  const payload = verifyToken(token, authSecret);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (payload.mustChangePassword && !options.allowPasswordChangeRequired) {
    res.status(403).json({ error: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' });
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
    return sendAuthResult(res, logoutAuthRequest());
  });

  app.post('/api/auth/password', async (req, res) => {
    const token = getAuthToken(req);
    const payload = verifyToken(token, authSecret);
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const mode = await storage.getStorageMode();
      const result = await changeAdminPassword({
        body: req.body,
        authPayload: payload,
        authSecret,
        writePrivateData: (privateData) => storage.writeDataToStorage(mode, 'private.json', privateData)
      });
      return sendAuthResult(res, result);
    } catch (error) {
      console.error(`[Password Error] ${error.message}`);
      return res.status(500).json({ error: 'Password Error' });
    }
  });

  app.get('/api/auth/verify', (req, res) => {
    return sendAuthResult(res, verifyAuthRequest(req, authSecret));
  });
};
