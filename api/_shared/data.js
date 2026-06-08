export const ALLOWED_DATA_FILES = new Set(['public.json', 'private.json']);

export const getRequestedDataFile = (file) => {
  const requestedFile = typeof file === 'string' ? file.trim() : 'public.json';
  if (!ALLOWED_DATA_FILES.has(requestedFile)) return null;
  return requestedFile;
};

export const withTimestamp = (fileName, data) => {
  if (!data || !ALLOWED_DATA_FILES.has(fileName)) return data;
  return { ...data, _meta: { ...(data._meta || {}), updatedAt: Date.now() } };
};

export const getUpdatedAt = (data) => {
  if (!data || !data._meta || !data._meta.updatedAt) return null;
  return data._meta.updatedAt;
};
