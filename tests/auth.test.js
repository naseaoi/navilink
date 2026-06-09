import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signToken, verifyPassword, verifyToken } from '../api/_shared/auth.js';

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
