import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vercelIconProxyHandler from '../api/icon-proxy.js';
import { createIconProxyHandler } from '../server/iconProxy.js';

const createRequest = (url, options = {}) => ({
  query: { url },
  headers: options.headers || {},
  ip: options.ip || '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' }
});

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
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  }
});

const iconResult = (body = Buffer.from('icon')) => ({
  status: 200,
  ok: true,
  headers: { 'content-type': 'image/png' },
  body
});

describe('icon proxy', () => {
  it('handles Vercel requests and uses the platform client address', async () => {
    assert.equal(typeof vercelIconProxyHandler, 'function');
    const request = createRequest('', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.20, 10.0.0.1' }
    });
    const response = createResponse();

    await vercelIconProxyHandler(request, response);

    assert.equal(request.ip, '203.0.113.20');
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: 'missing url' });
  });

  it('coalesces concurrent requests and caches successful responses', async () => {
    let calls = 0;
    const handler = createIconProxyHandler({
      fetchIcon: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return iconResult();
      }
    });
    const target = 'https://assets.example.com/icon.png';
    const responses = [createResponse(), createResponse(), createResponse()];

    await Promise.all(responses.map((response) => handler(createRequest(target), response)));
    const cachedResponse = createResponse();
    await handler(createRequest(target), cachedResponse);

    assert.equal(calls, 1);
    assert.equal(responses.every((response) => response.statusCode === 200), true);
    assert.deepEqual(cachedResponse.body, Buffer.from('icon'));
    assert.equal(cachedResponse.headers['Cache-Control'], 'public, max-age=2592000, immutable');
  });

  it('limits distinct upstream requests globally', async () => {
    let releaseRequest;
    const gate = new Promise((resolve) => { releaseRequest = resolve; });
    const handler = createIconProxyHandler({
      maxConcurrent: 1,
      fetchIcon: async () => {
        await gate;
        return iconResult();
      }
    });
    const firstResponse = createResponse();
    const firstRequest = handler(createRequest('https://assets.example.com/first.png'), firstResponse);
    const busyResponse = createResponse();

    await handler(createRequest('https://assets.example.com/second.png'), busyResponse);
    releaseRequest();
    await firstRequest;

    assert.equal(busyResponse.statusCode, 503);
    assert.equal(busyResponse.headers['Retry-After'], '1');
    assert.equal(firstResponse.statusCode, 200);
  });

  it('rejects oversized injected responses before caching', async () => {
    const handler = createIconProxyHandler({
      fetchIcon: async () => iconResult(Buffer.alloc(512 * 1024 + 1))
    });
    const response = createResponse();

    await handler(createRequest('https://assets.example.com/large.png'), response);

    assert.equal(response.statusCode, 413);
  });

  it('does not trust a raw forwarded address for Express rate limiting', async () => {
    const target = 'https://assets.example.com/icon.png';
    const handler = createIconProxyHandler({ fetchIcon: async () => iconResult() });

    for (let index = 0; index < 120; index += 1) {
      const response = createResponse();
      await handler(createRequest(target, {
        ip: '203.0.113.10',
        headers: { 'x-forwarded-for': `198.51.100.${index}` }
      }), response);
      assert.equal(response.statusCode, 200);
    }

    const limitedResponse = createResponse();
    await handler(createRequest(target, {
      ip: '203.0.113.10',
      headers: { 'x-forwarded-for': '198.51.100.250' }
    }), limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
  });
});
