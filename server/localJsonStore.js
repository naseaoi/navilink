import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const FILES = new Set(['public.json', 'private.json', 'storage.json']);
const TX_PATTERN = /^\.navilink-tx-[0-9a-f-]{36}$/;

export const createLocalJsonStore = (dataDir, io = fs) => {
  let recoveryError;
  const restore = async (dir, entries) => {
    for (const entry of entries) {
      const target = path.join(dataDir, entry.name);
      if (entry.hadOriginal) {
        const temporary = path.join(dir, `${entry.name}.restore`);
        await io.copyFile(path.join(dir, `${entry.name}.bak`), temporary);
        await io.rename(temporary, target);
      } else {
        await io.rm(target, { force: true });
      }
    }
  };

  const recover = async () => {
    for (const name of await io.readdir(dataDir)) {
      if (!TX_PATTERN.test(name)) continue;
      const dir = path.join(dataDir, name);
      let entries;
      try {
        entries = JSON.parse(await io.readFile(path.join(dir, 'pending.json'), 'utf8'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (entries !== undefined) {
        if (!Array.isArray(entries) || entries.some((entry) => !entry || !FILES.has(entry.name) || typeof entry.hadOriginal !== 'boolean')) {
          throw new Error('Invalid local transaction journal');
        }
        await restore(dir, entries);
      }
      await io.rm(dir, { recursive: true, force: true });
    }
  };

  let queue = recover().catch((error) => { recoveryError = error; });
  const checkRecovery = () => {
    if (recoveryError) throw new Error('Local storage recovery required', { cause: recoveryError });
  };
  const read = async (filePath) => {
    await queue;
    checkRecovery();
    try {
      return JSON.parse(await io.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };

  const writeBatch = (items) => {
    const operation = queue.then(async () => {
      checkRecovery();
      const dir = path.join(dataDir, `.navilink-tx-${randomUUID()}`);
      const entries = items.map(({ filePath }) => {
        const name = path.basename(filePath);
        if (!FILES.has(name) || path.resolve(path.dirname(filePath)) !== path.resolve(dataDir)) throw new Error('Invalid local data file');
        return { name, hadOriginal: false };
      });
      await io.mkdir(dir);
      let pending = false;
      let committed = false;
      try {
        for (const [index, item] of items.entries()) {
          const entry = entries[index];
          await io.writeFile(path.join(dir, `${entry.name}.next`), JSON.stringify(item.data, null, 2), { flush: true });
          try {
            await io.copyFile(item.filePath, path.join(dir, `${entry.name}.bak`));
            entry.hadOriginal = true;
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        }
        await io.writeFile(path.join(dir, 'preparing.json'), JSON.stringify(entries), { flush: true });
        await io.rename(path.join(dir, 'preparing.json'), path.join(dir, 'pending.json'));
        pending = true;
        for (const entry of entries) await io.rename(path.join(dir, `${entry.name}.next`), path.join(dataDir, entry.name));
        await io.rename(path.join(dir, 'pending.json'), path.join(dir, 'committed.json'));
        committed = true;
      } catch (error) {
        if (pending) {
          try {
            await restore(dir, entries);
            await io.rename(path.join(dir, 'pending.json'), path.join(dir, 'committed.json'));
          } catch (rollbackError) {
            recoveryError = rollbackError;
            console.error('[Storage] Rollback failed; transaction retained for startup recovery');
          }
        }
        throw error;
      } finally {
        if (!recoveryError) {
          // 已提交的数据不因清理失败而报保存失败，残留目录由下次启动清理。
          await io.rm(dir, { recursive: true, force: true }).catch((error) => {
            if (!committed) throw error;
          });
        }
      }
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return { read, writeBatch, write: (filePath, data) => writeBatch([{ filePath, data }]) };
};
