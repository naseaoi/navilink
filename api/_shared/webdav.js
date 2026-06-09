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

export const fetchWebDavJson = async (fileName, env = process.env) => {
  const { targetUrl } = buildWebDavUrls(fileName, env);
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Authorization: getWebDavAuthHeader(env) }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`WebDAV read failed: ${response.status}`);
  return response.json();
};

export const putWebDavJson = async (fileName, data, env = process.env) => {
  const { targetUrl, dirUrl } = buildWebDavUrls(fileName, env);
  const authHeader = getWebDavAuthHeader(env);
  const fetchOptions = {
    method: 'PUT',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
  let response = await fetch(targetUrl, fetchOptions);
  if (response.status === 409) {
    await fetch(dirUrl, { method: 'MKCOL', headers: { Authorization: authHeader } });
    response = await fetch(targetUrl, fetchOptions);
  }
  if (!response.ok) throw new Error(`WebDAV write failed: ${response.status}`);
};

export const deleteWebDavFile = async (fileName, env = process.env) => {
  const { targetUrl } = buildWebDavUrls(fileName, env);
  const response = await fetch(targetUrl, {
    method: 'DELETE',
    headers: { Authorization: getWebDavAuthHeader(env) }
  });
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`WebDAV delete failed: ${response.status}`);
};

export const putWebDavJsonBatch = async ({ entries, originals = {}, env = process.env }) => {
  const committed = [];
  try {
    for (const entry of entries) {
      await putWebDavJson(entry.fileName, entry.data, env);
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
