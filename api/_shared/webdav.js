export const hasWebDavConfig = (env = process.env) => !!(env.WEBDAV_URL && env.WEBDAV_USERNAME && env.WEBDAV_PASSWORD);

export const getWebDavEnv = (env = process.env) => ({
  WEBDAV_URL: env.WEBDAV_URL,
  WEBDAV_USERNAME: env.WEBDAV_USERNAME,
  WEBDAV_PASSWORD: env.WEBDAV_PASSWORD,
  WEBDAV_PATH: env.WEBDAV_PATH
});

export const buildWebDavUrls = (fileName, env = process.env) => {
  const baseUrl = env.WEBDAV_URL.replace(/\/+$/, '');
  const davPath = (env.WEBDAV_PATH || 'navilink').replace(/^\/+|\/+$/g, '');
  return {
    targetUrl: `${baseUrl}/${davPath}/${fileName}`,
    dirUrl: `${baseUrl}/${davPath}/`
  };
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
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Authorization: getWebDavAuthHeader(env) }
  });
  if (response.status === 404) return { data: null, etag: null };
  if (!response.ok) throw createWebDavError(`WebDAV read failed: ${response.status}`, response.status);
  return {
    data: await response.json(),
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
  let response = await fetch(targetUrl, fetchOptions);
  if (response.status === 409) {
    await fetch(dirUrl, { method: 'MKCOL', headers: { Authorization: authHeader } });
    response = await fetch(targetUrl, fetchOptions);
  }
  if (!response.ok) throw createWebDavError(`WebDAV write failed: ${response.status}`, response.status);
};

export const deleteWebDavFile = async (fileName, env = process.env) => {
  const { targetUrl } = buildWebDavUrls(fileName, env);
  const response = await fetch(targetUrl, {
    method: 'DELETE',
    headers: { Authorization: getWebDavAuthHeader(env) }
  });
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
