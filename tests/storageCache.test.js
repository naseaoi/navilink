import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { createDefaultPublicData } from '../api/_shared/defaultData.js';
import { createStorageService } from '../server/localStorage.js';

const publicData = (title) => ({ ...createDefaultPublicData(), settings: { title, icon: '' } });
const createStorage = async (context) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-cache-isolation-'));
  const previousUrl = process.env.WEBDAV_URL;
  process.env.WEBDAV_URL = 'https://dav.example.invalid';
  context.after(async () => {
    if (previousUrl === undefined) delete process.env.WEBDAV_URL;
    else process.env.WEBDAV_URL = previousUrl;
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const storage = createStorageService({
    dataDir, storageConfigPath: path.join(dataDir, 'storage.json'), useWebDav: true,
    defaultPublicData: publicData('default'), defaultPrivateData: { admin: { username: 'admin', passwordHash: 'unused' } }, publicCacheTtlMs: 60_000
  });
  await storage.setStorageMode('local');
  return { storage, dataDir };
};

it('does not return private credentials cached from another storage or before a disk update', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 201 }));
  const { storage, dataDir } = await createStorage(context);
  await storage.writeCurrentData('private.json', { admin: { username: 'local-admin', passwordHash: 'unused' } });
  await storage.setStorageMode('webdav');
  await storage.writeCurrentData('private.json', { admin: { username: 'webdav-admin', passwordHash: 'unused' } });
  await storage.setStorageMode('local');
  const readPrivate = async () => {
    let result;
    await storage.handleLocalStorage({ method: 'GET' }, { json(data) { result = data; } }, 'private.json');
    return result;
  };
  assert.equal((await readPrivate()).admin.username, 'local-admin');
  await fs.writeFile(path.join(dataDir, 'private.json'), JSON.stringify({ admin: { username: 'restored-admin', passwordHash: 'unused' } }));
  assert.equal((await readPrivate()).admin.username, 'restored-admin');
});

it('isolates inactive storage writes and bypasses the public memory cache on a fresh read', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 201 }));
  const { storage, dataDir } = await createStorage(context);
  await storage.writeCurrentData('public.json', publicData('local'));
  await storage.writeDataToStorage('webdav', 'public.json', publicData('remote'));
  assert.equal((await storage.readPublicOrDefault()).settings.title, 'local');
  await fs.writeFile(path.join(dataDir, 'public.json'), JSON.stringify(publicData('restored')));
  assert.equal((await storage.readPublicOrDefault()).settings.title, 'local');
  assert.equal((await storage.readPublicOrDefault({ forceRefresh: true })).settings.title, 'restored');
});

for (const action of ['switch', 'write']) {
  it(`discards an old in-flight public read after a ${action}`, async (context) => {
    const { storage } = await createStorage(context);
    await storage.writeCurrentData('public.json', publicData('local'));
    await storage.setStorageMode('webdav');
    let releaseRead;
    let markRead;
    const gate = new Promise((resolve) => { releaseRead = resolve; });
    const requested = new Promise((resolve) => { markRead = resolve; });
    context.mock.method(globalThis, 'fetch', async (_url, options) => {
      if (options.method === 'PUT') return new Response(null, { status: 201 });
      markRead();
      await gate;
      return Response.json(publicData('stale-remote'));
    });
    const pending = storage.readPublicOrDefault();
    await requested;
    if (action === 'switch') await storage.setStorageMode('local');
    else await storage.writeCurrentData('public.json', publicData('new-remote'));
    const expected = action === 'switch' ? 'local' : 'new-remote';
    assert.equal((await storage.readPublicOrDefault()).settings.title, expected);
    releaseRead();
    assert.equal((await pending).settings.title, expected);
    assert.equal((await storage.readPublicOrDefault()).settings.title, expected);
  });
}
