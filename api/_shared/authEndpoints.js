import { buildClearAuthCookie, getAuthPayload } from './auth.js';

export const verifyAuthRequest = (request, authSecret) => {
  if (!authSecret) return { status: 500, body: { error: 'AUTH_SECRET is missing.' } };
  const payload = getAuthPayload(request, authSecret);
  if (!payload) return { status: 401, body: { ok: false } };
  return {
    status: 200,
    body: { ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword }
  };
};

export const logoutAuthRequest = () => ({
  status: 200,
  headers: { 'Set-Cookie': buildClearAuthCookie() },
  body: { ok: true }
});
