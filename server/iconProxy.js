import { lookup } from 'dns/promises';
import http from 'http';
import https from 'https';
import net from 'net';

const ICON_PROXY_MAX_BYTES = 512 * 1024;
const ICON_PROXY_TIMEOUT_MS = 10_000;
const ICON_PROXY_MAX_REDIRECTS = 3;
const ICON_PROXY_WINDOW_MS = 60_000;
const ICON_PROXY_MAX_REQUESTS = 120;
const ICON_PROXY_FAILURE_TTL_MS = 5 * 60_000;
const ICON_PROXY_CACHE_TTL_MS = 30 * 24 * 60 * 60_000;
const ICON_PROXY_MAX_CONCURRENT = 16;
const ICON_PROXY_MAX_STATE_ENTRIES = 2_000;
const ICON_PROXY_MAX_CACHE_ENTRIES = 256;
const ICON_PROXY_MAX_CACHE_BYTES = 16 * 1024 * 1024;

const getClientIp = (req) => {
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const isBlockedIpv4 = (address) => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 192 && b === 0 ||
    a === 198 && (b === 18 || b === 19) ||
    a >= 224
  );
};

const isBlockedIp = (address) => {
  if (address.startsWith('::ffff:')) return isBlockedIpv4(address.slice('::ffff:'.length));
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) {
    const lower = address.toLowerCase();
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80:')
    );
  }
  return true;
};

const assertSafeProxyUrl = async (targetUrl) => {
  if (!/^https?:$/.test(targetUrl.protocol)) {
    throw new Error('unsupported protocol');
  }
  const records = await lookup(targetUrl.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new Error('blocked host');
  }
  return records[0];
};

const createPinnedLookup = (record) => (_hostname, options, callback) => {
  if (options?.all) {
    callback(null, [{ address: record.address, family: record.family }]);
    return;
  }
  callback(null, record.address, record.family);
};

const getHeader = (headers, name) => {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const buildHostHeader = (targetUrl) => {
  if (!targetUrl.port) return targetUrl.hostname;
  return `${targetUrl.hostname}:${targetUrl.port}`;
};

const requestIcon = async (targetUrl) => {
  const resolved = await assertSafeProxyUrl(targetUrl);
  const transport = targetUrl.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.request({
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || undefined,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: 'GET',
      lookup: createPinnedLookup(resolved),
      servername: targetUrl.hostname,
      timeout: ICON_PROXY_TIMEOUT_MS,
      headers: {
        Host: buildHostHeader(targetUrl),
        'User-Agent': 'NaviLink-IconProxy/1.0',
        Accept: 'image/*,*/*;q=0.8'
      }
    }, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        resolve({ status, ok: false, headers: response.headers, body: Buffer.alloc(0) });
        return;
      }
      const contentLength = Number(response.headers['content-length'] || 0);
      if (contentLength > ICON_PROXY_MAX_BYTES) {
        response.resume();
        reject(new Error('too large'));
        return;
      }

      const chunks = [];
      let total = 0;
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > ICON_PROXY_MAX_BYTES) {
          response.destroy(new Error('too large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          status,
          ok: status >= 200 && status < 300,
          headers: response.headers,
          body: Buffer.concat(chunks)
        });
      });
      response.on('error', reject);
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
};

const fetchIconWithRedirects = async (targetUrl, redirectsLeft) => {
  const response = await requestIcon(targetUrl);
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectsLeft <= 0) throw new Error('too many redirects');
    const location = getHeader(response.headers, 'location');
    if (!location) throw new Error('missing redirect location');
    return fetchIconWithRedirects(new URL(location, targetUrl), redirectsLeft - 1);
  }
  return response;
};

const removeOldestEntry = (map) => {
  const oldestKey = map.keys().next().value;
  if (oldestKey !== undefined) map.delete(oldestKey);
};

export const createIconProxyHandler = ({
  fetchIcon = fetchIconWithRedirects,
  maxConcurrent = ICON_PROXY_MAX_CONCURRENT,
  maxCacheBytes = ICON_PROXY_MAX_CACHE_BYTES,
  now = Date.now
} = {}) => {
  const rateBuckets = new Map();
  const failedTargets = new Map();
  const responseCache = new Map();
  const inFlight = new Map();
  let cacheBytes = 0;
  let activeRequests = 0;
  let nextStateSweepAt = 0;

  const sweepState = (currentTime) => {
    if (currentTime < nextStateSweepAt) return;
    nextStateSweepAt = currentTime + ICON_PROXY_WINDOW_MS;
    for (const [key, bucket] of rateBuckets) {
      if (currentTime - bucket.startedAt > ICON_PROXY_WINDOW_MS) rateBuckets.delete(key);
    }
    for (const [target, failedAt] of failedTargets) {
      if (currentTime - failedAt > ICON_PROXY_FAILURE_TTL_MS) failedTargets.delete(target);
    }
    for (const [target, cached] of responseCache) {
      if (cached.expiresAt <= currentTime) {
        responseCache.delete(target);
        cacheBytes -= cached.body.length;
      }
    }
  };

  const checkRateLimit = (req) => {
    const currentTime = now();
    sweepState(currentTime);
    const key = getClientIp(req);
    const bucket = rateBuckets.get(key);
    if (!bucket || currentTime - bucket.startedAt > ICON_PROXY_WINDOW_MS) {
      if (!rateBuckets.has(key) && rateBuckets.size >= ICON_PROXY_MAX_STATE_ENTRIES) removeOldestEntry(rateBuckets);
      rateBuckets.set(key, { count: 1, startedAt: currentTime });
      return { limited: false, retryAfterSeconds: 0 };
    }
    bucket.count += 1;
    if (bucket.count <= ICON_PROXY_MAX_REQUESTS) return { limited: false, retryAfterSeconds: 0 };
    return { limited: true, retryAfterSeconds: Math.ceil((ICON_PROXY_WINDOW_MS - (currentTime - bucket.startedAt)) / 1000) };
  };

  const hasRecentFailure = (target) => {
    const failedAt = failedTargets.get(target);
    return failedAt !== undefined && now() - failedAt <= ICON_PROXY_FAILURE_TTL_MS;
  };

  const recordFailure = (target) => {
    if (!failedTargets.has(target) && failedTargets.size >= ICON_PROXY_MAX_STATE_ENTRIES) removeOldestEntry(failedTargets);
    failedTargets.delete(target);
    failedTargets.set(target, now());
  };

  const readCachedResponse = (target) => {
    const cached = responseCache.get(target);
    if (!cached) return null;
    if (cached.expiresAt <= now()) {
      responseCache.delete(target);
      cacheBytes -= cached.body.length;
      return null;
    }
    responseCache.delete(target);
    responseCache.set(target, cached);
    return cached;
  };

  const writeCachedResponse = (target, value) => {
    if (value.body.length > maxCacheBytes) return;
    const existing = responseCache.get(target);
    if (existing) cacheBytes -= existing.body.length;
    responseCache.delete(target);
    while (responseCache.size >= ICON_PROXY_MAX_CACHE_ENTRIES || cacheBytes + value.body.length > maxCacheBytes) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = responseCache.get(oldestKey);
      responseCache.delete(oldestKey);
      cacheBytes -= oldest.body.length;
    }
    responseCache.set(target, value);
    cacheBytes += value.body.length;
  };

  const loadResponse = (target, parsed) => {
    const pending = inFlight.get(target);
    if (pending) return pending;
    if (activeRequests >= maxConcurrent) {
      const error = new Error('busy');
      error.statusCode = 503;
      throw error;
    }
    activeRequests += 1;
    const request = fetchIcon(parsed, ICON_PROXY_MAX_REDIRECTS)
      .then((upstream) => {
        if (!upstream.ok) {
          const error = new Error(`upstream ${upstream.status}`);
          error.statusCode = 502;
          throw error;
        }
        const contentType = getHeader(upstream.headers, 'content-type') || 'image/png';
        if (!/^image\//i.test(contentType)) {
          const error = new Error('not an image');
          error.statusCode = 415;
          throw error;
        }
        if (!Buffer.isBuffer(upstream.body) || upstream.body.length > ICON_PROXY_MAX_BYTES) {
          throw new Error('too large');
        }
        const value = { body: upstream.body, contentType, expiresAt: now() + ICON_PROXY_CACHE_TTL_MS };
        writeCachedResponse(target, value);
        failedTargets.delete(target);
        return value;
      })
      .finally(() => {
        activeRequests -= 1;
        inFlight.delete(target);
      });
    inFlight.set(target, request);
    return request;
  };

  const sendResponse = (res, cached) => {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Content-Length', String(cached.body.length));
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(cached.body);
  };

  return async (req, res) => {
    const target = String(req.query.url || '').trim();
    if (!target) return res.status(400).json({ error: 'missing url' });
    if (target.length > 2_048) return res.status(400).json({ error: 'url too long' });

    const rateState = checkRateLimit(req);
    if (rateState.limited) {
      res.setHeader('Retry-After', String(rateState.retryAfterSeconds));
      return res.status(429).json({ error: 'too many requests' });
    }

    if (hasRecentFailure(target)) {
      return res.status(502).json({ error: 'recent fetch failed' });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return res.status(400).json({ error: 'invalid url' });
    }

    try {
      const cached = readCachedResponse(target);
      return sendResponse(res, cached || await loadResponse(target, parsed));
    } catch (error) {
      if (error.statusCode === 503) {
        res.setHeader('Retry-After', '1');
        return res.status(503).json({ error: 'proxy busy' });
      }
      recordFailure(target);
      if (error.message === 'blocked host' || error.message === 'unsupported protocol') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'too large') {
        return res.status(413).json({ error: 'too large' });
      }
      if (error.statusCode === 415) return res.status(415).json({ error: 'not an image' });
      console.error(`[Icon Proxy] ${target} -> ${error.message}`);
      return res.status(502).json({ error: 'fetch failed' });
    }
  };
};
