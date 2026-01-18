import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

// 配置环境
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// WebDAV 配置 (如果存在则优先使用代理模式)
const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH } = process.env;
const USE_WEBDAV = !!(WEBDAV_URL && WEBDAV_USERNAME && WEBDAV_PASSWORD);

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 支持大 JSON 数据
app.use(express.static(path.join(__dirname, 'dist')));

// 确保数据目录存在 (仅本地模式)
if (!USE_WEBDAV && !existsSync(DATA_DIR)) {
  console.log(`[System] Creating local data directory: ${DATA_DIR}`);
  mkdirSync(DATA_DIR, { recursive: true });
}

// 内存缓存 (仅本地模式优化读取性能)
const memoryCache = {
  'public.json': null,
  'private.json': null
};

// --- API 处理逻辑 ---

// 统一的 API 入口
app.all('/api/webdav', async (req, res) => {
  const file = req.query.file || 'public.json';
  const fileName = path.basename(file); // 防止路径遍历攻击

  if (USE_WEBDAV) {
    return handleWebDAVProxy(req, res, fileName);
  } else {
    return handleLocalStorage(req, res, fileName);
  }
});

// 处理本地存储 (VPS/Docker)
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
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(req.body, null, 2));
      await fs.rename(tempPath, filePath);
      
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

// 处理 WebDAV 代理 (与 Vercel 逻辑保持一致)
async function handleWebDAVProxy(req, res, fileName) {
  const baseUrl = WEBDAV_URL.replace(/\/+$/, '');
  const davPath = (WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, '');
  const targetUrl = `${baseUrl}/${davPath}/${fileName}`;
  
  const authHeader = 'Basic ' + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64');

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 'Authorization': authHeader }
    };

    if (req.method === 'PUT') {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 处理 404 (初始化)
    if (response.status === 404 && req.method === 'GET') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 处理 409 (文件夹不存在)
    if (response.status === 409 && req.method === 'PUT') {
       // 尝试创建目录
       const dirUrl = `${baseUrl}/${davPath}/`;
       await fetch(dirUrl, { method: 'MKCOL', headers: { 'Authorization': authHeader } });
       // 重试保存
       const retryRes = await fetch(targetUrl, fetchOptions);
       if (retryRes.ok) return res.json({ success: true });
    }

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    if (req.method === 'GET') {
      const data = await response.json();
      return res.json(data);
    } else {
      return res.json({ success: true });
    }
  } catch (error) {
    console.error(`[WebDAV Proxy Error] ${error.message}`);
    res.status(500).json({ error: 'Proxy Error' });
  }
}

// 所有其他路由返回 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${USE_WEBDAV ? 'WebDAV Proxy' : 'Local Storage'}`);
});