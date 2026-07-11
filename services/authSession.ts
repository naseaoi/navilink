export interface AuthSession {
  authenticated: boolean;
  exp?: number;
  mustChangePassword: boolean;
}

const requestSession = async (url: string) => fetch(url, {
  method: 'GET',
  credentials: 'same-origin'
});

export const verifyAuthSession = async (): Promise<AuthSession> => {
  let response = await requestSession('/api/auth/verify');
  if (response.status === 404) response = await requestSession('/api/auth');
  if (response.status === 401) return { authenticated: false, mustChangePassword: false };
  if (!response.ok) throw new Error('Failed to verify auth session');
  const payload: { exp?: number; mustChangePassword?: boolean } = await response.json();
  return {
    authenticated: true,
    exp: payload.exp,
    mustChangePassword: !!payload.mustChangePassword
  };
};

export const logoutAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Logout endpoint unavailable');
  } catch {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
  }
};
