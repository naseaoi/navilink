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
});
