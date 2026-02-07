import crypto from 'crypto';

const verifyToken = (token, secret) => {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  const valid = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
};

export default async function handler(request, response) {
  const { AUTH_SECRET, WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  const payload = verifyToken(token, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  if (request.method === 'GET') {
    return response.json({ mode: 'webdav', available: { local: false, webdav: true } });
  }

  if (request.method === 'PUT') {
    const { mode } = request.body || {};
    if (mode && mode !== 'webdav') return response.status(400).json({ error: 'Local storage not available on Vercel' });
    return response.json({ mode: 'webdav', available: { local: false, webdav: true } });
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
