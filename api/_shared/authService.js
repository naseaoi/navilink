import {
  DEFAULT_ADMIN_PASSWORD,
  buildAuthCookie,
  normalizePrivateData,
  signToken,
  verifyPassword
} from './auth.js';
import { validateLoginPayload } from './validation.js';

const SESSION_DAY_MS = 24 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * SESSION_DAY_MS;

export const loginAdmin = async ({
  request,
  body,
  authSecret,
  loginRateLimiter,
  readPrivateData,
  writePrivateData
}) => {
  let loginPayload;
  try {
    loginPayload = validateLoginPayload(body);
  } catch (error) {
    return { status: 400, body: { error: error.message } };
  }

  const { username, password, remember } = loginPayload;
  const rateKey = loginRateLimiter.getKey(request, username);
  const rateState = loginRateLimiter.getState(rateKey);
  if (rateState.limited) {
    return {
      status: 429,
      headers: { 'Retry-After': String(rateState.retryAfterSeconds) },
      body: { error: 'Too many login attempts, please try again later' }
    };
  }

  const privateData = await readPrivateData();
  const stored = privateData?.admin?.passwordHash || '';
  const isValid = verifyPassword(password, stored) && privateData?.admin?.username === username;
  if (!isValid) {
    loginRateLimiter.recordFailure(rateKey);
    return { status: 401, body: { error: 'Invalid credentials' } };
  }

  loginRateLimiter.clear(rateKey);
  const mustChangePassword = verifyPassword(DEFAULT_ADMIN_PASSWORD, stored);

  if (stored && !stored.startsWith('scrypt$')) {
    await writePrivateData(normalizePrivateData(privateData));
  }

  const duration = remember ? REMEMBER_SESSION_MS : SESSION_DAY_MS;
  const exp = Date.now() + duration;
  const token = signToken({ username, exp, mustChangePassword }, authSecret);
  return {
    status: 200,
    headers: { 'Set-Cookie': buildAuthCookie(token, exp) },
    body: { exp, mustChangePassword }
  };
};
