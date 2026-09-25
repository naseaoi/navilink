import { ApiError, requestJson } from './apiClient';
export { AUTH_SESSION_EXPIRED_EVENT } from './apiClient';

export interface AuthSession {
  authenticated: boolean;
  exp?: number;
  mustChangePassword: boolean;
}

export const verifyAuthSession = async (): Promise<AuthSession> => {
  try {
    let payload: { exp?: number; mustChangePassword?: boolean };
    try {
      payload = await requestJson('/api/auth/verify', { authenticated: false });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      payload = await requestJson('/api/auth', { authenticated: false });
    }
    return { authenticated: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { authenticated: false, mustChangePassword: false };
    throw error;
  }
};

export const logoutAuthSession = async () => {
  try {
    await requestJson('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    await requestJson('/api/auth', { method: 'DELETE' });
  }
};
