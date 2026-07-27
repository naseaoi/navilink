import { buildClearAuthCookie } from '../_shared/auth.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  response.setHeader('Set-Cookie', buildClearAuthCookie());
  return response.json({ ok: true });
}
