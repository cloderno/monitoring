import { ArrowDownRight, ArrowUpRight, Equal, Scale } from 'lucide-react';
import type { Inspection } from '../types/inspection';
import { COMPARISON_LABEL, describeDifference, formatPrice, perUnitLabel } from '../utils/priceComparison';

const ICONS = { higher: ArrowUpRight, lower: ArrowDownRight, equal: Equal, not_comparable: Scale };
const NBSP = ' ';

/** Ориентир из каталога и разница цены на ценнике с ним */
function ReferenceBox(props: { label: string; price: number | null; unit: string; comparable: number | null }) {
  const { label, price, unit, comparable } = props;
  const diff = price !== null && comparable !== null ? describeDifference(comparable, price) : null;
  const color = !diff ? 'neutral' : diff.sign > 0 ? 'higher' : diff.sign < 0 ? 'lower' : 'equal';

  return (
    <div className="price-box">
      <div className="price-box__label">{label}</div>
      <div className="price-box__value">{formatPrice(price)}</div>
      <div className="price-box__unit">{unit || NBSP}</div>
      {diff && (
        <div className={`price-box__diff price-box__diff--${color}`}>
          <span>Ценник {diff.text}</span>
          {diff.sign !== 0 && <b>{diff.percent}</b>}
        </div>
      )}
    </div>
  );
}

export function PriceComparisonCard({ inspection: i }: { inspection: Inspection }) {
  const Icon = ICONS[i.comparison];
  const converted = i.comparablePrice !== null && i.shelfPrice !== null && i.comparablePrice !== i.shelfPrice;
  const perUnit = perUnitLabel(i.expectedUnit);
  const shelfUnit = i.priceUnit ? perUnitLabel(i.priceUnit) : i.packageSize ? `за упаковку ${i.packageSize}` : '';

  return (
    <section className="card appear" style={{ animationDelay: '60ms' }}>
      <h2 className="card__title" style={{ marginBottom: 12 }}>
        Сравнение цен
      </h2>
      <div className="price-grid">
        <div className="price-box price-box--shelf">
          <div className="price-box__label">Цена на ценнике</div>
          <div className="price-box__value">{formatPrice(i.shelfPrice)}</div>
          <div className="price-box__unit">{shelfUnit || NBSP}</div>
          {converted && (
            <div className="price-box__converted">
              = <b>{formatPrice(i.comparablePrice)}</b> {perUnit} — эту цену сравниваем с каталогом
            </div>
          )}
        </div>
        <ReferenceBox label="Опт. закупка" price={i.wholesalePrice ?? null} unit={perUnit} comparable={i.comparablePrice} />
        <ReferenceBox label="Розница" price={i.expectedPrice} unit={perUnit} comparable={i.comparablePrice} />
      </div>

      <div className={`delta delta--${i.comparison}`}>
        <span className="delta__icon">
          <Icon size={22} />
        </span>
        <div className="delta__main">
          <div className="delta__status">{COMPARISON_LABEL[i.comparison]}</div>
          {/* Цифры разницы уже показаны в блоках «Опт. закупка» и «Розница»; здесь — только причина, если сравнить нельзя */}
          {i.comparison === 'not_comparable' && i.comparisonNote && <div className="delta__numbers">{i.comparisonNote}</div>}
        </div>
      </div>

      {converted && i.comparisonNote && (
        <p className="small" style={{ marginTop: 10 }}>
          {i.comparisonNote}
        </p>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        Сравнение выполнено с демонстрационными ценами каталога и не является выводом о нарушении.
      </p>
    </section>
  );
}
