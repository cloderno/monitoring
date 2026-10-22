import type { RecognitionResult } from '../types/inspection';
import { ApiError, apiRequest } from './apiClient';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Повторная проверка структуры и типов ответа перед использованием в интерфейсе */
export function parseRecognition(raw: unknown): RecognitionResult {
  if (!raw || typeof raw !== 'object') throw new ApiError('bad_response');
  const r = raw as Record<string, unknown>;
  const price = r.shelf_price;
  if (price !== null && price !== undefined && (typeof price !== 'number' || !Number.isFinite(price))) {
    throw new ApiError('bad_response');
  }
  const confidence = typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : 0;
  const result: RecognitionResult = {
    product_name: str(r.product_name),
    brand: str(r.brand),
    package_size: str(r.package_size),
    shelf_price: typeof price === 'number' && price > 0 ? price : null,
    currency: 'KZT',
    price_unit: str(r.price_unit),
    catalog_id: str(r.catalog_id),
    confidence: Math.min(1, Math.max(0, confidence)),
    needs_confirmation: r.needs_confirmation === true,
    message: str(r.message),
  };
  if (result.shelf_price === null || result.product_name === null || result.confidence < 0.7) {
    result.needs_confirmation = true;
  }
  return result;
}

export async function recognizePhoto(
  token: string,
  image: { base64: string; mimeType: string },
  /** Язык пояснений модели (поле message) */
  lang: 'ru' | 'kk',
  signal?: AbortSignal,
): Promise<RecognitionResult> {
  const data = await apiRequest<{ result: unknown }>('/api/recognize', {
    method: 'POST',
    token,
    signal,
    body: JSON.stringify({ image: image.base64, mimeType: image.mimeType, lang }),
  });
  return parseRecognition(data.result);
}
