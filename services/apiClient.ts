export const AUTH_SESSION_EXPIRED_EVENT = 'navilink:session-expired';

export class ApiError extends Error {
  constructor(public code: string, public status = 0, public detail = '') {
    super(code);
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  authenticated?: boolean;
}

export const requestJson = async <T>(url: string, { timeoutMs = 15_000, authenticated = true, ...options }: RequestOptions = {}): Promise<T> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  try {
    const response = await fetch(url, { credentials: 'same-origin', ...options, signal });
    if (!response.ok) {
      if (response.status === 401 && authenticated) window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
      const body = await response.json().catch(() => null);
      const code = response.status === 401 ? 'UNAUTHORIZED'
        : response.status === 409 ? 'DATA_CONFLICT'
          : response.status === 429 ? 'RATE_LIMITED'
            : response.status >= 500 ? 'SERVER_ERROR' : typeof body?.code === 'string' ? body.code : 'INVALID_REQUEST';
      throw new ApiError(code, response.status, response.status === 400 && typeof body?.error === 'string' ? body.error : '');
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError(options.method && options.method !== 'GET' ? 'WRITE_TIMEOUT' : 'TIMEOUT');
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    if (error instanceof SyntaxError) throw new ApiError('INVALID_RESPONSE');
    throw new ApiError('NETWORK_ERROR');
  } finally {
    window.clearTimeout(timer);
  }
};

export const apiErrorMessage = (error: unknown, fallback = '操作失败') => {
  if (!(error instanceof ApiError)) return fallback;
  const messages: Record<string, string> = {
    UNAUTHORIZED: '登录已失效，请重新登录',
    PASSWORD_CHANGE_REQUIRED: '请先修改默认密码',
    DATA_CONFLICT: '数据已被其他位置更新，请刷新后再保存',
    RATE_LIMITED: '请求过于频繁，请稍后重试',
    SERVER_ERROR: '服务暂时不可用，请稍后重试',
    TIMEOUT: '请求超时，请重试',
    WRITE_TIMEOUT: '请求超时，保存结果待确认，请重新同步后检查',
    NETWORK_ERROR: '网络连接失败，请检查连接后重试',
    INVALID_RESPONSE: '服务返回的数据无效，请稍后重试',
    INVALID_REQUEST: error.detail || '提交的数据无效，请检查后重试'
  };
  return messages[error.code] || fallback;
};
