import { createIconProxyHandler } from '../server/iconProxy.js';

const handler = createIconProxyHandler();

export default function iconProxyHandler(request, response) {
  const forwarded = request.headers['x-vercel-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    request.ip = forwarded.split(',')[0].trim();
  }
  return handler(request, response);
}
