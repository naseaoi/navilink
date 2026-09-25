import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildWebDavUrls, fetchWebDav, getWebDavEnv, readWebDavBody } from '../api/_shared/webdav.js';

it('preserves WebDAV transport configuration and applies the configured body limit', async (context) => {
  const env = getWebDavEnv({ WEBDAV_URL: 'http://dav.example.invalid', WEBDAV_USERNAME: 'test', WEBDAV_PASSWORD: 'test', WEBDAV_PATH: 'bookmarks', WEBDAV_ALLOW_HTTP: 'true', WEBDAV_TIMEOUT_MS: '25', WEBDAV_MAX_RESPONSE_BYTES: '8' });
  assert.equal(buildWebDavUrls('public.json', env).targetUrl, 'http://dav.example.invalid/bookmarks/public.json');
  await assert.rejects(readWebDavBody(new Response('123456789'), env), /too large/);
  const originalTimeout = AbortSignal.timeout;
  let observedTimeout;
  context.mock.method(AbortSignal, 'timeout', (ms) => { observedTimeout = ms; return originalTimeout(ms); });
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('{}');
  });
  await fetchWebDav('http://dav.example.invalid', {}, env);
  assert.equal(observedTimeout, 25);
});
