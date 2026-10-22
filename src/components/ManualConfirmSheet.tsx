import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../types/product';
import type { ProductFields } from '../utils/inspection';
import { COMPARISON_LABEL, comparePrice, formatPrice, formatSigned, normalizeUnit } from '../utils/priceComparison';
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

/** Подсказка для поля «Фасовка» в единицах выбранного товара (масло — литры, крупы — кг и т. д.) */
function packagePlaceholder(product: Product | null): string {
  if (!product) return '0 кг / 0 л';
  const unit = normalizeUnit(product.unit);
  if (unit === 'kg') return '0 кг';
  if (unit === 'l') return '0 л';
  if (unit === 'pcs' || product.id === 'eggs') return '0 шт.';
  return '0 г';
}

/** Форма ручного подтверждения или исправления распознанных данных (нижний лист) */
export function ManualConfirmSheet({ title, initial, catalog, notice, submitLabel = 'Продолжить', onSubmit, onCancel, extraActions }: Props) {
  const [productId, setProductId] = useState(initial.productId ?? '');
  const [productName, setProductName] = useState(initial.productName ?? '');
  const [price, setPrice] = useState(initial.shelfPrice !== null ? String(initial.shelfPrice) : '');
  const [packageSize, setPackageSize] = useState(initial.packageSize ?? '');
  const [priceUnit, setPriceUnit] = useState(initial.priceUnit ?? '');
  const [touched, setTouched] = useState(false);

  const priceNumber = Number(price.replace(/\s/g, '').replace(',', '.'));
  const priceValid = price.trim() !== '' && Number.isFinite(priceNumber) && priceNumber > 0;
  const product = catalog.find((p) => p.id === productId) ?? null;

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
          <span className="field__label">Товар из справочника</span>
          <select
            className={`input${touched && !product ? ' is-invalid' : ''}`}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">— Выберите товар —</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · розн. {formatPrice(p.retailPrice)}/{p.unit}
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
            <input
              className={`input${packageNeeded && priceValid ? ' is-invalid' : ''}`}
              value={packageSize}
              onChange={(e) => setPackageSize(e.target.value)}
              placeholder={packagePlaceholder(product)}
            />
          </label>
        </div>
        <span className="field__hint" style={{ marginTop: -8 }}>
          {perWeightUnit === 'kg' || perWeightUnit === 'l'
            ? `Фасовка — масса или объём с упаковки (например, 0,9 ${perWeightUnit === 'l' ? 'л' : 'кг'}). Нужна, чтобы пересчитать цену за 1 ${perWeightUnit === 'l' ? 'л' : 'кг'}.`
            : 'Фасовка — масса, объём или количество с упаковки, если указаны.'}
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
                {preview.difference !== null && preview.percentage !== null
                  ? `${formatSigned(preview.difference, ' ₸')} · ${formatSigned(preview.percentage, '%')} к рознице ${formatPrice(product!.retailPrice)}/${product!.unit}${preview.markup !== null ? ` · наценка к опту ${formatSigned(preview.markup, '%')}` : ''}`
                  : preview.note}
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
