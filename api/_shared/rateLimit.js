const defaultGetClientIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return request.ip || request.socket?.remoteAddress || 'unknown';
};

export const createLoginRateLimiter = ({
  windowMs = Number(process.env.LOGIN_WINDOW_MS || 60_000),
  maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  getClientIp = defaultGetClientIp
} = {}) => {
  const attempts = new Map();

  const getKey = (request, username) => `${getClientIp(request)}:${(username || '').toLowerCase()}`;

  const getState = (key) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry) return { limited: false, retryAfterSeconds: 0 };
    if (now - entry.firstFailedAt > windowMs) {
      attempts.delete(key);
      return { limited: false, retryAfterSeconds: 0 };
    }
    if (entry.count < maxAttempts) return { limited: false, retryAfterSeconds: 0 };
    const retryAfterMs = Math.max(0, windowMs - (now - entry.firstFailedAt));
    return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  };

  const recordFailure = (key) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now - entry.firstFailedAt > windowMs) {
      attempts.set(key, { count: 1, firstFailedAt: now });
      return;
    }
    entry.count += 1;
    attempts.set(key, entry);
  };

  const clear = (key) => {
    attempts.delete(key);
  };

  return { getKey, getState, recordFailure, clear };
};
