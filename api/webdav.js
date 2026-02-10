import crypto from 'crypto';

export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH, AUTH_SECRET } = process.env;

  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const { file } = request.query;
  const requestedFile = typeof file === 'string' ? file.trim() : 'public.json';
  const allowedFiles = new Set(['public.json', 'private.json']);
  if (!allowedFiles.has(requestedFile)) {
    return response.status(400).json({ error: 'Invalid file parameter' });
  }
  const fileName = requestedFile;

  const isPrivate = fileName === 'private.json';
  const isWrite = request.method === 'PUT';

  const getAuthToken = () => {
    const header = request.headers.authorization || '';
    if (header.startsWith('Bearer ')) return header.slice('Bearer '.length);
    return null;
  };

  const verifyToken = (token) => {
    if (!token || !AUTH_SECRET) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    const valid = crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  };

  if (isPrivate || isWrite) {
    if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
    const token = getAuthToken();
    const payload = verifyToken(token);
    if (!payload) return response.status(401).json({ error: 'Unauthorized' });
  }
  
  // 健壮的路径拼接逻辑
  const baseUrl = WEBDAV_URL.replace(/\/+$/, ''); // 移除结尾斜杠
  const path = (WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, ''); // 移除开头和结尾斜杠
  const targetUrl = `${baseUrl}/${path}/${fileName}`;
  const dirUrl = `${baseUrl}/${path}/`;

  // 打印日志到 Vercel 控制台，方便调试路径问题
  console.log(`[WebDAV Proxy] Method: ${request.method}, Target: ${targetUrl}`);

  const method = request.method;
  const authHeader = 'Basic ' + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64');

  try {
    const fetchOptions = {
      method: method,
      headers: {
        'Authorization': authHeader,
      }
    };

    if (method === 'PUT') {
      const normalizePrivateData = (data) => {
        if (!data?.admin?.passwordHash) return data;
        if (!data.admin.passwordHash.startsWith('scrypt$')) {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.scryptSync(data.admin.passwordHash, salt, 64).toString('hex');
          return { ...data, admin: { ...data.admin, passwordHash: `scrypt$${salt}$${hash}` } };
        }
        return data;
      };

      const withTimestamp = (data) => {
        if (!data || (fileName !== 'public.json' && fileName !== 'private.json')) return data;
        return { ...data, _meta: { ...(data._meta || {}), updatedAt: Date.now() } };
      };

      const bodyData = isPrivate ? normalizePrivateData(request.body) : request.body;
      const stamped = withTimestamp(bodyData);
      fetchOptions.body = JSON.stringify(stamped);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    let davResponse = await fetch(targetUrl, fetchOptions);

    // 处理 409 Conflict: 尝试创建文件夹并重试 (仅针对 PUT)
    if (davResponse.status === 409 && method === 'PUT') {
      console.log(`[WebDAV Proxy] Got 409, attempting to create directory: ${dirUrl}`);
      const mkcolResponse = await fetch(dirUrl, {
        method: 'MKCOL',
        headers: { 'Authorization': authHeader }
      });
      
      if (mkcolResponse.ok || mkcolResponse.status === 405) { // 405 means folder already exists
        console.log(`[WebDAV Proxy] Directory created or exists, retrying PUT...`);
        davResponse = await fetch(targetUrl, fetchOptions);
      }
    }

    if (davResponse.status === 404 && method === 'GET') {
      return response.status(404).json({ error: 'File not found' });
    }

    if (!davResponse.ok) {
      const errorText = await davResponse.text();
      console.error(`[WebDAV Proxy] Upstream error (${davResponse.status}):`, errorText);
      return response.status(davResponse.status).send(errorText || `Upstream WebDAV error ${davResponse.status}`);
    }

    if (method === 'GET') {
      const data = await davResponse.json();
      return response.status(200).json(data);
    } else {
      return response.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('[WebDAV Proxy] Exception:', error);
    return response.status(500).json({ error: 'Server proxy error', message: error.message });
  }
}
