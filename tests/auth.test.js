import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import verifyHandler from '../api/auth/verify.js';
import logoutHandler from '../api/auth/logout.js';
import {
  buildAuthCookie,
  buildClearAuthCookie,
  getWritableAuthPayload,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken
} from '../api/_shared/auth.js';
import { loginAdmin } from '../api/_shared/authService.js';
import { createLoginRateLimiter } from '../api/_shared/rateLimit.js';
import { changeAdminPassword } from '../api/_shared/passwordService.js';
import { registerAuthRoutes } from '../server/authRoutes.js';

const createRequest = () => ({ headers: {}, ip: '127.0.0.1' });

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  },
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

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

  it('uses configurable cookie attributes', () => {
    const previous = {
      COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
      COOKIE_SECURE: process.env.COOKIE_SECURE
    };
    process.env.COOKIE_SAMESITE = 'None';
    process.env.COOKIE_DOMAIN = '.example.com';
    process.env.COOKIE_SECURE = 'false';
    try {
      const cookie = buildAuthCookie('token', Date.now() + 1000);
      const clearCookie = buildClearAuthCookie();
      assert.match(cookie, /SameSite=None/);
      assert.match(cookie, /Domain=.example.com/);
      assert.match(cookie, /Secure/);
      assert.match(clearCookie, /Max-Age=0/);
    } finally {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
    }
  });

  it('rejects storage writes until the default password is changed', () => {
    const token = signToken({ username: 'admin', exp: Date.now() + 1000, mustChangePassword: true }, 'secret');
    const request = { headers: { authorization: `Bearer ${token}` } };
    assert.equal(getWritableAuthPayload(request, 'secret').error, 'PASSWORD_CHANGE_REQUIRED');
  });

  it('supports dedicated Vercel verify and logout endpoints', async () => {
    const previousSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'endpoint-secret';
    try {
      const token = signToken({ username: 'admin', exp: Date.now() + 60_000 }, 'endpoint-secret');
      const routes = {};
      const app = {
        get: (path, handler) => { routes[`GET ${path}`] = handler; },
        post: (path, handler) => { routes[`POST ${path}`] = handler; }
      };
      registerAuthRoutes({ app, authSecret: 'endpoint-secret', loginRateLimiter: {}, storage: {} });

      const verifyResponse = createResponse();
      const verifyRequest = { method: 'GET', headers: { cookie: `navilink_session=${token}` } };
      await verifyHandler(verifyRequest, verifyResponse);
      assert.equal(verifyResponse.statusCode, 200);
      assert.equal(verifyResponse.body.ok, true);
      const expressVerifyResponse = createResponse();
      await routes['GET /api/auth/verify'](verifyRequest, expressVerifyResponse);
      assert.deepEqual(expressVerifyResponse.body, verifyResponse.body);
      assert.equal(expressVerifyResponse.statusCode, verifyResponse.statusCode);

      const logoutResponse = createResponse();
      await logoutHandler({ method: 'POST', headers: {} }, logoutResponse);
      assert.equal(logoutResponse.statusCode, 200);
      assert.match(logoutResponse.headers['Set-Cookie'], /Max-Age=0/);
      const expressLogoutResponse = createResponse();
      await routes['POST /api/auth/logout']({}, expressLogoutResponse);
      assert.deepEqual(expressLogoutResponse.body, logoutResponse.body);
      assert.equal(expressLogoutResponse.headers['Set-Cookie'], logoutResponse.headers['Set-Cookie']);
    } finally {
      if (previousSecret === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = previousSecret;
    }
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

  it('limits repeated failures across different usernames from one IP', async () => {
    const loginRateLimiter = createFixedRateLimiter({ maxAttempts: 2 });
    const attempt = (username) => loginAdmin({
      request: createRequest(),
      body: { username, password: 'wrong-password' },
      authSecret: 'secret',
      loginRateLimiter,
      readPrivateData: async () => ({ admin: { username: 'admin', passwordHash: hashPassword('admin123') } }),
      writePrivateData: async () => {}
    });

    assert.equal((await attempt('first')).status, 401);
    assert.equal((await attempt('second')).status, 401);
    assert.equal((await attempt('third')).status, 429);
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

  it('changes the default password and issues an unrestricted session', async () => {
    let saved = null;
    const result = await changeAdminPassword({
      body: { username: 'owner', password: 'new-password-123' },
      authPayload: { username: 'admin', exp: Date.now() + 60_000, mustChangePassword: true },
      authSecret: 'secret',
      writePrivateData: async (privateData) => { saved = privateData; }
    });

    assert.equal(result.status, 200);
    assert.equal(saved.admin.username, 'owner');
    assert.equal(verifyPassword('new-password-123', saved.admin.passwordHash), true);
    const token = decodeURIComponent(result.headers['Set-Cookie'].match(/navilink_session=([^;]+)/)[1]);
    assert.equal(verifyToken(token, 'secret').mustChangePassword, false);
  });

  it('does not accept the published default password as a replacement', async () => {
    const result = await changeAdminPassword({
      body: { username: 'admin', password: 'admin123' },
      authPayload: { username: 'admin', exp: Date.now() + 60_000, mustChangePassword: true },
      authSecret: 'secret',
      writePrivateData: async () => { throw new Error('unexpected write'); }
    });
    assert.equal(result.status, 400);
  });
});
