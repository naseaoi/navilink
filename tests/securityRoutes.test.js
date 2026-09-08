import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { it } from 'node:test';
import express from 'express';
import { createDefaultPrivateData, getAuthToken, signToken } from '../api/_shared/auth.js';
import { createDefaultPublicData } from '../api/_shared/defaultData.js';
import { createLoginRateLimiter } from '../api/_shared/rateLimit.js';
import { createRequireAuth, registerAuthRoutes } from '../server/authRoutes.js';
import { createAsyncRoutes, sendServerError } from '../server/asyncRoutes.js';
import { createStorageService } from '../server/localStorage.js';
import { registerStorageRoutes } from '../server/storageRoutes.js';

const startServer = async (context) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-security-'));
  const authSecret = randomBytes(32).toString('hex');
  const storage = createStorageService({
    dataDir, storageConfigPath: path.join(dataDir, 'storage.json'), useWebDav: false,
    defaultPublicData: createDefaultPublicData(), defaultPrivateData: createDefaultPrivateData()
  });
  const app = express();
  app.use(express.json());
  registerAuthRoutes({ app, authSecret, storage, loginRateLimiter: createLoginRateLimiter() });
  registerStorageRoutes({ app, authSecret, storage, requireAuth: createRequireAuth(authSecret, storage), useWebDav: false });
  createAsyncRoutes(app).get('/api/test-error', async () => { throw new Error('test failure'); });
  app.get('/healthz', (_request, response) => response.json({ ok: true }));
  app.use(sendServerError);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const send = async (method, pathname, { cookie, body } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${pathname}`, {
      method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], body: await response.json() };
  };
  return { send, authSecret };
};

it('ignores unrelated malformed cookies and rejects malformed sessions without crashing', async (context) => {
  assert.equal(getAuthToken({ headers: { cookie: 'unrelated=%; navilink_session=valid' } }), 'valid');
  assert.equal(getAuthToken({ headers: { cookie: 'navilink_session=%' } }), null);
  assert.equal(getAuthToken({ headers: { cookie: ['invalid'] } }), null);
  const { send } = await startServer(context);
  for (const cookie of ['unrelated=%', 'navilink_session=%']) {
    assert.equal((await send('GET', '/api/storage/status', { cookie })).status, 401);
    assert.equal((await send('GET', '/healthz')).status, 200);
  }
  assert.equal((await send('GET', '/api/test-error')).status, 500);
  assert.equal((await send('GET', '/healthz')).status, 200);
});

it('revokes old sessions across password, private-file and batch-save endpoints', async (context) => {
  const { send, authSecret } = await startServer(context);
  const login = await send('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } });
  assert.equal(login.status, 200);
  const changed = await send('POST', '/api/auth/password', {
    cookie: login.cookie, body: { username: 'admin', password: randomBytes(16).toString('hex') }
  });
  assert.equal(changed.status, 200);
  assert.equal((await send('GET', '/api/webdav?file=private.json', { cookie: login.cookie })).status, 401);
  assert.equal((await send('POST', '/api/auth/password', {
    cookie: login.cookie, body: { username: 'admin', password: randomBytes(16).toString('hex') }
  })).status, 401);
  let cookie = changed.cookie;
  let privateData = (await send('GET', '/api/webdav?file=private.json', { cookie })).body;
  const privateSave = await send('PUT', '/api/webdav?file=private.json', {
    cookie, body: { ...privateData, admin: { ...privateData.admin, passwordHash: randomBytes(16).toString('hex') } }
  });
  assert.equal(privateSave.status, 200);
  assert.equal((await send('GET', '/api/auth/verify', { cookie })).status, 401);
  cookie = privateSave.cookie;
  assert.equal((await send('GET', '/api/auth/verify', { cookie })).status, 200);
  privateData = (await send('GET', '/api/webdav?file=private.json', { cookie })).body;
  const publicData = (await send('GET', '/api/webdav?file=public.json')).body;
  const batchSave = await send('POST', '/api/storage/save', {
    cookie, body: { publicData, privateData: { ...privateData, admin: { ...privateData.admin, passwordHash: randomBytes(16).toString('hex') } } }
  });
  assert.equal(batchSave.status, 200);
  assert.equal((await send('GET', '/api/auth/verify', { cookie })).status, 401);
  assert.equal((await send('GET', '/api/auth/verify', { cookie: batchSave.cookie })).status, 200);
  const legacy = signToken({ username: 'admin', exp: Date.now() + 60_000 }, authSecret);
  assert.equal((await send('GET', '/api/auth/verify', { cookie: `navilink_session=${legacy}` })).status, 401);
});
