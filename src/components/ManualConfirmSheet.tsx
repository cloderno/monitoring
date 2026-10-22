import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../types/product';
import type { ProductFields } from '../utils/inspection';
import { COMPARISON_LABEL, comparePrice, describeDifference, formatPrice, normalizeUnit, perUnitLabel } from '../utils/priceComparison';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  title: string;
  initial: ProductFields;
  catalog: Product[];
  notice?: ReactNode;
  submitLabel?: string;
  onSubmit: (fields: ProductFields) => void;
  onCancel: () => void;
  extraActions?: ReactNode;
}

const PRICE_UNITS = [
  { value: '', label: 'За товар / упаковку' },
  { value: 'кг', label: 'За 1 кг' },
  { value: 'л', label: 'За 1 л' },
  { value: 'шт.', label: 'За 1 шт.' },
];

const clean = (s: string) => s.trim() || null;

const PACKAGE_UNITS = ['г', 'кг', 'мл', 'л', 'шт.'] as const;
type PackageUnit = (typeof PACKAGE_UNITS)[number];

/** Единица фасовки по умолчанию для выбранного товара (масло — литры, яйца — штуки и т. д.) */
function defaultPackageUnit(product: Product | null): PackageUnit {
  if (!product) return 'г';
  const unit = normalizeUnit(product.unit);
  if (unit === 'kg') return 'кг';
  if (unit === 'l') return 'л';
  if (unit === 'pcs' || product.id === 'eggs') return 'шт.';
  return 'г';
}

/** Разбирает распознанную фасовку («10 шт», «0,9 л», «450 гр») на количество и единицу */
function splitPackageSize(text: string | null): { amount: string; unit: PackageUnit | null } {
  if (!text) return { amount: '', unit: null };
  const t = text.toLowerCase().replace(/ё/g, 'е');
  // Сначала число с единицей («С1 10 шт» → 10 шт), иначе просто первое число
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(кг|гр|г|мл|л|шт)(?![a-zа-я])/) ?? t.match(/(\d+(?:[.,]\d+)?)()/);
  if (!m) return { amount: '', unit: null };
  const unit = m[2] === 'гр' ? 'г' : m[2] === 'шт' ? 'шт.' : ((m[2] as PackageUnit) || null);
  return { amount: m[1].replace('.', ','), unit };
}

/** Форма ручного подтверждения или исправления распознанных данных (нижний лист) */
export function ManualConfirmSheet({ title, initial, catalog, notice, submitLabel = 'Продолжить', onSubmit, onCancel, extraActions }: Props) {
  const [productId, setProductId] = useState(initial.productId ?? '');
  const [productName, setProductName] = useState(initial.productName ?? '');
  const [price, setPrice] = useState(initial.shelfPrice !== null ? String(initial.shelfPrice) : '');
  const initialPackage = useMemo(() => splitPackageSize(initial.packageSize), [initial.packageSize]);
  const [packageAmount, setPackageAmount] = useState(initialPackage.amount);
  // null — единица ещё не выбрана, берём подходящую для товара
  const [packageUnitChoice, setPackageUnitChoice] = useState<PackageUnit | null>(initialPackage.unit);
  const [priceUnit, setPriceUnit] = useState(initial.priceUnit ?? '');
  const [touched, setTouched] = useState(false);

  const priceNumber = Number(price.replace(/\s/g, '').replace(',', '.'));
  const priceValid = price.trim() !== '' && Number.isFinite(priceNumber) && priceNumber > 0;
  const product = catalog.find((p) => p.id === productId) ?? null;
  const packageUnit = packageUnitChoice ?? defaultPackageUnit(product);
  const amountNumber = Number(packageAmount.replace(/\s/g, '').replace(',', '.'));
  const packageSize = packageAmount.trim() && Number.isFinite(amountNumber) && amountNumber > 0 ? `${packageAmount.trim()} ${packageUnit}` : '';

  const preview = useMemo(
    () => (priceValid && product ? comparePrice(priceNumber, clean(priceUnit), clean(packageSize), product) : null),
    [priceValid, priceNumber, priceUnit, packageSize, product],
  );

  // Для товаров «за кг / за л» фасовка нужна, чтобы пересчитать цену упаковки
  const perWeightUnit = product ? normalizeUnit(product.unit) : null;
  const packageNeeded = (perWeightUnit === 'kg' || perWeightUnit === 'l') && !clean(priceUnit) && !clean(packageSize);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!priceValid || !product) return;
    onSubmit({
      productId: product.id,
      productName: clean(productName) ?? product.name,
      brand: initial.brand,
      packageSize: clean(packageSize),
      shelfPrice: Math.round(priceNumber * 100) / 100,
      priceUnit: clean(priceUnit),
    });
  };

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onCancel}>
            <X size={22} />
          </button>
        </div>

        {notice}

        <label className="field">
          <span className="field__label">Товар из каталога</span>
          <select
            className={`input${touched && !product ? ' is-invalid' : ''}`}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">— Выберите товар —</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · розн. {formatPrice(p.retailPrice)} {perUnitLabel(p.unit)}
              </option>
            ))}
          </select>
          {touched && !product && <span className="field__hint" style={{ color: 'var(--color-danger)' }}>Выберите товар для сравнения</span>}
        </label>

        <label className="field">
          <span className="field__label">Название товара</span>
          <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Например, Рожки «Макфа»" />
        </label>

        <div className="btn-row">
          <label className="field">
            <span className="field__label">Цена на ценнике, ₸</span>
            <input
              className={`input${touched && !priceValid ? ' is-invalid' : ''}`}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field">
            <span className="field__label">Фасовка</span>
            <span className="input-group">
              <input
                className={`input${packageNeeded && priceValid ? ' is-invalid' : ''}`}
                inputMode="decimal"
                value={packageAmount}
                onChange={(e) => setPackageAmount(e.target.value)}
                placeholder="0"
                aria-label="Количество в упаковке"
              />
              <select
                className="input input-group__unit"
                value={packageUnit}
                onChange={(e) => setPackageUnitChoice(e.target.value as PackageUnit)}
                aria-label="Единица фасовки"
              >
                {PACKAGE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <span className="field__hint" style={{ marginTop: -8 }}>
          {perWeightUnit === 'kg' || perWeightUnit === 'l'
            ? `Фасовка — масса или объём с упаковки (например, 0,9 и ${perWeightUnit === 'l' ? 'л' : 'кг'}). Нужна, чтобы пересчитать цену за 1 ${perWeightUnit === 'l' ? 'л' : 'кг'}.`
            : 'Фасовка — количество с упаковки, единица выбирается справа (например, 10 и шт.).'}
        </span>
        {touched && !priceValid && (
          <span className="field__hint" style={{ color: 'var(--color-danger)', marginTop: -8 }}>
            Укажите цену с ценника — положительное число
          </span>
        )}

        <label className="field">
          <span className="field__label">Цена указана</span>
          <select className="input" value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)}>
            {PRICE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
            {!PRICE_UNITS.some((u) => u.value === priceUnit) && <option value={priceUnit}>За {priceUnit}</option>}
          </select>
        </label>

        {preview && (
          <div className={`delta delta--${preview.comparison}`} style={{ marginTop: 0 }}>
            <div className="delta__main">
              <div className="delta__status">{COMPARISON_LABEL[preview.comparison]}</div>
              <div className="delta__numbers">
                {preview.comparablePrice !== null ? (
                  <>
                    Розница {formatPrice(product!.retailPrice)} {perUnitLabel(product!.unit)}: ценник{' '}
                    <b>{describeDifference(preview.comparablePrice, product!.retailPrice).text}</b> (
                    {describeDifference(preview.comparablePrice, product!.retailPrice).percent})
                    <br />
                    Опт. закупка {formatPrice(product!.wholesalePrice)}: наценка{' '}
                    <b>{preview.markup?.toLocaleString('ru-RU')}%</b>
                  </>
                ) : (
                  preview.note
                )}
              </div>
            </div>
          </div>
        )}

        <PrimaryButton type="submit" size="lg" block>
          {submitLabel}
        </PrimaryButton>
        {extraActions}
      </form>
    </div>
  );
}
