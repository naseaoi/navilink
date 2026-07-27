import { getAuthPayload } from '../_shared/auth.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  const { AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ ok: false });
  return response.json({ ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword });
}
