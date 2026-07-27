import { verifyAuthRequest } from '../_shared/authEndpoints.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  const result = verifyAuthRequest(request, process.env.AUTH_SECRET);
  return response.status(result.status).json(result.body);
}
