import type { Product } from '../types/product';

export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-яәіңғүұқөһ0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export interface ProductMatch {
  product: Product;
  /** high — совпадение по названию; low — только подсказка модели */
  confidence: 'high' | 'low';
}

/** Оценка совпадения: длина самого длинного алиаса, с которого начинается слово названия */
function score(name: string, product: Product): number {
  const words = name.split(' ');
  let best = 0;
  for (const alias of [product.name, ...(product.aliases ?? [])].map(normalizeText)) {
    const hit = alias.includes(' ')
      ? name.includes(alias)
      : words.some((w) => (alias.length <= 3 ? w === alias : w.startsWith(alias)));
    if (hit) best = Math.max(best, alias.length);
  }
  return best;
}

/**
 * Сопоставляет распознанный товар со справочником.
 * Подсказка модели (catalog_id) принимается, если не противоречит названию.
 */
export function matchProduct(
  productName: string | null,
  catalog: Product[],
  hintId: string | null = null,
): ProductMatch | null {
  const hint = hintId ? catalog.find((p) => p.id === hintId) ?? null : null;
  if (!productName) return hint ? { product: hint, confidence: 'low' } : null;

  const name = normalizeText(productName);
  const ranked = catalog
    .map((product) => ({ product, score: score(name, product) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (hint && (ranked.length === 0 || ranked.some((r) => r.product.id === hint.id))) {
    return { product: hint, confidence: ranked.length ? 'high' : 'low' };
  }
  if (ranked.length === 0) return null;
  // Два разных товара с одинаковой оценкой — неоднозначно, просим выбрать вручную
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    return { product: ranked[0].product, confidence: 'low' };
  }
  return { product: ranked[0].product, confidence: 'high' };
}
