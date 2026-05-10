/**
 * 图标缓存服务
 * 基于 IndexedDB 持久化卡片 icon,避免每次访问重新加载远程图片
 * 默认 TTL = 30 天,容量上限 ~500 条(超出按 LRU 淘汰)
 */

const DB_NAME = 'navilink-icon-cache';
const DB_VERSION = 1;
const STORE_NAME = 'icons';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const MAX_ENTRIES = 500;

// 同会话内存级 LRU,避免重复创建 blob URL
const memoryCache = new Map<string, string>();

interface IconRecord {
  url: string;          // 主键
  blob: Blob;           // 图标二进制
  contentType: string;
  cachedAt: number;
  expiresAt: number;
  lastUsed: number;     // 用于 LRU 淘汰
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** 打开/创建 IndexedDB(单例) */
const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('lastUsed', 'lastUsed');
        store.createIndex('expiresAt', 'expiresAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (mode: IDBTransactionMode) => {
  const db = await openDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
};

/** 读取缓存记录 */
const readRecord = (url: string): Promise<IconRecord | undefined> =>
  tx('readonly').then(
    (store) =>
      new Promise<IconRecord | undefined>((resolve, reject) => {
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result as IconRecord | undefined);
        req.onerror = () => reject(req.error);
      })
  );

/** 写入缓存记录,触发 LRU 淘汰 */
const writeRecord = async (record: IconRecord): Promise<void> => {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => {
      // 异步触发淘汰,不阻塞写入完成
      enforceCapacity().catch(() => {});
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
};

/** 更新 lastUsed(命中时调用) */
const touchRecord = async (record: IconRecord): Promise<void> => {
  record.lastUsed = Date.now();
  const store = await tx('readwrite');
  store.put(record);
};

/** 容量超限时按 lastUsed 升序删除 */
const enforceCapacity = async (): Promise<void> => {
  const store = await tx('readwrite');
  const countReq = store.count();
  countReq.onsuccess = () => {
    const overflow = countReq.result - MAX_ENTRIES;
    if (overflow <= 0) return;
    const idx = store.index('lastUsed');
    let removed = 0;
    idx.openCursor().onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor || removed >= overflow) return;
      cursor.delete();
      removed++;
      cursor.continue();
    };
  };
};

/** 通过后端代理拉取图标,避免跨域 CORS 限制 */
const PROXY_PATH = '/api/icon-proxy?url=';

const fetchAsBlob = async (url: string): Promise<{ blob: Blob; contentType: string }> => {
  const proxied = `${PROXY_PATH}${encodeURIComponent(url)}`;
  const resp = await fetch(proxied, { credentials: 'omit' });
  if (!resp.ok) throw new Error(`fetch ${url} -> ${resp.status}`);
  const blob = await resp.blob();
  // 体积异常小通常表示拉取失败/上游空响应,丢弃避免污染缓存
  if (!blob.size) throw new Error('empty blob');
  const contentType = resp.headers.get('content-type') || blob.type || 'image/png';
  return { blob, contentType };
};

/**
 * 主入口:获取图标可用的 src(优先缓存,缺失则下载并入库)
 * 出错则抛出,由调用方触发降级链(Google favicon → 内置 SVG)
 */
export const getCachedIconSrc = async (url: string, ttlMs = DEFAULT_TTL_MS): Promise<string> => {
  if (!url) throw new Error('empty url');

  // 1. 内存命中
  const mem = memoryCache.get(url);
  if (mem) return mem;

  // 2. IndexedDB 命中且未过期
  try {
    const record = await readRecord(url);
    if (record && record.expiresAt > Date.now()) {
      const objectUrl = URL.createObjectURL(record.blob);
      memoryCache.set(url, objectUrl);
      touchRecord(record).catch(() => {});
      return objectUrl;
    }
  } catch {
    // IndexedDB 不可用时退回直接 fetch
  }

  // 3. 远程拉取并入库
  const { blob, contentType } = await fetchAsBlob(url);
  const now = Date.now();
  const record: IconRecord = {
    url,
    blob,
    contentType,
    cachedAt: now,
    expiresAt: now + ttlMs,
    lastUsed: now
  };
  writeRecord(record).catch(() => {});
  const objectUrl = URL.createObjectURL(blob);
  memoryCache.set(url, objectUrl);
  return objectUrl;
};

/** 手动失效:管理后台「清空图标缓存」按钮可用 */
export const clearIconCache = async (): Promise<void> => {
  memoryCache.forEach((u) => URL.revokeObjectURL(u));
  memoryCache.clear();
  try {
    const store = await tx('readwrite');
    store.clear();
  } catch {
    // ignore
  }
};

/** 清理已过期项(可在 App 启动时低优先级调用) */
export const sweepExpired = async (): Promise<void> => {
  try {
    const store = await tx('readwrite');
    const idx = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(Date.now());
    idx.openCursor(range).onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
  } catch {
    // ignore
  }
};
