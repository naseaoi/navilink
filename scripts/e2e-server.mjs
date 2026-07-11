import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.resolve('test-results/e2e-data');
await fs.rm(dataDir, { recursive: true, force: true });
await fs.mkdir(dataDir, { recursive: true });
process.env.PORT = '4173';
process.env.DATA_DIR = dataDir;
process.env.AUTH_SECRET = 'e2e-only-auth-secret';
process.env.WEBDAV_URL = '';
process.env.WEBDAV_USERNAME = '';
process.env.WEBDAV_PASSWORD = '';
process.env.COOKIE_SECURE = 'false';
await import('../server.js');
