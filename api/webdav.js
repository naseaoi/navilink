export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH } = process.env;

  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const { file } = request.query;
  const fileName = file || 'public.json';
  
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
      fetchOptions.body = JSON.stringify(request.body);
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