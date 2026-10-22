/** Ошибка API с кодом, понятным интерфейсу (тексты — в utils/errorMessages.ts) */
export class ApiError extends Error {
  constructor(public code: string, public status = 0) {
    super(code);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('offline');
  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error('[api]', path, err);
    throw new ApiError('network');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (import.meta.env.DEV) console.error('[api]', path, response.status, data);
    throw new ApiError(typeof data?.error === 'string' ? data.error : 'server_error', response.status);
  }
  return data as T;
}
