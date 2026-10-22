import { t, type MessageKey } from '../i18n';
import { ApiError } from '../services/apiClient';

const KNOWN = new Set([
  'offline',
  'network',
  'not_configured',
  'rate_limited',
  'unavailable',
  'overloaded',
  'model_unavailable',
  'timeout',
  'bad_response',
  'bad_image',
  'unsupported_format',
  'too_large',
  'unauthorized',
  'too_many_attempts',
]);

/** Заголовок и текст ошибки на текущем языке */
export function describeError(err: unknown): { code: string; title: string; text: string } {
  const code = err instanceof ApiError ? err.code : 'unknown';
  if (import.meta.env.DEV && !(err instanceof ApiError)) console.error(err);
  const key = KNOWN.has(code) ? code : 'unknown';
  return {
    code,
    title: t(`err.${key}.title` as MessageKey),
    text: t(`err.${key}.text` as MessageKey),
  };
}
