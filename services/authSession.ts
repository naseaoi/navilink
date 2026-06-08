export const AUTH_KEY = 'navilink_auth';
export const AUTH_TOKEN_KEY = 'navilink_token';
export const AUTH_EXP_KEY = 'navilink_auth_exp';
export const AUTH_FORCE_CHANGE_KEY = 'navilink_force_change_password';

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXP_KEY);
  localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
};

export const hasValidAuthSession = () => {
  const expiry = localStorage.getItem(AUTH_EXP_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!expiry || !token) return false;
  if (Date.now() > parseInt(expiry, 10)) {
    clearAuthSession();
    return false;
  }
  return true;
};

export const hasPasswordPolicyFlag = () => localStorage.getItem(AUTH_FORCE_CHANGE_KEY) === '1';

export const saveAuthSession = (token: string, exp: number, mustChangePassword: boolean) => {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_EXP_KEY, String(exp));
  if (mustChangePassword) localStorage.setItem(AUTH_FORCE_CHANGE_KEY, '1');
  else localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
};

export const clearPasswordPolicyFlag = () => {
  localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
};
