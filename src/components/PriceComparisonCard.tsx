import { ArrowDownRight, ArrowUpRight, Equal, Scale } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { useI18n } from '../i18n';
import { packageLabel } from '../i18n/labels';
import type { Inspection } from '../types/inspection';
import { comparePrice, comparisonLabel, describeDifference, formatPrice, perUnitLabel } from '../utils/priceComparison';

const ICONS = { higher: ArrowUpRight, lower: ArrowDownRight, equal: Equal, not_comparable: Scale };
const NBSP = ' ';

/** Ориентир из каталога и разница цены на ценнике с ним */
function ReferenceBox(props: { label: string; price: number | null; unit: string; comparable: number | null }) {
  const { label, price, unit, comparable } = props;
  const { t } = useI18n();
  const diff = price !== null && comparable !== null ? describeDifference(comparable, price) : null;
  const color = !diff ? 'neutral' : diff.sign > 0 ? 'higher' : diff.sign < 0 ? 'lower' : 'equal';

  return (
    <div className="price-box">
      <div className="price-box__label">{label}</div>
      <div className="price-box__value">{formatPrice(price)}</div>
      <div className="price-box__unit">{unit || NBSP}</div>
      {diff && (
        <div className={`price-box__diff price-box__diff--${color}`}>
          <span>{t('cmp.shelfIs', { text: diff.text })}</span>
          {diff.sign !== 0 && <b>{diff.percent}</b>}
        </div>
      )}
    </div>
  );
}

export function PriceComparisonCard({ inspection: i }: { inspection: Inspection }) {
  const { t } = useI18n();
  const { products } = useCatalog();
  const Icon = ICONS[i.comparison];
  const converted = i.comparablePrice !== null && i.shelfPrice !== null && i.comparablePrice !== i.shelfPrice;
  const perUnit = perUnitLabel(i.expectedUnit);
  const shelfUnit = i.priceUnit ? perUnitLabel(i.priceUnit) : i.packageSize ? t('cmp.perPackage', { size: packageLabel(i.packageSize) ?? '' }) : '';

  // В истории пояснение сохранено на языке, который был при проверке, — пересобираем его на текущем
  const product = products.find((p) => p.id === i.productId) ?? null;
  const note = (product && comparePrice(i.shelfPrice, i.priceUnit, i.packageSize, product).note) || i.comparisonNote;

  return (
    <section className="card appear" style={{ animationDelay: '60ms' }}>
      <h2 className="card__title" style={{ marginBottom: 12 }}>
        {t('cmp.title')}
      </h2>
      <div className="price-grid">
        <div className="price-box price-box--shelf">
          <div className="price-box__label">{t('cmp.shelf')}</div>
          <div className="price-box__value">{formatPrice(i.shelfPrice)}</div>
          <div className="price-box__unit">{shelfUnit || NBSP}</div>
          {converted && (
            <div className="price-box__converted">
              = <b>{formatPrice(i.comparablePrice)}</b> {perUnit} {t('cmp.convertedNote')}
            </div>
          )}
        </div>
        <ReferenceBox label={t('cmp.wholesale')} price={i.wholesalePrice ?? null} unit={perUnit} comparable={i.comparablePrice} />
        <ReferenceBox label={t('cmp.retail')} price={i.expectedPrice} unit={perUnit} comparable={i.comparablePrice} />
      </div>

      <div className={`delta delta--${i.comparison}`}>
        <span className="delta__icon">
          <Icon size={22} />
        </span>
        <div className="delta__main">
          <div className="delta__status">{comparisonLabel(i.comparison)}</div>
          {/* Цифры разницы уже показаны в блоках «Опт. закупка» и «Розница»; здесь — только причина, если сравнить нельзя */}
          {i.comparison === 'not_comparable' && note && <div className="delta__numbers">{note}</div>}
        </div>
      </div>

      {converted && note && (
        <p className="small" style={{ marginTop: 10 }}>
          {note}
        </p>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        {t('cmp.disclaimer')}
      </p>
    </section>
  );
}
