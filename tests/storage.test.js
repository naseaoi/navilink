import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createDefaultPublicData } from '../api/_shared/defaultData.js';
import { createStorageService } from '../server/localStorage.js';

describe('storage initialization', () => {
  it('creates public data when a local storage directory is empty', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-storage-'));
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: false,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: { admin: { username: 'admin', passwordHash: 'unused' } }
      });
      const publicData = await storage.readPublicOrDefault();
      const stored = JSON.parse(await fs.readFile(path.join(dataDir, 'public.json'), 'utf8'));
      assert.equal(publicData.settings.title, '我的导航');
      assert.equal(stored.cards.length, 2);
      assert.equal(typeof stored._meta.updatedAt, 'number');
    } finally {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

  it('writes public and private data through one local batch', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-batch-'));
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: false,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: { admin: { username: 'admin', passwordHash: 'unused' } }
      });
      await storage.writeDataBatchToStorage('local', [
        { fileName: 'public.json', data: createDefaultPublicData() },
        { fileName: 'private.json', data: { admin: { username: 'owner', passwordHash: 'hashed' } } }
      ]);
      const publicData = JSON.parse(await fs.readFile(path.join(dataDir, 'public.json'), 'utf8'));
      const privateData = JSON.parse(await fs.readFile(path.join(dataDir, 'private.json'), 'utf8'));
      assert.equal(publicData.cards.length, 2);
      assert.equal(privateData.admin.username, 'owner');
    } finally {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

  it('serves public data from memory and refreshes it after cache updates', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-cache-'));
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: false,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: { admin: { username: 'admin', passwordHash: 'unused' } },
        publicCacheTtlMs: 60_000
      });
      const initial = await storage.readPublicOrDefault();
      await fs.writeFile(path.join(dataDir, 'public.json'), JSON.stringify({ ...initial, settings: { ...initial.settings, title: 'disk' } }));
      assert.equal((await storage.readPublicOrDefault()).settings.title, initial.settings.title);

      const updated = { ...initial, settings: { ...initial.settings, title: 'updated' } };
      await storage.writeDataToStorage('local', 'public.json', updated);
      await fs.writeFile(path.join(dataDir, 'public.json'), JSON.stringify(initial));
      assert.equal((await storage.readPublicOrDefault()).settings.title, 'updated');
    } finally {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

  it('caches public reads in WebDAV mode', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-webdav-cache-'));
    const originalFetch = global.fetch;
    const previousWebDavEnv = {
      WEBDAV_URL: process.env.WEBDAV_URL,
      WEBDAV_USERNAME: process.env.WEBDAV_USERNAME,
      WEBDAV_PASSWORD: process.env.WEBDAV_PASSWORD
    };
    process.env.WEBDAV_URL = 'https://dav.example.com';
    process.env.WEBDAV_USERNAME = 'test';
    process.env.WEBDAV_PASSWORD = 'test';
    let reads = 0;
    global.fetch = async () => {
      reads += 1;
      return new Response(JSON.stringify({ ...createDefaultPublicData(), _meta: { updatedAt: 10 } }), {
        status: 200,
        headers: { ETag: '"public-v1"' }
      });
    };
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: true,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: { admin: { username: 'admin', passwordHash: 'unused' } },
        publicCacheTtlMs: 60_000
      });
      await storage.readPublicOrDefault();
      await storage.readPublicOrDefault();
      assert.equal(reads, 1);
    } finally {
      global.fetch = originalFetch;
      Object.entries(previousWebDavEnv).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

  it('allows only one concurrent save for the same local version', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-concurrent-'));
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: false,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: { admin: { username: 'admin', passwordHash: 'admin12345' } }
      });
      const initial = await storage.writeDataBatchToStorage('local', [
        { fileName: 'public.json', data: createDefaultPublicData() },
        { fileName: 'private.json', data: { admin: { username: 'admin', passwordHash: 'admin12345' } } }
      ]);
      const expected = {
        publicUpdatedAt: initial['public.json']._meta.updatedAt,
        privateUpdatedAt: initial['private.json']._meta.updatedAt
      };
      const createSave = (title) => storage.saveCurrentData({
        publicData: { ...initial['public.json'], settings: { ...initial['public.json'].settings, title } },
        privateData: initial['private.json'],
        expected
      });
      const results = await Promise.allSettled([createSave('first'), createSave('second')]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      const rejected = results.find((result) => result.status === 'rejected');
      assert.equal(rejected.reason.code, 'VERSION_CONFLICT');
      const files = await fs.readdir(dataDir);
      assert.equal(files.some((file) => file.endsWith('.tmp') || file.endsWith('.bak')), false);
    } finally {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

  it('uses the version-check ETags for WebDAV writes', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-webdav-save-'));
    const originalFetch = global.fetch;
    const previousWebDavEnv = {
      WEBDAV_URL: process.env.WEBDAV_URL,
      WEBDAV_USERNAME: process.env.WEBDAV_USERNAME,
      WEBDAV_PASSWORD: process.env.WEBDAV_PASSWORD
    };
    process.env.WEBDAV_URL = 'https://dav.example.com';
    process.env.WEBDAV_USERNAME = 'test';
    process.env.WEBDAV_PASSWORD = 'test';
    const gets = [];
    const puts = [];
    const publicData = { ...createDefaultPublicData(), _meta: { updatedAt: 10 } };
    const privateData = { admin: { username: 'admin', passwordHash: 'admin12345' }, _meta: { updatedAt: 20 } };
    global.fetch = async (url, options = {}) => {
      const fileName = String(url).endsWith('private.json') ? 'private.json' : 'public.json';
      if ((options.method || 'GET') === 'GET') {
        gets.push(fileName);
        const data = fileName === 'public.json' ? publicData : privateData;
        return new Response(JSON.stringify(data), { status: 200, headers: { ETag: `"${fileName}-v1"` } });
      }
      puts.push({ fileName, ifMatch: options.headers['If-Match'] });
      return new Response('', { status: 200 });
    };
    try {
      const storage = createStorageService({
        dataDir,
        storageConfigPath: path.join(dataDir, 'storage.json'),
        useWebDav: true,
        defaultPublicData: createDefaultPublicData(),
        defaultPrivateData: privateData
      });
      await storage.saveCurrentData({
        publicData,
        privateData,
        expected: { publicUpdatedAt: 10, privateUpdatedAt: 20 }
      });
      assert.deepEqual(gets.sort(), ['private.json', 'public.json']);
      assert.deepEqual(puts, [
        { fileName: 'public.json', ifMatch: '"public.json-v1"' },
        { fileName: 'private.json', ifMatch: '"private.json-v1"' }
      ]);
    } finally {
      global.fetch = originalFetch;
      Object.entries(previousWebDavEnv).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });
});
