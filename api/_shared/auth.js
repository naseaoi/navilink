import crypto from 'crypto';

export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const AUTH_COOKIE_NAME = 'navilink_session';

const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');
const base64UrlDecode = (input) => Buffer.from(input, 'base64url').toString();

export const signToken = (payload, secret) => {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
};

export const verifyToken = (token, secret) => {
  try {
    if (!token || !secret) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    const valid = crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) return null;
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload || typeof payload !== 'object') return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

export const verifyPassword = (password, stored) => {
  if (!stored) return false;
  if (!stored.startsWith('scrypt$')) return password === stored;
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  if (hash.length !== derived.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
};

export const normalizePrivateData = (data) => {
  if (!data?.admin?.passwordHash) return data;
  if (!data.admin.passwordHash.startsWith('scrypt$')) {
    return { ...data, admin: { ...data.admin, passwordHash: hashPassword(data.admin.passwordHash) } };
  }
  return data;
};

export const createDefaultPrivateData = () => ({
  admin: {
    username: 'admin',
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD)
  }
});

export const getAuthToken = (request) => {
  const header = request.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length);
  const cookieHeader = request.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];
  return null;
};

export const getAuthPayload = (request, secret) => verifyToken(getAuthToken(request), secret);

export const getWritableAuthPayload = (request, secret) => {
  const payload = getAuthPayload(request, secret);
  if (!payload) return { payload: null, error: 'UNAUTHORIZED' };
  if (payload.mustChangePassword) return { payload: null, error: 'PASSWORD_CHANGE_REQUIRED' };
  return { payload, error: null };
};

const getCookieOptions = (env = process.env) => {
  const sameSiteInput = String(env.COOKIE_SAMESITE || 'Lax').trim().toLowerCase();
  const sameSiteMap = { lax: 'Lax', strict: 'Strict', none: 'None' };
  const sameSite = sameSiteMap[sameSiteInput] || 'Lax';
  const configuredSecure = env.COOKIE_SECURE
    ? ['1', 'true', 'yes'].includes(String(env.COOKIE_SECURE).trim().toLowerCase())
    : env.NODE_ENV === 'production' || !!env.VERCEL;
  const secure = configuredSecure || sameSite === 'None';
  const domain = String(env.COOKIE_DOMAIN || '').trim();
  return {
    sameSite,
    secure,
    domain
  };
};

const buildCookieAttributes = (maxAge, env = process.env) => {
  const options = getCookieOptions(env);
  return [
    'Path=/',
    'HttpOnly',
    `SameSite=${options.sameSite}`,
    `Max-Age=${maxAge}`,
    options.domain ? `Domain=${options.domain}` : '',
    options.secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');
};

export const buildAuthCookie = (token, exp) => {
  const maxAge = Math.max(0, Math.floor((exp - Date.now()) / 1000));
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; ${buildCookieAttributes(maxAge)}`;
};

export const buildClearAuthCookie = () => `${AUTH_COOKIE_NAME}=; ${buildCookieAttributes(0)}`;
