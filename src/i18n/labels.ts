import type { Product } from '../types/product';
import { getLang, t } from './index';

/** Название товара каталога на текущем языке */
export const productLabel = (p: Product) => (getLang() === 'kk' && p.nameKk ? p.nameKk : p.name);

/** Категория на текущем языке. В истории хранится русское название — переводим по каталогу */
export function categoryLabel(category: string, catalog: Product[]): string {
  if (getLang() !== 'kk') return category;
  return catalog.find((p) => p.category === category && p.categoryKk)?.categoryKk ?? category;
}

/**
 * Название товара в проверке. Если оно взято из каталога (совпадает с русским названием позиции) —
 * показываем перевод; распознанное с упаковки название оставляем как есть.
 */
export function inspectionProductLabel(name: string | null, productId: string | null, catalog: Product[]): string | null {
  if (!name) return null;
  const product = productId ? catalog.find((p) => p.id === productId) : undefined;
  return product && product.name === name ? productLabel(product) : name;
}

/** Роль пользователя приходит с сервера по-русски */
export const roleLabel = (role: string) => (role === 'Инспектор мониторинга цен' ? t('role.inspector') : role);

/** Фасовка для показа: внутри хранится по-русски («10 шт.»), на казахском показываем «10 дана» */
export const packageLabel = (size: string | null) =>
  size && getLang() === 'kk' ? size.replace(/шт\.?(?![а-яё])/gi, t('unit.pcs')) : size;
