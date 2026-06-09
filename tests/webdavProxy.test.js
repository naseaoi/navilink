import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { proxyWebDavDataFile } from '../api/_shared/webdavProxy.js';

const env = {
  WEBDAV_URL: 'https://dav.example.com',
  WEBDAV_USERNAME: 'user',
  WEBDAV_PASSWORD: 'pass',
  WEBDAV_PATH: 'navilink'
};

describe('webdav proxy', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('rejects unsupported methods', async () => {
    const result = await proxyWebDavDataFile({ method: 'DELETE', fileName: 'public.json', env });
    assert.equal(result.status, 405);
  });

  it('creates directory and retries PUT after 409', async () => {
    const calls = [];
    const responses = [
      { status: 409, ok: false, text: async () => 'missing dir' },
      { status: 201, ok: true },
      { status: 204, ok: true }
    ];
    global.fetch = async (...args) => {
      calls.push(args);
      return responses.shift();
    };

    const result = await proxyWebDavDataFile({
      method: 'PUT',
      fileName: 'public.json',
      body: { ok: true },
      env
    });

    assert.equal(result.status, 200);
    assert.equal(calls.length, 3);
    assert.equal(calls[1][1].method, 'MKCOL');
  });

  it('returns parsed JSON for GET', async () => {
    global.fetch = async () => ({
      status: 200,
      ok: true,
      json: async () => ({ ok: true })
    });

    const result = await proxyWebDavDataFile({ method: 'GET', fileName: 'public.json', env });
    assert.deepEqual(result.body, { ok: true });
  });
});
