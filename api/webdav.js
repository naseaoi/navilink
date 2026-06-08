import { getAuthPayload, normalizePrivateData } from './_shared/auth.js';
import { getRequestedDataFile, withTimestamp } from './_shared/data.js';
import { buildWebDavUrls, getWebDavAuthHeader, hasWebDavConfig } from './_shared/webdav.js';

export default async function handler(request, response) {
  const { AUTH_SECRET } = process.env;

  if (!hasWebDavConfig()) {
    return response.status(500).json({ error: 'WebDAV environment variables are missing on Vercel.' });
  }

  const { file } = request.query;
  const fileName = getRequestedDataFile(file);
  if (!fileName) {
    return response.status(400).json({ error: 'Invalid file parameter' });
  }

  const isPrivate = fileName === 'private.json';
  const isWrite = request.method === 'PUT';

  if (isPrivate || isWrite) {
    if (!AUTH_SECRET) return response.status(500).json({ error: 'AUTH_SECRET is missing.' });
    const payload = getAuthPayload(request, AUTH_SECRET);
    if (!payload) return response.status(401).json({ error: 'Unauthorized' });
  }
  
  const { targetUrl, dirUrl } = buildWebDavUrls(fileName);

  console.log(`[WebDAV Proxy] Method: ${request.method}, Target: ${targetUrl}`);

  const method = request.method;
  const authHeader = getWebDavAuthHeader();

  try {
    const fetchOptions = {
      method: method,
      headers: {
        'Authorization': authHeader,
      }
    };

    if (method === 'PUT') {
      const bodyData = isPrivate ? normalizePrivateData(request.body) : request.body;
      const stamped = withTimestamp(fileName, bodyData);
      fetchOptions.body = JSON.stringify(stamped);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    let davResponse = await fetch(targetUrl, fetchOptions);

    if (davResponse.status === 409 && method === 'PUT') {
      console.log(`[WebDAV Proxy] Got 409, attempting to create directory: ${dirUrl}`);
      const mkcolResponse = await fetch(dirUrl, {
        method: 'MKCOL',
        headers: { 'Authorization': authHeader }
      });
      
      if (mkcolResponse.ok || mkcolResponse.status === 405) {
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
