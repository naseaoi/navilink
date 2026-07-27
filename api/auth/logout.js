import { logoutAuthRequest } from '../_shared/authEndpoints.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  const result = logoutAuthRequest();
  Object.entries(result.headers).forEach(([name, value]) => response.setHeader(name, value));
  return response.status(result.status).json(result.body);
}
