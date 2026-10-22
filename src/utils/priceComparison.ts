import type { ComparisonStatus } from '../types/inspection';
import type { Product } from '../types/product';
import { t, type MessageKey } from '../i18n';

type BaseUnit = 'kg' | 'l' | 'pcs' | 'pack';

/** Приводит подпись единицы («кг», «за 1 кг», «шт.», «дана», «упаковка», «қаптама») к базовой единице */
export function normalizeUnit(text: string | null | undefined): BaseUnit | null {
  if (!text) return null;
  const u = text.toLowerCase().replace(/ё/g, 'е').replace(/[.\s]|за|үшін|1/g, '');
  if (/^(кг|kg|килограмм)/.test(u)) return 'kg';
  if (/^(л|l)$|^литр/.test(u)) return 'l';
  if (/^(шт|pcs|штук|дана)/.test(u)) return 'pcs';
  if (/^(уп|упаковк|пачк|pack|қаптама)/.test(u)) return 'pack';
  return null;
}

/** Разбирает фасовку («450 г», «0,9 л», «1 кг», «10 шт») в количество базовой единицы */
export function parsePackageSize(text: string | null | undefined): { value: number; unit: 'kg' | 'l' | 'pcs' } | null {
  if (!text) return null;
  const m = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|гр|г|g|мл|ml|л|l|шт|pcs|дана)(?![a-zа-яәіңғүұқөһ])/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (m[2]) {
    case 'кг':
    case 'kg':
      return { value: n, unit: 'kg' };
    case 'г':
    case 'гр':
    case 'g':
      return { value: n / 1000, unit: 'kg' };
    case 'л':
    case 'l':
      return { value: n, unit: 'l' };
    case 'мл':
    case 'ml':
      return { value: n / 1000, unit: 'l' };
    default:
      return { value: n, unit: 'pcs' };
  }
}

export interface ComparisonResult {
  comparablePrice: number | null;
  difference: number | null;
  percentage: number | null;
  /** Наценка к оптовой закупочной цене, % */
  markup: number | null;
  comparison: ComparisonStatus;
  note: string | null;
}

const round = (n: number, digits = 0) => Math.round(n * 10 ** digits) / 10 ** digits;
const UNIT_KEYS = { kg: 'unit.kg', l: 'unit.l', pcs: 'unit.pcs', pack: 'unit.packAcc' } as const satisfies Record<BaseUnit, MessageKey>;
/** Название единицы на текущем языке: «кг», «л», «шт.» / «дана», «упаковку» / «қаптама» */
const unitLabel = (u: BaseUnit) => t(UNIT_KEYS[u]);

const notComparable = (note: string): ComparisonResult => ({
  comparablePrice: null,
  difference: null,
  percentage: null,
  markup: null,
  comparison: 'not_comparable',
  note,
});

/**
 * Сравнивает цену на ценнике с розничной ценой справочника и считает наценку к оптовой закупочной.
 * difference = shelf − retail; percentage = difference / retail × 100; markup = (shelf − wholesale) / wholesale × 100.
 * Несовместимые единицы не сравниваются: цена за упаковку пересчитывается за кг/л только по известной фасовке.
 */
export function comparePrice(
  shelfPrice: number | null,
  priceUnit: string | null,
  packageSize: string | null,
  product: Product | null,
): ComparisonResult {
  if (!product) return notComparable(t('note.noProduct'));
  if (shelfPrice === null || !(shelfPrice > 0)) return notComparable(t('note.noPrice'));

  const target = normalizeUnit(product.unit);
  const given = normalizeUnit(priceUnit);
  let comparable: number | null = null;
  let note: string | null = null;

  if (target === 'kg' || target === 'l') {
    if (given === target) {
      comparable = shelfPrice;
    } else if (given === 'pcs' || (priceUnit && !given)) {
      return notComparable(
        t('note.unitMismatch', { given: priceUnit ?? '', target: unitLabel(target) }),
      );
    } else {
      const pkg = parsePackageSize(packageSize);
      if (pkg && pkg.unit === target) {
        comparable = shelfPrice / pkg.value;
        if (pkg.value !== 1) {
          note = t('note.converted', { target: unitLabel(target), size: packageSize ?? '' });
        }
      } else if (!packageSize) {
        return notComparable(
          t('note.noPackage', { target: unitLabel(target) }),
        );
      } else {
        return notComparable(
          t('note.badPackage', { target: unitLabel(target), size: packageSize ?? '—' }),
        );
      }
    }
  } else {
    // Справочная цена за штуку или упаковку
    if (given === 'kg' || given === 'l') {
      return notComparable(
        t('note.weightVsPack', { given: unitLabel(given), target: unitLabel(target ?? 'pack') }),
      );
    }
    comparable = shelfPrice;
  }

  const comparablePrice = round(comparable, 2);
  const difference = round(comparablePrice - product.retailPrice, 2);
  const percentage = round((difference / product.retailPrice) * 100, 1);
  // Оптовая цена может быть не задана (0) — тогда наценку не считаем
  const markup =
    product.wholesalePrice > 0 ? round(((comparablePrice - product.wholesalePrice) / product.wholesalePrice) * 100, 1) : null;
  return {
    comparablePrice,
    difference,
    percentage,
    markup,
    comparison: difference > 0 ? 'higher' : difference < 0 ? 'lower' : 'equal',
    note,
  };
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₸`;
}

export function formatSigned(value: number, suffix: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}${suffix}`;
}

const COMPARISON_KEYS = {
  higher: 'cmp.higher',
  lower: 'cmp.lower',
  equal: 'cmp.equal',
  not_comparable: 'cmp.notComparable',
} as const satisfies Record<ComparisonStatus, MessageKey>;

/** Итог сравнения на текущем языке: «Выше розничной цены» и т. п. */
export const comparisonLabel = (status: ComparisonStatus) => t(COMPARISON_KEYS[status]);

/** Подпись единицы цены на текущем языке: «за 1 кг», «за упаковку» / «1 кг үшін», «қаптама үшін» */
export function perUnitLabel(unit: string | null | undefined): string {
  if (!unit) return '';
  const base = normalizeUnit(unit);
  if (base === 'pack') return t('unit.perPack');
  if (base) return t('unit.per1', { unit: unitLabel(base) });
  return t('unit.per', { unit });
}

/** Разница цены на ценнике с ориентиром простыми словами: «на 61 ₸ дороже» / «61 ₸ қымбат», «+7,2%» */
export function describeDifference(price: number, reference: number): { text: string; percent: string; sign: -1 | 0 | 1 } {
  const diff = round(price - reference, 2);
  const percent = round((diff / reference) * 100, 1);
  if (diff === 0) return { text: t('diff.same'), percent: '0%', sign: 0 };
  const amount = formatPrice(Math.abs(diff));
  return diff > 0
    ? { text: t('diff.more', { amount }), percent: formatSigned(percent, '%'), sign: 1 }
    : { text: t('diff.less', { amount }), percent: formatSigned(percent, '%'), sign: -1 };
}
