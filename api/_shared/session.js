import { buildAuthCookie, getAuthToken, getCredentialVersion, signSessionToken, verifyToken } from './auth.js';
import { fetchWebDavJson } from './webdav.js';

export const getAuthPayload = async (request, secret, readPrivateData = () => fetchWebDavJson('private.json')) => {
  const payload = verifyToken(getAuthToken(request), secret);
  if (!payload || typeof payload.credentialVersion !== 'string') return null;
  try {
    const current = await readPrivateData();
    if (payload.username !== current?.admin?.username) return null;
    return payload.credentialVersion === getCredentialVersion(current, secret) ? payload : null;
  } catch {
    return null;
  }
};

export const getWritableAuthPayload = async (request, secret, readPrivateData) => {
  const payload = await getAuthPayload(request, secret, readPrivateData);
  if (!payload) return { payload: null, error: 'UNAUTHORIZED' };
  if (payload.mustChangePassword) return { payload: null, error: 'PASSWORD_CHANGE_REQUIRED' };
  return { payload, error: null };
};

export const refreshSessionCookie = (response, payload, privateData, secret) => {
  if (payload.credentialVersion === getCredentialVersion(privateData, secret)) return;
  const token = signSessionToken({ exp: payload.exp, mustChangePassword: false }, privateData, secret);
  response.setHeader('Set-Cookie', buildAuthCookie(token, payload.exp));
};
