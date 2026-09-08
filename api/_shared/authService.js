import {
  DEFAULT_ADMIN_PASSWORD,
  buildAuthCookie,
  normalizePrivateDataAsync,
  signSessionToken,
  verifyPasswordAsync
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
  const reservation = loginRateLimiter.reserve(request, username);
  if (!reservation.release) {
    return {
      status: reservation.busy ? 503 : 429,
      headers: { 'Retry-After': String(reservation.retryAfterSeconds) },
      body: { error: 'Too many login attempts, please try again later' }
    };
  }

  try {
    let privateData = await readPrivateData();
    const stored = privateData?.admin?.passwordHash || '';
    const passwordMatches = await verifyPasswordAsync(password, stored);
    const isValid = passwordMatches && privateData?.admin?.username === username;
    if (!isValid) return { status: 401, body: { error: 'Invalid credentials' } };

    loginRateLimiter.getKeys(request, username).forEach(loginRateLimiter.clear);
    const mustChangePassword = password === DEFAULT_ADMIN_PASSWORD;
    if (stored && !stored.startsWith('scrypt$')) {
      privateData = await normalizePrivateDataAsync(privateData);
      await writePrivateData(privateData);
    }

    const duration = remember ? REMEMBER_SESSION_MS : SESSION_DAY_MS;
    const exp = Date.now() + duration;
    const token = signSessionToken({ exp, mustChangePassword }, privateData, authSecret);
    return {
      status: 200,
      headers: { 'Set-Cookie': buildAuthCookie(token, exp) },
      body: { exp, mustChangePassword }
    };
  } finally {
    reservation.release();
  }
};
