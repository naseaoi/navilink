import { getWritableAuthPayload } from '../_shared/auth.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;
  if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });

  const auth = getWritableAuthPayload(request, AUTH_SECRET);
  if (!auth.payload) {
    const status = auth.error === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 401;
    return response.status(status).json({ error: status === 403 ? 'Password change required' : 'Unauthorized', code: auth.error });
  }

  return response.status(400).json({ error: 'Sync not available on Vercel' });
}
