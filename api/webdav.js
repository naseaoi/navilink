export default async function handler(request, response) {
  // 从服务器端环境变量获取配置 (Vercel Dashboard 中配置的变量)
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH } = process.env;

  if (!WEBDAV_URL) {
    return response.status(500).json({ error: 'WebDAV environment variables not configured on server.' });
  }

  // 获取请求参数
  const { file } = request.query;
  const fileName = file || 'public.json'; // 默认为 public.json
  
  // 拼接目标 URL
  // 确保 WEBDAV_URL 结尾有斜杠，WEBDAV_PATH 开头有斜杠（简单处理）
  const baseUrl = WEBDAV_URL.replace(/\/+$/, '');
  const path = (WEBDAV_PATH || '/navilink').replace(/\/+$/, '');
  const targetUrl = `${baseUrl}${path}/${fileName}`;

  const method = request.method;

  try {
    const authHeader = 'Basic ' + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64');
    
    const fetchOptions = {
      method: method,
      headers: {
        'Authorization': authHeader,
      }
    };

    // 如果是 PUT 请求，需要把 Body 传过去
    if (method === 'PUT') {
      fetchOptions.body = JSON.stringify(request.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const davResponse = await fetch(targetUrl, fetchOptions);

    // 处理 WebDAV 返回的状态
    if (davResponse.status === 404 && method === 'GET') {
      return response.status(404).json({ error: 'File not found' });
    }

    if (!davResponse.ok) {
       const text = await davResponse.text();
       return response.status(davResponse.status).send(text);
    }

    if (method === 'GET') {
      const data = await davResponse.json();
      return response.status(200).json(data);
    } else {
      return response.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('WebDAV Proxy Error:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}