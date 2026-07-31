import { DEFAULT_ADMIN_PASSWORD, buildAuthCookie, hashPasswordAsync, signToken } from './auth.js';
import { withTimestamp } from './data.js';
import { validatePasswordChangePayload } from './validation.js';

export const changeAdminPassword = async ({ body, authPayload, authSecret, writePrivateData }) => {
  let input;
  try {
    input = validatePasswordChangePayload(body);
  } catch (error) {
    return { status: 400, body: { error: error.message } };
  }
  if (input.password.length < 8) {
    return { status: 400, body: { error: 'password must be at least 8 characters' } };
  }
  if (input.password === DEFAULT_ADMIN_PASSWORD) {
    return { status: 400, body: { error: 'password must not be the default password' } };
  }

  const privateData = withTimestamp('private.json', {
    admin: {
      username: input.username,
      passwordHash: await hashPasswordAsync(input.password)
    }
  });
  await writePrivateData(privateData);
  const exp = authPayload.exp;
  const token = signToken({ username: input.username, exp, mustChangePassword: false }, authSecret);
  return {
    status: 200,
    headers: { 'Set-Cookie': buildAuthCookie(token, exp) },
    body: { privateData, exp, mustChangePassword: false }
  };
};
