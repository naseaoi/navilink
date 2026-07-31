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
const MAX_MEMORY_ENTRIES = 500;
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface MemoryIcon {
  src: string;
  refCount: number;
}

const memoryCache = new Map<string, MemoryIcon>();
const inFlight = new Map<string, Promise<string>>();

interface IconRecord {
  url: string;          // 主键
  blob: Blob;           // 图标二进制
  contentType: string;
  cachedAt: number;
  expiresAt: number;
  lastUsed: number;     // 用于 LRU 淘汰
}

let dbPromise: Promise<IDBDatabase> | null = null;
let capacityCheckScheduled = false;

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
      scheduleCapacityCheck();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
};

/** 更新 lastUsed(命中时调用) */
const touchRecord = async (record: IconRecord): Promise<void> => {
  if (Date.now() - record.lastUsed < TOUCH_INTERVAL_MS) return;
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

const scheduleCapacityCheck = () => {
  if (capacityCheckScheduled) return;
  capacityCheckScheduled = true;
  setTimeout(() => {
    capacityCheckScheduled = false;
    enforceCapacity().catch(() => {});
  }, 0);
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

const enforceMemoryCapacity = () => {
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  for (const [url, entry] of memoryCache) {
    if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
    if (entry.refCount > 0) continue;
    URL.revokeObjectURL(entry.src);
    memoryCache.delete(url);
  }
};

const storeMemoryIcon = (url: string, src: string) => {
  memoryCache.set(url, { src, refCount: 0 });
};

const acquireMemoryIcon = (url: string): string | null => {
  const entry = memoryCache.get(url);
  if (!entry) return null;
  entry.refCount += 1;
  memoryCache.delete(url);
  memoryCache.set(url, entry);
  enforceMemoryCapacity();
  return entry.src;
};

const loadIconSrc = async (url: string, ttlMs: number): Promise<string> => {
  try {
    const record = await readRecord(url);
    if (record && record.expiresAt > Date.now()) {
      const objectUrl = URL.createObjectURL(record.blob);
      storeMemoryIcon(url, objectUrl);
      touchRecord(record).catch(() => {});
      return objectUrl;
    }
  } catch {
    // 使用代理继续加载
  }

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
  storeMemoryIcon(url, objectUrl);
  return objectUrl;
};

export const getCachedIconSrc = async (url: string, ttlMs = DEFAULT_TTL_MS): Promise<string> => {
  if (!url) throw new Error('empty url');
  const cached = acquireMemoryIcon(url);
  if (cached) return cached;

  let pending = inFlight.get(url);
  if (!pending) {
    pending = loadIconSrc(url, ttlMs);
    inFlight.set(url, pending);
    pending.finally(() => {
      if (inFlight.get(url) === pending) inFlight.delete(url);
    }).catch(() => {});
  }
  await pending;
  const loaded = acquireMemoryIcon(url);
  if (!loaded) throw new Error('icon cache unavailable');
  return loaded;
};

export const releaseCachedIconSrc = (url: string): void => {
  const entry = memoryCache.get(url);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  enforceMemoryCapacity();
};

/** 手动失效:管理后台「清空图标缓存」按钮可用 */
export const clearIconCache = async (): Promise<void> => {
  memoryCache.forEach((entry) => URL.revokeObjectURL(entry.src));
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
