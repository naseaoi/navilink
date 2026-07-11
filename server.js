import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createDefaultPrivateData } from './api/_shared/auth.js';
import { createDefaultPublicData } from './api/_shared/defaultData.js';
import { createLoginRateLimiter } from './api/_shared/rateLimit.js';
import { hasWebDavConfig } from './api/_shared/webdav.js';
import { registerAuthRoutes, createRequireAuth } from './server/authRoutes.js';
import { createIconProxyHandler } from './server/iconProxy.js';
import { createStorageService } from './server/localStorage.js';
import { registerStorageRoutes } from './server/storageRoutes.js';

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
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

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

const DEFAULT_PRIVATE_DATA = createDefaultPrivateData();
const DEFAULT_PUBLIC_DATA = createDefaultPublicData();
const loginRateLimiter = createLoginRateLimiter({ windowMs: LOGIN_WINDOW_MS, maxAttempts: LOGIN_MAX_ATTEMPTS });
const storage = createStorageService({
  dataDir: DATA_DIR,
  storageConfigPath: STORAGE_CONFIG_PATH,
  useWebDav: USE_WEBDAV,
  defaultPublicData: DEFAULT_PUBLIC_DATA,
  defaultPrivateData: DEFAULT_PRIVATE_DATA
});
const requireAuth = createRequireAuth(AUTH_SECRET);

registerAuthRoutes({ app, authSecret: AUTH_SECRET, loginRateLimiter, storage });
registerStorageRoutes({ app, storage, requireAuth, useWebDav: USE_WEBDAV });

app.get('/api/icon-proxy', createIconProxyHandler());

// 所有其他路由返回 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  storage.getStorageMode().then((mode) => {
    console.log(`Storage: ${mode === 'webdav' ? 'WebDAV' : 'Local'}`);
  }).catch(() => {
    console.log('Storage: Local');
  });
});
