import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { t, useI18n, type MessageKey } from '../i18n';
import { productLabel } from '../i18n/labels';
import type { Product } from '../types/product';
import type { Store } from '../types/store';
import type { ProductFields } from '../utils/inspection';
import { comparePrice, comparisonLabel, describeDifference, formatPrice, normalizeUnit, perUnitLabel } from '../utils/priceComparison';
import { PrimaryButton } from './PrimaryButton';
import { StoreSelect } from './StorePicker';

interface Props {
  title: string;
  initial: ProductFields;
  catalog: Product[];
  stores: Store[];
  initialStore: Store | null;
  notice?: ReactNode;
  submitLabel?: string;
  onSubmit: (fields: ProductFields) => void;
  onCancel: () => void;
  extraActions?: ReactNode;
}

// Значения хранятся по-русски (их понимает разбор единиц), подписи — на текущем языке
const PRICE_UNITS = [
  { value: '', label: () => t('sheet.perItem') },
  { value: 'кг', label: () => t('sheet.per1', { unit: t('unit.kg') }) },
  { value: 'л', label: () => t('sheet.per1', { unit: t('unit.l') }) },
  { value: 'шт.', label: () => t('sheet.per1', { unit: t('unit.pcs') }) },
];

const clean = (s: string) => s.trim() || null;

const PACKAGE_UNITS = ['г', 'кг', 'мл', 'л', 'шт.'] as const;
type PackageUnit = (typeof PACKAGE_UNITS)[number];
const PACKAGE_UNIT_KEYS: Record<PackageUnit, MessageKey> = { г: 'unit.g', кг: 'unit.kg', мл: 'unit.ml', л: 'unit.l', 'шт.': 'unit.pcs' };

/** Единица фасовки по умолчанию для выбранного товара (масло — литры, яйца — штуки и т. д.) */
function defaultPackageUnit(product: Product | null): PackageUnit {
  if (!product) return 'г';
  const unit = normalizeUnit(product.unit);
  if (unit === 'kg') return 'кг';
  if (unit === 'l') return 'л';
  if (unit === 'pcs' || product.id === 'eggs') return 'шт.';
  return 'г';
}

/** Разбирает распознанную фасовку («10 шт», «10 дана», «0,9 л», «450 гр») на количество и единицу */
function splitPackageSize(text: string | null): { amount: string; unit: PackageUnit | null } {
  if (!text) return { amount: '', unit: null };
  const lower = text.toLowerCase().replace(/ё/g, 'е');
  // Сначала число с единицей («С1 10 шт» → 10 шт), иначе просто первое число
  const m =
    lower.match(/(\d+(?:[.,]\d+)?)\s*(кг|гр|г|мл|л|шт|дана)(?![a-zа-яәіңғүұқөһ])/) ?? lower.match(/(\d+(?:[.,]\d+)?)()/);
  if (!m) return { amount: '', unit: null };
  const unit = m[2] === 'гр' ? 'г' : m[2] === 'шт' || m[2] === 'дана' ? 'шт.' : ((m[2] as PackageUnit) || null);
  return { amount: m[1].replace('.', ','), unit };
}

/** Форма ручного подтверждения или исправления распознанных данных (нижний лист) */
export function ManualConfirmSheet({ title, initial, catalog, stores, initialStore, notice, submitLabel, onSubmit, onCancel, extraActions }: Props) {
  const { lang } = useI18n();
  const [store, setStore] = useState<Store | null>(initialStore);
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
    // lang — чтобы пояснение пересобралось на новом языке
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceValid, priceNumber, priceUnit, packageSize, product, lang],
  );

  // Для товаров «за кг / за л» фасовка нужна, чтобы пересчитать цену упаковки
  const perWeightUnit = product ? normalizeUnit(product.unit) : null;
  const packageNeeded = (perWeightUnit === 'kg' || perWeightUnit === 'l') && !clean(priceUnit) && !clean(packageSize);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!priceValid || !product || !store) return;
    onSubmit({
      productId: product.id,
      productName: clean(productName) ?? product.name,
      brand: initial.brand,
      packageSize: clean(packageSize),
      shelfPrice: Math.round(priceNumber * 100) / 100,
      priceUnit: clean(priceUnit),
      store,
    });
  };

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onCancel}>
            <X size={22} />
          </button>
        </div>

        {notice}

        <div className="field">
          <span className="field__label">{t('store.title')}</span>
          <StoreSelect stores={stores} value={store} onChange={setStore} invalid={touched && !store} />
          {touched && !store && <span className="field__hint" style={{ color: 'var(--color-danger)' }}>{t('store.required')}</span>}
        </div>

        <label className="field">
          <span className="field__label">{t('sheet.product')}</span>
          <select
            className={`input${touched && !product ? ' is-invalid' : ''}`}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">{t('sheet.chooseProduct')}</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)} · {t('sheet.retailShort')} {formatPrice(p.retailPrice)} {perUnitLabel(p.unit)}
              </option>
            ))}
          </select>
          {touched && !product && <span className="field__hint" style={{ color: 'var(--color-danger)' }}>{t('sheet.chooseProductHint')}</span>}
        </label>

        <label className="field">
          <span className="field__label">{t('sheet.productName')}</span>
          <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t('sheet.productNamePlaceholder')} />
        </label>

        <div className="btn-row btn-row--fields">
          <label className="field">
            <span className="field__label">{t('sheet.price')}</span>
            <input
              className={`input${touched && !priceValid ? ' is-invalid' : ''}`}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field">
            <span className="field__label">{t('sheet.package')}</span>
            <span className="input-group">
              <input
                className={`input${packageNeeded && priceValid ? ' is-invalid' : ''}`}
                inputMode="decimal"
                value={packageAmount}
                onChange={(e) => setPackageAmount(e.target.value)}
                placeholder="0"
                aria-label={t('sheet.packageAmountAria')}
              />
              <select
                className={`input input-group__unit${packageNeeded && priceValid ? ' is-invalid' : ''}`}
                value={packageUnit}
                onChange={(e) => setPackageUnitChoice(e.target.value as PackageUnit)}
                aria-label={t('sheet.packageUnitAria')}
              >
                {PACKAGE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(PACKAGE_UNIT_KEYS[u])}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <span className="field__hint" style={{ marginTop: -8 }}>
          {perWeightUnit === 'kg' || perWeightUnit === 'l'
            ? t('sheet.hintWeight', { unit: t(perWeightUnit === 'l' ? 'unit.l' : 'unit.kg') })
            : t('sheet.hintCount', { pcs: t('unit.pcs') })}
        </span>
        {touched && !priceValid && (
          <span className="field__hint" style={{ color: 'var(--color-danger)', marginTop: -8 }}>
            {t('sheet.priceInvalid')}
          </span>
        )}

        <label className="field">
          <span className="field__label">{t('sheet.priceUnit')}</span>
          <select className="input" value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)}>
            {PRICE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label()}
              </option>
            ))}
            {!PRICE_UNITS.some((u) => u.value === priceUnit) && <option value={priceUnit}>{t('sheet.perOther', { unit: priceUnit })}</option>}
          </select>
        </label>

        {preview && (
          <div className={`delta delta--${preview.comparison}`} style={{ marginTop: 0 }}>
            <div className="delta__main">
              <div className="delta__status">{comparisonLabel(preview.comparison)}</div>
              <div className="delta__numbers">
                {preview.comparablePrice !== null ? (
                  <>
                    {t('sheet.previewRetail', { price: formatPrice(product!.retailPrice), per: perUnitLabel(product!.unit) })}{' '}
                    <b>{describeDifference(preview.comparablePrice, product!.retailPrice).text}</b> (
                    {describeDifference(preview.comparablePrice, product!.retailPrice).percent})
                    {preview.markup !== null && (
                      <>
                        <br />
                        {t('sheet.previewWholesale', { price: formatPrice(product!.wholesalePrice) })}{' '}
                        <b>{preview.markup.toLocaleString('ru-RU')}%</b>
                      </>
                    )}
                  </>
                ) : (
                  preview.note
                )}
              </div>
            </div>
          </div>
        )}

        <PrimaryButton type="submit" size="lg" block>
          {submitLabel ?? t('common.continue')}
        </PrimaryButton>
        {extraActions}
      </form>
    </div>
  );
}
