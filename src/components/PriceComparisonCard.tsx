import { ArrowDownRight, ArrowUpRight, Equal, Scale } from 'lucide-react';
import type { Inspection } from '../types/inspection';
import { COMPARISON_LABEL, formatPrice, formatSigned } from '../utils/priceComparison';

const ICONS = { higher: ArrowUpRight, lower: ArrowDownRight, equal: Equal, not_comparable: Scale };
const NBSP = ' ';

export function PriceComparisonCard({ inspection: i }: { inspection: Inspection }) {
  const Icon = ICONS[i.comparison];
  const converted = i.comparablePrice !== null && i.shelfPrice !== null && i.comparablePrice !== i.shelfPrice;
  const perUnit = i.expectedUnit ? `за ${i.expectedUnit}` : NBSP;

  return (
    <section className="card appear" style={{ animationDelay: '60ms' }}>
      <h2 className="card__title" style={{ marginBottom: 12 }}>
        Сравнение цен
      </h2>
      <div className="price-grid">
        <div className="price-box price-box--shelf">
          <div className="price-box__label">Цена на ценнике</div>
          <div className="price-box__value">{formatPrice(i.shelfPrice)}</div>
          <div className="price-box__unit">
            {i.priceUnit ? `за ${i.priceUnit}` : i.packageSize ? `за упаковку ${i.packageSize}` : NBSP}
          </div>
        </div>
        <div className="price-box">
          <div className="price-box__label">Опт. закупка</div>
          <div className="price-box__value">{formatPrice(i.wholesalePrice ?? null)}</div>
          <div className="price-box__unit">{perUnit}</div>
        </div>
        <div className="price-box">
          <div className="price-box__label">Розница</div>
          <div className="price-box__value">{formatPrice(i.expectedPrice)}</div>
          <div className="price-box__unit">{perUnit}</div>
        </div>
      </div>

      <div className={`delta delta--${i.comparison}`}>
        <span className="delta__icon">
          <Icon size={22} />
        </span>
        <div className="delta__main">
          <div className="delta__status">{COMPARISON_LABEL[i.comparison]}</div>
          {i.difference !== null && i.percentage !== null ? (
            <div className="delta__numbers">
              К рознице <b>{formatSigned(i.difference, ' ₸')}</b> · <b>{formatSigned(i.percentage, '%')}</b>
              {i.markup != null && (
                <>
                  <br />
                  Наценка к опт. закупке <b>{formatSigned(i.markup, '%')}</b>
                </>
              )}
            </div>
          ) : (
            i.comparisonNote && <div className="delta__numbers">{i.comparisonNote}</div>
          )}
        </div>
      </div>

      {converted && (
        <p className="small" style={{ marginTop: 10 }}>
          {i.comparisonNote} Сопоставимая цена: {formatPrice(i.comparablePrice)} за {i.expectedUnit}.
        </p>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        Сравнение выполнено с демонстрационными ценами справочника и не является выводом о нарушении.
      </p>
    </section>
  );
}
