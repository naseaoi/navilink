import legacyAuthHandler from '../auth.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  return legacyAuthHandler(request, response);
}
