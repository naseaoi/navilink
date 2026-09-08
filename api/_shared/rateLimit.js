const defaultGetClientIp = (request) => request.ip || request.socket?.remoteAddress || 'unknown';

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const createLoginRateLimiter = ({
  windowMs = process.env.LOGIN_WINDOW_MS,
  maxAttempts = process.env.LOGIN_MAX_ATTEMPTS,
  maxConcurrent = process.env.LOGIN_MAX_CONCURRENT,
  getClientIp = defaultGetClientIp
} = {}) => {
  const effectiveWindowMs = asPositiveInteger(windowMs, 60_000);
  const effectiveMaxAttempts = asPositiveInteger(maxAttempts, 5);
  const attempts = new Map();
  const effectiveMaxConcurrent = Math.min(asPositiveInteger(maxConcurrent, 4), 32);
  let activeRequests = 0;

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
      if (!attempts.has(key) && attempts.size >= 2000) attempts.delete(attempts.keys().next().value);
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

  const reserve = (request, username) => {
    cleanup();
    const keys = getKeys(request, username);
    const limited = keys.map(getState).find((state) => state.limited);
    if (limited) return limited;
    if (activeRequests >= effectiveMaxConcurrent) return { busy: true, retryAfterSeconds: 1 };
    keys.forEach(recordFailure);
    activeRequests += 1;
    let released = false;
    return {
      release() {
        if (released) return;
        released = true;
        activeRequests -= 1;
      }
    };
  };

  return { getKeys, getState, recordFailure, clear, cleanup, reserve };
};
