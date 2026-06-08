import { getAuthPayload } from '../_shared/auth.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });

  const payload = getAuthPayload(request, AUTH_SECRET);
  if (!payload) return response.status(401).json({ error: 'Unauthorized' });

  return response.status(400).json({ error: 'Sync not available on Vercel' });
}
