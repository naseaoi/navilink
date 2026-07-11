const defaultGetClientIp = (request) => request.ip || request.socket?.remoteAddress || 'unknown';

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const createLoginRateLimiter = ({
  windowMs = process.env.LOGIN_WINDOW_MS,
  maxAttempts = process.env.LOGIN_MAX_ATTEMPTS,
  getClientIp = defaultGetClientIp
} = {}) => {
  const effectiveWindowMs = asPositiveInteger(windowMs, 60_000);
  const effectiveMaxAttempts = asPositiveInteger(maxAttempts, 5);
  const attempts = new Map();

  const getKeys = (request, username) => {
    const ip = getClientIp(request);
    return [`ip:${ip}`, `account:${ip}:${(username || '').toLowerCase()}`];
  };

  const getState = (key) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry) return { limited: false, retryAfterSeconds: 0 };
    if (now - entry.firstFailedAt > effectiveWindowMs) {
      attempts.delete(key);
      return { limited: false, retryAfterSeconds: 0 };
    }
    if (entry.count < effectiveMaxAttempts) return { limited: false, retryAfterSeconds: 0 };
    const retryAfterMs = Math.max(0, effectiveWindowMs - (now - entry.firstFailedAt));
    return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  };

  const recordFailure = (key) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now - entry.firstFailedAt > effectiveWindowMs) {
      attempts.set(key, { count: 1, firstFailedAt: now });
      return;
    }
    entry.count += 1;
    attempts.set(key, entry);
  };

  const clear = (key) => attempts.delete(key);

  const cleanup = () => {
    const now = Date.now();
    attempts.forEach((entry, key) => {
      if (now - entry.firstFailedAt > effectiveWindowMs) attempts.delete(key);
    });
  };

  return { getKeys, getState, recordFailure, clear, cleanup };
};
