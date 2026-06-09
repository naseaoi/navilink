import { lookup } from 'dns/promises';
import net from 'net';

const ICON_PROXY_MAX_BYTES = 5 * 1024 * 1024;
const ICON_PROXY_TIMEOUT_MS = 10_000;
const ICON_PROXY_MAX_REDIRECTS = 3;
const ICON_PROXY_WINDOW_MS = 60_000;
const ICON_PROXY_MAX_REQUESTS = 120;
const ICON_PROXY_FAILURE_TTL_MS = 5 * 60_000;
const rateBuckets = new Map();
const failedTargets = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const checkRateLimit = (req) => {
  const key = getClientIp(req);
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt > ICON_PROXY_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now });
    return { limited: false, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count <= ICON_PROXY_MAX_REQUESTS) return { limited: false, retryAfterSeconds: 0 };
  return { limited: true, retryAfterSeconds: Math.ceil((ICON_PROXY_WINDOW_MS - (now - bucket.startedAt)) / 1000) };
};

const hasRecentFailure = (target) => {
  const failedAt = failedTargets.get(target);
  if (!failedAt) return false;
  if (Date.now() - failedAt > ICON_PROXY_FAILURE_TTL_MS) {
    failedTargets.delete(target);
    return false;
  }
  return true;
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
};

const fetchIconWithRedirects = async (targetUrl, redirectsLeft) => {
  await assertSafeProxyUrl(targetUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ICON_PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'NaviLink-IconProxy/1.0',
        Accept: 'image/*,*/*;q=0.8'
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsLeft <= 0) throw new Error('too many redirects');
      const location = response.headers.get('location');
      if (!location) throw new Error('missing redirect location');
      return fetchIconWithRedirects(new URL(location, targetUrl), redirectsLeft - 1);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const readLimitedResponse = async (response) => {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > ICON_PROXY_MAX_BYTES) {
      throw new Error('too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export const createIconProxyHandler = () => async (req, res) => {
  const target = String(req.query.url || '').trim();
  if (!target) return res.status(400).json({ error: 'missing url' });

  const rateState = checkRateLimit(req);
  if (rateState.limited) {
    res.set('Retry-After', String(rateState.retryAfterSeconds));
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
    const upstream = await fetchIconWithRedirects(parsed, ICON_PROXY_MAX_REDIRECTS);
    if (!upstream.ok) {
      failedTargets.set(target, Date.now());
      return res.status(502).json({ error: `upstream ${upstream.status}` });
    }
    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!/^image\//i.test(contentType)) {
      failedTargets.set(target, Date.now());
      return res.status(415).json({ error: 'not an image' });
    }
    const contentLength = Number(upstream.headers.get('content-length') || 0);
    if (contentLength > ICON_PROXY_MAX_BYTES) {
      return res.status(413).json({ error: 'too large' });
    }
    const buf = await readLimitedResponse(upstream);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(buf);
  } catch (error) {
    failedTargets.set(target, Date.now());
    console.error(`[Icon Proxy] ${target} -> ${error.message}`);
    if (error.message === 'blocked host' || error.message === 'unsupported protocol') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'too large') {
      return res.status(413).json({ error: 'too large' });
    }
    return res.status(502).json({ error: 'fetch failed' });
  }
};
