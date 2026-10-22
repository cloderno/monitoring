import type { ComparisonStatus } from '../types/inspection';
import type { Product } from '../types/product';

type BaseUnit = 'kg' | 'l' | 'pcs' | 'pack';

/** Приводит подпись единицы («кг», «за 1 кг», «шт.», «упаковка») к базовой единице */
export function normalizeUnit(text: string | null | undefined): BaseUnit | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/ё/g, 'е').replace(/[.\s]|за|1/g, '');
  if (/^(кг|kg|килограмм)/.test(t)) return 'kg';
  if (/^(л|l)$|^литр/.test(t)) return 'l';
  if (/^(шт|pcs|штук)/.test(t)) return 'pcs';
  if (/^(уп|упаковк|пачк|pack)/.test(t)) return 'pack';
  return null;
}

/** Разбирает фасовку («450 г», «0,9 л», «1 кг», «10 шт») в количество базовой единицы */
export function parsePackageSize(text: string | null | undefined): { value: number; unit: 'kg' | 'l' | 'pcs' } | null {
  if (!text) return null;
  const m = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|гр|г|g|мл|ml|л|l|шт|pcs)(?![a-zа-я])/);
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
const unitLabel = { kg: 'кг', l: 'л', pcs: 'шт.', pack: 'упаковку' } as const;

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
  if (!product) return notComparable('Товар не найден в справочнике — выберите его вручную.');
  if (shelfPrice === null || !(shelfPrice > 0)) return notComparable('Цена на ценнике не распознана.');

  const target = normalizeUnit(product.unit);
  const given = normalizeUnit(priceUnit);
  let comparable: number | null = null;
  let note: string | null = null;

  if (target === 'kg' || target === 'l') {
    if (given === target) {
      comparable = shelfPrice;
    } else if (given === 'pcs' || (priceUnit && !given)) {
      return notComparable(
        `Цена указана за «${priceUnit}», а розничная — за 1 ${unitLabel[target]}. Прямое сравнение невозможно.`,
      );
    } else {
      const pkg = parsePackageSize(packageSize);
      if (pkg && pkg.unit === target) {
        comparable = shelfPrice / pkg.value;
        if (pkg.value !== 1) {
          note = `Цена пересчитана за 1 ${unitLabel[target]} исходя из фасовки ${packageSize}.`;
        }
      } else if (!packageSize) {
        return notComparable(
          `Розничная цена указана за 1 ${unitLabel[target]}, а фасовка товара неизвестна. Укажите фасовку для пересчёта.`,
        );
      } else {
        return notComparable(
          `Не удалось привести цену к 1 ${unitLabel[target]}: фасовка «${packageSize ?? '—'}» несовместима с единицей справочника.`,
        );
      }
    }
  } else {
    // Справочная цена за штуку или упаковку
    if (given === 'kg' || given === 'l') {
      return notComparable(
        `Цена указана за 1 ${unitLabel[given]}, а розничная — за ${unitLabel[target ?? 'pack']}. Прямое сравнение невозможно.`,
      );
    }
    comparable = shelfPrice;
  }

  const comparablePrice = round(comparable, 2);
  const difference = round(comparablePrice - product.retailPrice, 2);
  const percentage = round((difference / product.retailPrice) * 100, 1);
  const markup = round(((comparablePrice - product.wholesalePrice) / product.wholesalePrice) * 100, 1);
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

export const COMPARISON_LABEL: Record<ComparisonStatus, string> = {
  higher: 'Выше розничной цены',
  lower: 'Ниже розничной цены',
  equal: 'Совпадает с розничной ценой',
  not_comparable: 'Сравнение невозможно',
};
