import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { it } from 'node:test';
import { createLocalJsonStore } from '../server/localJsonStore.js';

const setup = async (context) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'navilink-recovery-'));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'public.json'), JSON.stringify({ version: 'old-public' }));
  await fs.writeFile(path.join(dir, 'private.json'), JSON.stringify({ version: 'old-private' }));
  return dir;
};

it('restores both files when the second replacement fails', async (context) => {
  const dir = await setup(context);
  const io = { ...fs, rename: async (from, to) => {
    if (from.endsWith('private.json.next')) throw new Error('injected write failure');
    return fs.rename(from, to);
  } };
  const store = createLocalJsonStore(dir, io);
  await assert.rejects(store.writeBatch(['public.json', 'private.json'].map((name) => ({ filePath: path.join(dir, name), data: { version: 'new' } }))));
  assert.deepEqual(await store.read(path.join(dir, 'public.json')), { version: 'old-public' });
  assert.deepEqual(await store.read(path.join(dir, 'private.json')), { version: 'old-private' });
  assert.equal((await fs.readdir(dir)).length, 2);
});

it('retains backups after rollback failure, blocks access, and recovers on restart', async (context) => {
  const dir = await setup(context);
  const io = { ...fs, rename: async (from, to) => {
    if (from.endsWith('private.json.next') || from.endsWith('.restore')) throw new Error('disk unavailable');
    return fs.rename(from, to);
  } };
  const store = createLocalJsonStore(dir, io);
  await assert.rejects(store.writeBatch(['public.json', 'private.json'].map((name) => ({ filePath: path.join(dir, name), data: { version: 'new' } }))));
  const journal = (await fs.readdir(dir)).find((name) => name.startsWith('.navilink-tx-'));
  assert.ok(journal);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, journal, 'public.json.bak'), 'utf8')), { version: 'old-public' });
  await assert.rejects(store.read(path.join(dir, 'public.json')), /recovery required/);
  await assert.rejects(store.write(path.join(dir, 'public.json'), {}), /recovery required/);
  const restarted = createLocalJsonStore(dir);
  assert.deepEqual(await restarted.read(path.join(dir, 'public.json')), { version: 'old-public' });
  assert.deepEqual(await restarted.read(path.join(dir, 'private.json')), { version: 'old-private' });
  assert.equal((await fs.readdir(dir)).length, 2);
});

it('recovers a process interruption before serving data, including newly created files', async (context) => {
  const dir = await setup(context);
  const txDir = path.join(dir, `.navilink-tx-${randomUUID()}`);
  await fs.mkdir(txDir);
  await fs.copyFile(path.join(dir, 'public.json'), path.join(txDir, 'public.json.bak'));
  await fs.writeFile(path.join(txDir, 'pending.json'), JSON.stringify([{ name: 'public.json', hadOriginal: true }, { name: 'storage.json', hadOriginal: false }]));
  await fs.writeFile(path.join(dir, 'public.json'), '{"version":"partial"}');
  await fs.writeFile(path.join(dir, 'storage.json'), '{}');
  const store = createLocalJsonStore(dir);
  assert.deepEqual(await store.read(path.join(dir, 'public.json')), { version: 'old-public' });
  assert.equal(await store.read(path.join(dir, 'storage.json')), null);
});

it('keeps committed data when cleanup fails and removes only the journal on restart', async (context) => {
  const dir = await setup(context);
  const store = createLocalJsonStore(dir, { ...fs, rm: async () => { throw new Error('cleanup blocked'); } });
  await store.write(path.join(dir, 'public.json'), { version: 'committed' });
  const restarted = createLocalJsonStore(dir);
  assert.deepEqual(await restarted.read(path.join(dir, 'public.json')), { version: 'committed' });
  assert.equal((await fs.readdir(dir)).length, 2);
});
