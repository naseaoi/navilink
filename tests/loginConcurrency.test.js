import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { it } from 'node:test';
import { loginAdmin } from '../api/_shared/authService.js';
import { hashPasswordAsync } from '../api/_shared/auth.js';
import { createLoginRateLimiter } from '../api/_shared/rateLimit.js';

it('reserves per-IP attempts before concurrent password verification', async () => {
  const privateData = { admin: { username: 'admin', passwordHash: await hashPasswordAsync(randomBytes(16).toString('hex')) } };
  const limiter = createLoginRateLimiter({ maxAttempts: 3, maxConcurrent: 8 });
  let releaseRead;
  const gate = new Promise((resolve) => { releaseRead = resolve; });
  let reads = 0;
  const attempts = Array.from({ length: 12 }, () => loginAdmin({
    request: { ip: '127.0.0.1' },
    body: { username: 'admin', password: 'incorrect-password' },
    authSecret: randomBytes(32).toString('hex'),
    loginRateLimiter: limiter,
    readPrivateData: async () => { reads += 1; await gate; return privateData; },
    writePrivateData: async () => {}
  }));
  assert.equal(reads, 3);
  releaseRead();
  const results = await Promise.all(attempts);
  assert.equal(results.filter((result) => result.status === 401).length, 3);
  assert.equal(results.filter((result) => result.status === 429).length, 9);
});

it('bounds global login work and releases slots after upstream errors', async () => {
  const limiter = createLoginRateLimiter({ maxAttempts: 10, maxConcurrent: 1 });
  let releaseRead;
  const gate = new Promise((resolve) => { releaseRead = resolve; });
  const options = {
    request: { ip: '127.0.0.1' },
    body: { username: 'admin', password: 'incorrect-password' },
    authSecret: randomBytes(32).toString('hex'),
    loginRateLimiter: limiter,
    readPrivateData: async () => { await gate; throw new Error('upstream unavailable'); },
    writePrivateData: async () => {}
  };
  const first = loginAdmin(options);
  assert.equal((await loginAdmin({ ...options, request: { ip: '127.0.0.2' } })).status, 503);
  const rejected = assert.rejects(first, /upstream unavailable/);
  releaseRead();
  await rejected;
  const next = await loginAdmin({ ...options, readPrivateData: async () => null });
  assert.equal(next.status, 401);
});
