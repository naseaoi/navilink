import { lookup } from 'dns/promises';
import net from 'net';

const ICON_PROXY_MAX_BYTES = 5 * 1024 * 1024;
const ICON_PROXY_TIMEOUT_MS = 10_000;
const ICON_PROXY_MAX_REDIRECTS = 3;

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

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    const upstream = await fetchIconWithRedirects(parsed, ICON_PROXY_MAX_REDIRECTS);
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream ${upstream.status}` });
    }
    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!/^image\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
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
