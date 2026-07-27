import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registerStorageRoutes } from '../server/storageRoutes.js';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
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

describe('storage routes', () => {
  it('serves WebDAV public data through the storage service', async () => {
    const routes = {};
    const publicData = { settings: { title: 'cached', icon: '' }, categories: [], cards: [] };
    let publicReads = 0;
    const app = {
      all: (path, handler) => { routes[`ALL ${path}`] = handler; },
      get: (path, handler) => { routes[`GET ${path}`] = handler; },
      put: (path, handler) => { routes[`PUT ${path}`] = handler; },
      post: (path, handler) => { routes[`POST ${path}`] = handler; }
    };
    const storage = {
      readPublicOrDefault: async () => {
        publicReads += 1;
        return publicData;
      }
    };
    registerStorageRoutes({ app, storage, requireAuth: () => true, useWebDav: true });

    const response = createResponse();
    await routes['ALL /api/webdav']({ method: 'GET', query: { file: 'public.json' } }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, publicData);
    assert.equal(publicReads, 1);
  });
});
