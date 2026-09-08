import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { it } from 'node:test';
import { hashPasswordAsync, signSessionToken } from '../api/_shared/auth.js';
import { createDefaultPublicData } from '../api/_shared/defaultData.js';
import legacyAuth from '../api/auth.js';
import verify from '../api/auth/verify.js';
import password from '../api/auth/password.js';
import webdav from '../api/webdav.js';
import mode from '../api/storage/mode.js';
import status from '../api/storage/status.js';
import sync from '../api/storage/sync.js';
import save from '../api/storage/save.js';

it('checks current credentials on every Vercel gate and renews sessions on each credential-write path', async (context) => {
  const env = { AUTH_SECRET: randomBytes(32).toString('hex'), WEBDAV_URL: 'https://dav.example.invalid', WEBDAV_USERNAME: 'review', WEBDAV_PASSWORD: randomBytes(16).toString('hex') };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  context.after(() => Object.entries(previous).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }));
  const files = {
    'public.json': { ...createDefaultPublicData(), _meta: { updatedAt: 1 } },
    'private.json': { admin: { username: 'admin', passwordHash: await hashPasswordAsync(randomBytes(16).toString('hex')) }, _meta: { updatedAt: 1 } }
  };
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    const fileName = new URL(url).pathname.split('/').at(-1);
    assert.ok(Object.hasOwn(files, fileName));
    if (options.method === 'PUT') {
      files[fileName] = JSON.parse(options.body);
      return new Response(null, { status: 201, headers: { etag: '"written"' } });
    }
    return Response.json(files[fileName], { headers: { etag: '"current"' } });
  });
  const invoke = async (handler, method, cookie, body) => {
    const response = {
      statusCode: 200, headers: {}, body: null,
      status(code) { this.statusCode = code; return this; },
      setHeader(name, value) { this.headers[name] = value; },
      json(value) { this.body = value; return this; },
      send(value) { this.body = value; return this; }
    };
    await handler({ method, headers: { cookie }, query: { file: 'private.json' }, body }, response);
    return response;
  };
  let cookie = `navilink_session=${signSessionToken({ exp: Date.now() + 60_000, mustChangePassword: false }, files['private.json'], env.AUTH_SECRET)}`;
  const readers = [[legacyAuth, 'GET', 200], [verify, 'GET', 200], [webdav, 'GET', 200], [mode, 'GET', 200], [status, 'GET', 200], [sync, 'POST', 400]];
  for (const [handler, method, expected] of readers) assert.equal((await invoke(handler, method, cookie)).statusCode, expected);
  const changed = await invoke(password, 'POST', cookie, { username: 'admin', password: randomBytes(16).toString('hex') });
  assert.equal(changed.statusCode, 200);
  for (const [handler, method] of readers) assert.equal((await invoke(handler, method, cookie)).statusCode, 401);
  assert.equal((await invoke(password, 'POST', cookie, {})).statusCode, 401);
  assert.equal((await invoke(save, 'POST', cookie, {})).statusCode, 401);
  cookie = changed.headers['Set-Cookie'].split(';')[0];
  const privateSave = await invoke(webdav, 'PUT', cookie, { ...files['private.json'], admin: { username: 'owner', passwordHash: randomBytes(16).toString('hex') } });
  assert.equal(privateSave.statusCode, 200);
  assert.equal((await invoke(verify, 'GET', cookie)).statusCode, 401);
  cookie = privateSave.headers['Set-Cookie'].split(';')[0];
  assert.equal((await invoke(verify, 'GET', cookie)).statusCode, 200);
  const batch = await invoke(save, 'POST', cookie, {
    publicData: files['public.json'], privateData: { ...files['private.json'], admin: { username: 'owner', passwordHash: randomBytes(16).toString('hex') } }
  });
  assert.equal(batch.statusCode, 200);
  assert.equal((await invoke(verify, 'GET', cookie)).statusCode, 401);
  assert.equal((await invoke(verify, 'GET', batch.headers['Set-Cookie'].split(';')[0])).statusCode, 200);
});
