import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  DEFAULT_ADMIN_PASSWORD,
  createDefaultPrivateData,
  getAuthToken,
  normalizePrivateData,
  signToken,
  verifyPassword,
  verifyToken
} from './api/_shared/auth.js';
import { createLoginRateLimiter } from './api/_shared/rateLimit.js';
import { getRequestedDataFile, getUpdatedAt, withTimestamp } from './api/_shared/data.js';
import {
  fetchWebDavJson,
  hasWebDavConfig,
  putWebDavJson
} from './api/_shared/webdav.js';
import { proxyWebDavDataFile } from './api/_shared/webdavProxy.js';
import { validateDataFilePayload, validateLoginPayload } from './api/_shared/validation.js';
import { createIconProxyHandler } from './server/iconProxy.js';

// 配置环境
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_ASSETS_DIR = path.join(DIST_DIR, 'assets');
const STORAGE_CONFIG_PATH = path.join(DATA_DIR, 'storage.json');
const AUTH_SECRET_PATH = path.join(DATA_DIR, '.auth_secret');
let AUTH_SECRET = process.env.AUTH_SECRET || '';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 60_000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);

// WebDAV 配置 (如果存在则优先使用代理模式)
const USE_WEBDAV = hasWebDavConfig();

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.length === 0) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // 支持大 JSON 数据
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  return next();
});
app.use('/assets', express.static(DIST_ASSETS_DIR, {
  immutable: true,
  maxAge: '1y'
}));
app.use(express.static(DIST_DIR, {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin denied' });
  }
  return next(err);
});

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  console.log(`[System] Creating data directory: ${DATA_DIR}`);
  mkdirSync(DATA_DIR, { recursive: true });
}

const loadAuthSecret = () => {
  if (AUTH_SECRET) return AUTH_SECRET;
  try {
    if (existsSync(AUTH_SECRET_PATH)) {
      const stored = readFileSync(AUTH_SECRET_PATH, 'utf-8').trim();
      if (stored) return stored;
    }
  } catch (error) {
    console.warn('[Auth] Failed to read secret file');
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    writeFileSync(AUTH_SECRET_PATH, generated, 'utf-8');
  } catch (error) {
    console.warn('[Auth] Failed to persist secret file');
  }
  return generated;
};

AUTH_SECRET = loadAuthSecret();

// 内存缓存 (仅本地模式优化读取性能)
const memoryCache = {
  'public.json': null,
  'private.json': null
};

const requireAuth = (req, res) => {
  const token = getAuthToken(req);
  const payload = verifyToken(token, AUTH_SECRET);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return payload;
};

const DEFAULT_PRIVATE_DATA = createDefaultPrivateData();
const loginRateLimiter = createLoginRateLimiter({ windowMs: LOGIN_WINDOW_MS, maxAttempts: LOGIN_MAX_ATTEMPTS });

const readLocalJson = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
};

const writeLocalJsonAtomic = async (filePath, data) => {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, filePath);
};

const normalizeStorageMode = (mode) => (mode === 'webdav' ? 'webdav' : 'local');
const DEFAULT_STORAGE_MODE = USE_WEBDAV ? 'webdav' : 'local';
let storageModeCache = null;

const getStorageMode = async () => {
  if (storageModeCache) return storageModeCache;
  const config = await readLocalJson(STORAGE_CONFIG_PATH);
  if (config?.mode) storageModeCache = normalizeStorageMode(config.mode);
  else storageModeCache = DEFAULT_STORAGE_MODE;
  if (storageModeCache === 'webdav' && !USE_WEBDAV) storageModeCache = 'local';
  return storageModeCache;
};

const setStorageMode = async (mode) => {
  storageModeCache = normalizeStorageMode(mode);
  if (storageModeCache === 'webdav' && !USE_WEBDAV) storageModeCache = 'local';
  await writeLocalJsonAtomic(STORAGE_CONFIG_PATH, { mode: storageModeCache });
  return storageModeCache;
};

const readDataFromStorage = async (mode, fileName) => {
  if (mode === 'webdav') return fetchWebDavJson(fileName);
  return readLocalJson(path.join(DATA_DIR, fileName));
};

const writeDataToStorage = async (mode, fileName, data) => {
  const payload = withTimestamp(fileName, data);
  if (mode === 'webdav') return putWebDavJson(fileName, payload);
  await writeLocalJsonAtomic(path.join(DATA_DIR, fileName), payload);
  memoryCache[fileName] = payload;
};

const sendValidationError = (res, error) => {
  if (error?.statusCode === 400) {
    return res.status(400).json({ error: error.message });
  }
  throw error;
};

// --- API 处理逻辑 ---

// 统一的 API 入口
app.all('/api/webdav', async (req, res) => {
  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fileName = getRequestedDataFile(req.query.file);
  if (!fileName) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const isPrivate = fileName === 'private.json';
  const isWrite = req.method === 'PUT';
  if (isPrivate || isWrite) {
    const payload = requireAuth(req, res);
    if (!payload) return;
  }

  if (isWrite) {
    try {
      req.body = validateDataFilePayload(fileName, req.body);
      if (isPrivate) req.body = normalizePrivateData(req.body);
      req.body = withTimestamp(fileName, req.body);
    } catch (error) {
      return sendValidationError(res, error);
    }
  }

  const storageMode = await getStorageMode();
  if (storageMode === 'webdav') {
    return handleWebDAVProxy(req, res, fileName);
  }
  return handleLocalStorage(req, res, fileName);
});

// 处理本地存储
async function handleLocalStorage(req, res, fileName) {
  const filePath = path.join(DATA_DIR, fileName);

  try {
    if (req.method === 'GET') {
      // 优先从缓存读取
      if (memoryCache[fileName]) {
        return res.json(memoryCache[fileName]);
      }

      // 只有缓存没有时才读取磁盘
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(data);
        memoryCache[fileName] = jsonData; // 更新缓存
        return res.json(jsonData);
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found' });
        }
        throw err;
      }
    } 
    
    else if (req.method === 'PUT') {
      // 写入磁盘前先写入缓存
      memoryCache[fileName] = req.body;

      // 异步写入磁盘 (Atomic write pattern to avoid corruption)
      await writeLocalJsonAtomic(filePath, req.body);
      
      console.log(`[Storage] Saved ${fileName} to local disk.`);
      return res.json({ success: true });
    } 
    
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[Storage Error] ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  let loginPayload;
  try {
    loginPayload = validateLoginPayload(req.body);
  } catch (error) {
    return sendValidationError(res, error);
  }
  const { username, password, remember } = loginPayload;
  const rateKey = loginRateLimiter.getKey(req, username);
  const rateState = loginRateLimiter.getState(rateKey);
  if (rateState.limited) {
    res.set('Retry-After', String(rateState.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  try {
    let privateData = null;
    const storageMode = await getStorageMode();
    if (storageMode === 'webdav') {
      privateData = await fetchWebDavJson('private.json');
      if (!privateData) {
      privateData = DEFAULT_PRIVATE_DATA;
      await putWebDavJson('private.json', withTimestamp('private.json', privateData));
      }
    } else {
      const filePath = path.join(DATA_DIR, 'private.json');
      privateData = await readLocalJson(filePath);
      if (!privateData) {
      privateData = DEFAULT_PRIVATE_DATA;
      await writeLocalJsonAtomic(filePath, withTimestamp('private.json', privateData));
      }
    }

    const stored = privateData?.admin?.passwordHash || '';
    const isValid = verifyPassword(password, stored);
    if (!isValid || privateData?.admin?.username !== username) {
      loginRateLimiter.recordFailure(rateKey);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    loginRateLimiter.clear(rateKey);
    const mustChangePassword = verifyPassword(DEFAULT_ADMIN_PASSWORD, stored);

    if (stored && !stored.startsWith('scrypt$')) {
      const upgraded = normalizePrivateData(privateData);
      const stamped = withTimestamp('private.json', upgraded);
      if (storageMode === 'webdav') await putWebDavJson('private.json', stamped);
      else await writeLocalJsonAtomic(path.join(DATA_DIR, 'private.json'), stamped);
    }

    const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const exp = Date.now() + duration;
    const token = signToken({ username, exp, mustChangePassword }, AUTH_SECRET);
    return res.json({ token, exp, mustChangePassword });
  } catch (error) {
    console.error(`[Auth Error] ${error.message}`);
    return res.status(500).json({ error: 'Auth Error' });
  }
});

app.get('/api/auth/verify', (req, res) => {
  const token = getAuthToken(req);
  const payload = verifyToken(token, AUTH_SECRET);
  if (!payload) return res.status(401).json({ ok: false });
  return res.json({ ok: true, exp: payload.exp, mustChangePassword: !!payload.mustChangePassword });
});

app.get('/api/storage/mode', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  const mode = await getStorageMode();
  return res.json({
    mode,
    available: { local: true, webdav: USE_WEBDAV }
  });
});

app.get('/api/storage/status', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  try {
    const localPublic = await readDataFromStorage('local', 'public.json');
    const localPrivate = await readDataFromStorage('local', 'private.json');
    let webdavPublic = null;
    let webdavPrivate = null;
    if (USE_WEBDAV) {
      webdavPublic = await readDataFromStorage('webdav', 'public.json');
      webdavPrivate = await readDataFromStorage('webdav', 'private.json');
    }

    return res.json({
      local: { publicUpdatedAt: getUpdatedAt(localPublic), privateUpdatedAt: getUpdatedAt(localPrivate) },
      webdav: { publicUpdatedAt: getUpdatedAt(webdavPublic), privateUpdatedAt: getUpdatedAt(webdavPrivate) },
      available: { local: true, webdav: USE_WEBDAV }
    });
  } catch (error) {
    console.error(`[Storage Status Error] ${error.message}`);
    return res.status(500).json({ error: 'Status Error' });
  }
});

app.put('/api/storage/mode', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  const { mode } = req.body || {};
  if (!mode || !['local', 'webdav'].includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
  if (mode === 'webdav' && !USE_WEBDAV) return res.status(400).json({ error: 'WebDAV not available' });
  const next = await setStorageMode(mode);
  return res.json({ mode: next, available: { local: true, webdav: USE_WEBDAV } });
});

app.post('/api/storage/sync', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  const { from, to } = req.body || {};
  if (!from || !to || !['local', 'webdav'].includes(from) || !['local', 'webdav'].includes(to)) {
    return res.status(400).json({ error: 'Invalid source/target' });
  }
  if (from === to) return res.status(400).json({ error: 'Source and target are the same' });
  if ((from === 'webdav' || to === 'webdav') && !USE_WEBDAV) {
    return res.status(400).json({ error: 'WebDAV not available' });
  }

  try {
    const publicData = await readDataFromStorage(from, 'public.json');
    if (!publicData) return res.status(404).json({ error: 'public.json not found in source' });

    let privateData = await readDataFromStorage(from, 'private.json');
    if (!privateData) privateData = DEFAULT_PRIVATE_DATA;

    await writeDataToStorage(to, 'public.json', publicData);
    await writeDataToStorage(to, 'private.json', normalizePrivateData(privateData));

    return res.json({ success: true });
  } catch (error) {
    console.error(`[Storage Sync Error] ${error.message}`);
    return res.status(500).json({ error: 'Sync Error' });
  }
});

async function handleWebDAVProxy(req, res, fileName) {
  try {
    const result = await proxyWebDavDataFile({ method: req.method, fileName, body: req.body });
    if (result.json) return res.status(result.status).json(result.body);
    return res.status(result.status).send(result.body);
  } catch (error) {
    console.error(`[WebDAV Proxy Error] ${error.message}`);
    res.status(500).json({ error: 'Proxy Error' });
  }
}

app.get('/api/icon-proxy', createIconProxyHandler());

// 所有其他路由返回 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  getStorageMode().then((mode) => {
    console.log(`Storage: ${mode === 'webdav' ? 'WebDAV' : 'Local'}`);
  }).catch(() => {
    console.log('Storage: Local');
  });
});
