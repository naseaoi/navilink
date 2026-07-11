export const hasWebDavConfig = (env = process.env) => !!(env.WEBDAV_URL && env.WEBDAV_USERNAME && env.WEBDAV_PASSWORD);

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

const readPositiveInteger = (value, fallback, max) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
};

export const getWebDavEnv = (env = process.env) => ({
  WEBDAV_URL: env.WEBDAV_URL,
  WEBDAV_USERNAME: env.WEBDAV_USERNAME,
  WEBDAV_PASSWORD: env.WEBDAV_PASSWORD,
  WEBDAV_PATH: env.WEBDAV_PATH
});

export const buildWebDavUrls = (fileName, env = process.env) => {
  const parsedBaseUrl = new URL(env.WEBDAV_URL);
  const allowHttp = String(env.WEBDAV_ALLOW_HTTP || '').toLowerCase() === 'true';
  if (parsedBaseUrl.protocol !== 'https:' && !(allowHttp && parsedBaseUrl.protocol === 'http:')) {
    throw new Error('WebDAV URL must use HTTPS');
  }
  const baseUrl = parsedBaseUrl.toString().replace(/\/+$/, '');
  const davPath = (env.WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, '');
  return {
    targetUrl: `${baseUrl}/${davPath}/${fileName}`,
    dirUrl: `${baseUrl}/${davPath}/`
  };
};

export const fetchWebDav = (url, options = {}, env = process.env) => {
  const timeoutMs = readPositiveInteger(env.WEBDAV_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 60_000);
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
};

export const readWebDavBody = async (response, env = process.env) => {
  const maxBytes = readPositiveInteger(env.WEBDAV_MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES, 20 * 1024 * 1024);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('WebDAV response is too large');
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('WebDAV response is too large');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
};

export const readWebDavJson = async (response, env = process.env) => {
  const body = await readWebDavBody(response, env);
  return JSON.parse(body.toString('utf8'));
};

export const getWebDavAuthHeader = (env = process.env) => (
  'Basic ' + Buffer.from(`${env.WEBDAV_USERNAME}:${env.WEBDAV_PASSWORD}`).toString('base64')
);

const createWebDavError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  if (status === 412) {
    error.statusCode = 409;
    error.code = 'VERSION_CONFLICT';
  }
  return error;
};

export const fetchWebDavJson = async (fileName, env = process.env) => {
  const result = await fetchWebDavJsonWithMeta(fileName, env);
  return result.data;
};

export const fetchWebDavJsonWithMeta = async (fileName, env = process.env) => {
  const { targetUrl } = buildWebDavUrls(fileName, env);
  const response = await fetchWebDav(targetUrl, {
    method: 'GET',
    headers: { Authorization: getWebDavAuthHeader(env) }
  }, env);
  if (response.status === 404) return { data: null, etag: null };
  if (!response.ok) throw createWebDavError(`WebDAV read failed: ${response.status}`, response.status);
  return {
    data: await readWebDavJson(response, env),
    etag: response.headers.get('etag')
  };
};

export const putWebDavJson = async (fileName, data, env = process.env, options = {}) => {
  const { targetUrl, dirUrl } = buildWebDavUrls(fileName, env);
  const authHeader = getWebDavAuthHeader(env);
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };
  if (options.ifMatch) headers['If-Match'] = options.ifMatch;
  if (options.ifNoneMatch) headers['If-None-Match'] = '*';
  const fetchOptions = {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  };
  let response = await fetchWebDav(targetUrl, fetchOptions, env);
  if (response.status === 409) {
    await fetchWebDav(dirUrl, { method: 'MKCOL', headers: { Authorization: authHeader } }, env);
    response = await fetchWebDav(targetUrl, fetchOptions, env);
  }
  if (!response.ok) throw createWebDavError(`WebDAV write failed: ${response.status}`, response.status);
};

export const deleteWebDavFile = async (fileName, env = process.env) => {
  const { targetUrl } = buildWebDavUrls(fileName, env);
  const response = await fetchWebDav(targetUrl, {
    method: 'DELETE',
    headers: { Authorization: getWebDavAuthHeader(env) }
  }, env);
  if (response.status === 404) return;
  if (!response.ok) throw createWebDavError(`WebDAV delete failed: ${response.status}`, response.status);
};

export const putWebDavJsonBatch = async ({ entries, originals = {}, env = process.env }) => {
  const committed = [];
  try {
    for (const entry of entries) {
      await putWebDavJson(entry.fileName, entry.data, env, {
        ifMatch: entry.ifMatch,
        ifNoneMatch: entry.ifNoneMatch
      });
      committed.push(entry.fileName);
    }
  } catch (error) {
    for (const fileName of committed.reverse()) {
      const original = originals[fileName];
      try {
        if (original) {
          await putWebDavJson(fileName, original, env);
        } else if (Object.hasOwn(originals, fileName)) {
          await deleteWebDavFile(fileName, env);
        }
      } catch (rollbackError) {
        console.error(`[WebDAV Rollback Error] ${fileName}: ${rollbackError.message}`);
      }
    }
    throw error;
  }
};
