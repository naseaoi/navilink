import { buildWebDavUrls, fetchWebDav, getWebDavAuthHeader, readWebDavBody, readWebDavJson } from './webdav.js';

export const proxyWebDavDataFile = async ({ method, fileName, body, env = process.env }) => {
  if (!['GET', 'PUT'].includes(method)) {
    return { status: 405, body: { error: 'Method not allowed' }, json: true };
  }

  const { targetUrl, dirUrl } = buildWebDavUrls(fileName, env);
  const authHeader = getWebDavAuthHeader(env);
  const fetchOptions = {
    method,
    headers: { Authorization: authHeader }
  };

  if (method === 'PUT') {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.headers['Content-Type'] = 'application/json';
  }

  let davResponse = await fetchWebDav(targetUrl, fetchOptions, env);

  if (davResponse.status === 409 && method === 'PUT') {
    const mkcolResponse = await fetchWebDav(dirUrl, {
      method: 'MKCOL',
      headers: { Authorization: authHeader }
    }, env);
    if (mkcolResponse.ok || mkcolResponse.status === 405) {
      davResponse = await fetchWebDav(targetUrl, fetchOptions, env);
    }
  }

  if (davResponse.status === 404 && method === 'GET') {
    return { status: 404, body: { error: 'File not found' }, json: true };
  }

  if (!davResponse.ok) {
    const text = (await readWebDavBody(davResponse, env)).toString('utf8');
    return { status: davResponse.status, body: text || `Upstream WebDAV error ${davResponse.status}`, json: false };
  }

  if (method === 'GET') {
    return { status: 200, body: await readWebDavJson(davResponse, env), json: true };
  }

  return { status: 200, body: { success: true }, json: true };
};
