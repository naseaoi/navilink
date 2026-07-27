const readNonNegativeInteger = (value, fallback, max) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};

export const getPublicDataCacheControl = (env = process.env) => {
  const sharedMaxAge = readNonNegativeInteger(env.PUBLIC_DATA_CDN_TTL_SECONDS, 15, 300);
  return `public, max-age=0, must-revalidate, s-maxage=${sharedMaxAge}`;
};

export const isCacheablePublicDataRequest = ({ method, file, fresh }) => (
  method === 'GET'
  && (file === undefined || file === 'public.json')
  && fresh !== '1'
);
