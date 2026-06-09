import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../api/_shared/auth.js';
import { loginAdmin } from '../api/_shared/authService.js';
import { createLoginRateLimiter } from '../api/_shared/rateLimit.js';

const createRequest = () => ({ headers: {}, ip: '127.0.0.1' });

const createFixedRateLimiter = (options = {}) => createLoginRateLimiter({
  windowMs: 60_000,
  maxAttempts: 5,
  getClientIp: () => 'test-ip',
  ...options
});

describe('auth helpers', () => {
  it('rejects malformed tokens', () => {
    assert.equal(verifyToken('bad.token.value', 'secret'), null);
    assert.equal(verifyToken('not-json.sig', 'secret'), null);
  });

  it('signs and verifies tokens', () => {
    const token = signToken({ username: 'admin', exp: Date.now() + 1000 }, 'secret');
    assert.equal(verifyToken(token, 'secret')?.username, 'admin');
  });

  it('rejects broken scrypt hashes', () => {
    assert.equal(verifyPassword('admin123', 'scrypt$salt$hash'), false);
  });
});

describe('auth service', () => {
  it('logs in and returns an auth cookie', async () => {
    const result = await loginAdmin({
      request: createRequest(),
      body: { username: 'admin', password: 'admin123', remember: true },
      authSecret: 'secret',
      loginRateLimiter: createFixedRateLimiter(),
      readPrivateData: async () => ({
        admin: { username: 'admin', passwordHash: hashPassword('admin123') }
      }),
      writePrivateData: async () => {
        throw new Error('unexpected write');
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.mustChangePassword, true);
    assert.match(result.headers['Set-Cookie'], /navilink_session=/);
  });

  it('records failures and reports rate limits', async () => {
    const loginRateLimiter = createFixedRateLimiter({ maxAttempts: 1 });
    const options = {
      request: createRequest(),
      body: { username: 'admin', password: 'wrong-password' },
      authSecret: 'secret',
      loginRateLimiter,
      readPrivateData: async () => ({
        admin: { username: 'admin', passwordHash: hashPassword('admin123') }
      }),
      writePrivateData: async () => {
        throw new Error('unexpected write');
      }
    };

    const failed = await loginAdmin(options);
    const limited = await loginAdmin(options);

    assert.equal(failed.status, 401);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers['Retry-After'], '60');
  });

  it('upgrades plain text password storage after login', async () => {
    let savedPrivateData = null;
    const result = await loginAdmin({
      request: createRequest(),
      body: { username: 'admin', password: 'admin123' },
      authSecret: 'secret',
      loginRateLimiter: createFixedRateLimiter(),
      readPrivateData: async () => ({
        admin: { username: 'admin', passwordHash: 'admin123' }
      }),
      writePrivateData: async (privateData) => {
        savedPrivateData = privateData;
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.mustChangePassword, true);
    assert.match(savedPrivateData.admin.passwordHash, /^scrypt\$/);
  });
});
