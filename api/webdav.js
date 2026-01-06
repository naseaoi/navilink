export default async function handler(request, response) {
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD, WEBDAV_PATH } = process.env;

  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const { file } = request.query;
  const fileName = file || 'public.json';
  
  const baseUrl = WEBDAV_URL.replace(/\/+$/, '');
  const path = (WEBDAV_PATH || '/navilink').replace(/^\/*/, '').replace(/\/+$/, '');
  const targetUrl = `${baseUrl}/${path}/${fileName}`;

  const method = request.method;

  try {
    const authHeader = 'Basic ' + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64');
    
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

    const davResponse = await fetch(targetUrl, fetchOptions);

    if (davResponse.status === 404 && method === 'GET') {
      return response.status(404).json({ error: 'File not found' });
    }

    if (!davResponse.ok) {
      const errorText = await davResponse.text();
      console.error(`WebDAV upstream error (${davResponse.status}):`, errorText);
      return response.status(davResponse.status).send(errorText || 'Upstream WebDAV error');
    }

    if (method === 'GET') {
      const data = await davResponse.json();
      return response.status(200).json(data);
    } else {
      return response.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('WebDAV Proxy Exception:', error);
    return response.status(500).json({ error: 'Server proxy error', message: error.message });
  }
}