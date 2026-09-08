export const createAsyncRoutes = (app) => Object.fromEntries(
  ['get', 'post', 'put', 'all'].map((method) => [method, (route, handler) => app[method](
    route,
    (request, response, next) => Promise.resolve().then(() => handler(request, response, next)).catch(next)
  )])
);

export const sendServerError = (error, _request, response, next) => {
  if (response.headersSent) return next(error);
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error(`[Request Error] ${error?.name || 'Error'}`);
  return response.status(status).json({ error: status === 500 ? 'Internal Server Error' : 'Invalid request' });
};
