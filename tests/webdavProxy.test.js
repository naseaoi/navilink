import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { buildWebDavUrls, putWebDavJsonBatch } from '../api/_shared/webdav.js';
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
    global.fetch = async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await proxyWebDavDataFile({ method: 'GET', fileName: 'public.json', env });
    assert.deepEqual(result.body, { ok: true });
  });

  it('rejects insecure WebDAV URLs by default', () => {
    assert.throws(() => buildWebDavUrls('public.json', {
      ...env,
      WEBDAV_URL: 'http://dav.example.com'
    }), /must use HTTPS/);
  });

  it('rejects oversized WebDAV responses', async () => {
    global.fetch = async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Length': '100' }
    });
    await assert.rejects(() => proxyWebDavDataFile({
      method: 'GET',
      fileName: 'public.json',
      env: { ...env, WEBDAV_MAX_RESPONSE_BYTES: '10' }
    }), /too large/);
  });

  it('rolls back committed files when batch write fails', async () => {
    const calls = [];
    const responses = [
      new Response(null, { status: 204, headers: { ETag: '"committed-public"' } }),
      { status: 500, ok: false },
      { status: 204, ok: true }
    ];
    global.fetch = async (...args) => {
      calls.push(args);
      return responses.shift();
    };

    await assert.rejects(() => putWebDavJsonBatch({
      entries: [
        { fileName: 'public.json', data: { version: 'next-public' } },
        { fileName: 'private.json', data: { version: 'next-private' } }
      ],
      originals: {
        'public.json': { version: 'old-public' },
        'private.json': { version: 'old-private' }
      },
      env
    }), /WebDAV write failed: 500/);

    assert.equal(calls.length, 3);
    assert.match(calls[0][0], /public\.json$/);
    assert.match(calls[1][0], /private\.json$/);
    assert.match(calls[2][0], /public\.json$/);
    assert.equal(calls[2][1].body, JSON.stringify({ version: 'old-public' }));
    assert.equal(calls[2][1].headers['If-Match'], '"committed-public"');
  });

  it('deletes new files during batch rollback', async () => {
    const calls = [];
    const responses = [
      new Response(null, { status: 204, headers: { ETag: '"created-public"' } }),
      { status: 500, ok: false },
      { status: 204, ok: true }
    ];
    global.fetch = async (...args) => {
      calls.push(args);
      return responses.shift();
    };

    await assert.rejects(() => putWebDavJsonBatch({
      entries: [
        { fileName: 'public.json', data: { version: 'next-public' } },
        { fileName: 'private.json', data: { version: 'next-private' } }
      ],
      originals: {
        'public.json': null,
        'private.json': null
      },
      env
    }), /WebDAV write failed: 500/);

    assert.equal(calls.length, 3);
    assert.match(calls[2][0], /public\.json$/);
    assert.equal(calls[2][1].method, 'DELETE');
    assert.equal(calls[2][1].headers['If-Match'], '"created-public"');
  });

  it('does not perform an unsafe rollback without a committed ETag', async () => {
    const calls = [];
    const errors = [];
    const responses = [
      { status: 204, ok: true },
      { status: 500, ok: false }
    ];
    global.fetch = async (...args) => {
      calls.push(args);
      return responses.shift();
    };
    const originalConsoleError = console.error;
    console.error = (message) => errors.push(message);
    try {
      await assert.rejects(() => putWebDavJsonBatch({
        entries: [
          { fileName: 'public.json', data: { version: 'next-public' } },
          { fileName: 'private.json', data: { version: 'next-private' } }
        ],
        originals: { 'public.json': { version: 'old-public' } },
        env
      }), /WebDAV write failed: 500/);
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(calls.length, 2);
    assert.match(errors[0], /missing committed ETag/);
  });

  it('uses conditional headers for batch writes', async () => {
    const calls = [];
    global.fetch = async (...args) => {
      calls.push(args);
      return { status: 204, ok: true };
    };

    await putWebDavJsonBatch({
      entries: [
        { fileName: 'public.json', data: { ok: true }, ifMatch: '"etag-public"' },
        { fileName: 'private.json', data: { ok: true }, ifNoneMatch: true }
      ],
      env
    });

    assert.equal(calls[0][1].headers['If-Match'], '"etag-public"');
    assert.equal(calls[1][1].headers['If-None-Match'], '*');
  });

  it('maps WebDAV precondition failures to save conflicts', async () => {
    global.fetch = async () => ({ status: 412, ok: false });

    await assert.rejects(async () => {
      await putWebDavJsonBatch({
        entries: [{ fileName: 'public.json', data: { ok: true }, ifMatch: '"stale"' }],
        env
      });
    }, (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, 'VERSION_CONFLICT');
      return true;
    });
  });
});
