import type { Inspection, InspectionLocation, RecognitionResult } from '../types/inspection';
import type { Product } from '../types/product';
import { t } from '../i18n';
import { comparePrice } from './priceComparison';
import { matchProduct } from './productMatching';

/** Данные товара, которые пользователь может подтвердить или исправить вручную */
export interface ProductFields {
  productId: string | null;
  productName: string | null;
  brand: string | null;
  packageSize: string | null;
  shelfPrice: number | null;
  priceUnit: string | null;
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Поля из ответа распознавания + сопоставление со справочником */
export function fieldsFromRecognition(r: RecognitionResult, catalog: Product[]) {
  const match = matchProduct(r.product_name, catalog, r.catalog_id);
  const fields: ProductFields = {
    productId: match?.product.id ?? null,
    productName: r.product_name,
    brand: r.brand,
    packageSize: r.package_size,
    shelfPrice: r.shelf_price,
    priceUnit: r.price_unit,
  };
  return { fields, match };
}

/** Причины, по которым результат требует проверки человеком (пустой список — можно сразу показывать результат) */
export function confirmationReasons(r: RecognitionResult, fields: ProductFields, catalog: Product[], matchConfidence: 'high' | 'low' | null) {
  const reasons: string[] = [];
  if (r.message) reasons.push(r.message);
  if (r.shelf_price === null) reasons.push(t('reason.noPrice'));
  if (!r.product_name) reasons.push(t('reason.noProduct'));
  if (r.confidence < 0.7) reasons.push(t('reason.lowConfidence', { n: Math.round(r.confidence * 100) }));
  if (r.product_name && !fields.productId) reasons.push(t('reason.notInCatalog'));
  if (fields.productId && matchConfidence === 'low') reasons.push(t('reason.ambiguous'));
  if (r.needs_confirmation && reasons.length === 0) reasons.push(t('reason.serviceAsks'));
  if (reasons.length === 0) {
    const product = catalog.find((p) => p.id === fields.productId) ?? null;
    const cmp = comparePrice(fields.shelfPrice, fields.priceUnit, fields.packageSize, product);
    if (cmp.comparison === 'not_comparable' && cmp.note) reasons.push(cmp.note);
  }
  return [...new Set(reasons)];
}

export function buildInspection(params: {
  base?: Inspection;
  fields: ProductFields;
  catalog: Product[];
  location: InspectionLocation | null;
  confidence: number | null;
  manual: boolean;
  photo: string | null;
}): Inspection {
  const { base, fields, catalog, location, confidence, manual, photo } = params;
  const product = catalog.find((p) => p.id === fields.productId) ?? null;
  const cmp = comparePrice(fields.shelfPrice, fields.priceUnit, fields.packageSize, product);
  const comparable = cmp.comparison !== 'not_comparable';

  return {
    id: base?.id ?? newId(),
    createdAt: base?.createdAt ?? new Date().toISOString(),
    productId: product?.id ?? null,
    productName: fields.productName || product?.name || null,
    brand: fields.brand,
    packageSize: fields.packageSize,
    category: product?.category ?? null,
    shelfPrice: fields.shelfPrice,
    priceUnit: fields.priceUnit,
    expectedPrice: product?.retailPrice ?? null,
    wholesalePrice: product?.wholesalePrice || null, // 0 — оптовая цена не задана
    markup: cmp.markup,
    expectedUnit: product?.unit ?? null,
    comparablePrice: cmp.comparablePrice,
    difference: cmp.difference,
    percentage: cmp.percentage,
    comparison: cmp.comparison,
    comparisonNote: cmp.note,
    latitude: base ? base.latitude : location?.latitude ?? null,
    longitude: base ? base.longitude : location?.longitude ?? null,
    city: base ? base.city : location?.city ?? null,
    locationSource: base ? base.locationSource : location?.source ?? 'gps',
    locationCapturedAt: base ? base.locationCapturedAt : location?.capturedAt ?? null,
    status: comparable ? 'success' : 'needs_confirmation',
    confidence: base ? base.confidence : confidence,
    manual: manual || Boolean(base?.manual),
    photo: base ? base.photo : photo,
  };
}

export { matchProduct };
