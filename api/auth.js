import crypto from 'crypto';

const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');
const base64UrlDecode = (input) => Buffer.from(input, 'base64url').toString();

const signToken = (payload, secret) => {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
};

const verifyToken = (token, secret) => {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  const valid = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!valid) return null;
  const payload = JSON.parse(base64UrlDecode(body));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const DEFAULT_ADMIN_PASSWORD = 'admin123';
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 60_000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const loginAttempts = new Map();

const verifyPassword = (password, stored) => {
  if (!stored) return false;
  if (!stored.startsWith('scrypt$')) return password === stored;
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
};

const normalizePrivateData = (data) => {
  if (!data?.admin?.passwordHash) return data;
  if (!data.admin.passwordHash.startsWith('scrypt$')) {
    return { ...data, admin: { ...data.admin, passwordHash: hashPassword(data.admin.passwordHash) } };
  }
  return data;
};

const withTimestamp = (data) => {
  if (!data) return data;
  return { ...data, _meta: { ...(data._meta || {}), updatedAt: Date.now() } };
};

const getClientIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return request.socket?.remoteAddress || 'unknown';
};

const getLoginRateKey = (request, username) => `${getClientIp(request)}:${(username || '').toLowerCase()}`;

const getRateLimitState = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return { limited: false, retryAfterSeconds: 0 };
  if (now - entry.firstFailedAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { limited: false, retryAfterSeconds: 0 };
  }
  if (entry.count < LOGIN_MAX_ATTEMPTS) return { limited: false, retryAfterSeconds: 0 };
  const retryAfterMs = Math.max(0, LOGIN_WINDOW_MS - (now - entry.firstFailedAt));
  return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
};

const recordLoginFailure = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstFailedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstFailedAt: now });
    return;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
};

const clearLoginFailures = (key) => {
  loginAttempts.delete(key);
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

const putWebDavJson = async (fileName, data, env) => {
  const baseUrl = env.WEBDAV_URL.replace(/\/+$/, '');
  const davPath = (env.WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, '');
  const targetUrl = `${baseUrl}/${davPath}/${fileName}`;
  const dirUrl = `${baseUrl}/${davPath}/`;
  const authHeader = 'Basic ' + Buffer.from(`${env.WEBDAV_USERNAME}:${env.WEBDAV_PASSWORD}`).toString('base64');
  const fetchOptions = {
    method: 'PUT',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
  let response = await fetch(targetUrl, fetchOptions);
  if (response.status === 409) {
    await fetch(dirUrl, { method: 'MKCOL', headers: { Authorization: authHeader } });
    response = await fetch(targetUrl, fetchOptions);
  }
  if (!response.ok) throw new Error(`WebDAV write failed: ${response.status}`);
};

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  if (request.method === 'GET') {
    const header = request.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    const payload = verifyToken(token, AUTH_SECRET);
    if (!payload) return response.status(401).json({ ok: false });
    return response.json({ ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, remember } = request.body || {};
  if (!username || !password) return response.status(400).json({ error: 'Missing credentials' });
  const rateKey = getLoginRateKey(request, username);
  const rateState = getRateLimitState(rateKey);
  if (rateState.limited) {
    response.setHeader('Retry-After', String(rateState.retryAfterSeconds));
    return response.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  try {
    const env = { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH };
    let privateData = await fetchWebDavJson('private.json', env);
    if (!privateData) {
      privateData = { admin: { username: 'admin', passwordHash: hashPassword('admin123') } };
      await putWebDavJson('private.json', withTimestamp(privateData), env);
    }

    const stored = privateData?.admin?.passwordHash || '';
    const isValid = verifyPassword(password, stored) && privateData?.admin?.username === username;
    if (!isValid) {
      recordLoginFailure(rateKey);
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    clearLoginFailures(rateKey);

    if (stored && !stored.startsWith('scrypt$')) {
      const upgraded = normalizePrivateData(privateData);
      await putWebDavJson('private.json', withTimestamp(upgraded), env);
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
