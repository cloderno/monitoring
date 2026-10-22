import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useCatalog } from '../hooks/useCatalog';
import { formatPrice, perUnitLabel } from '../utils/priceComparison';
import { normalizeText } from '../utils/productMatching';

const EMOJI: Record<string, string> = {
  flour: '🌾',
  bread: '🍞',
  pasta: '🍝',
  eggs: '🥚',
  buckwheat: '🥣',
  rice: '🍚',
  sugar: '🧂',
  'sunflower-oil': '🌻',
  butter: '🧈',
  beef: '🥩',
  chicken: '🍗',
  milk: '🥛',
  kefir: '🥛',
  'cottage-cheese': '🧀',
  potato: '🥔',
  carrot: '🥕',
  onion: '🧅',
  cabbage: '🥬',
  salt: '🧂',
};

export function ProductsPage() {
  const { catalog, products, error, retry } = useCatalog();
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = normalizeText(query);
    return products.filter((p) => !q || normalizeText(`${p.name} ${p.category}`).includes(q));
  }, [products, query]);

  return (
    <>
      <AppHeader title="Каталог цен СЗПТ" subtitle={catalog ? `${products.length} позиций` : undefined} />
      <div className="screen__body page-enter">
        <StatusMessage tone="warning">
          Демонстрационный каталог цен. Оптовые закупочные и розничные цены условные и не являются официальными или предельными ценами.
        </StatusMessage>

        <span className="field__control">
          <span className="field__icon">
            <Search size={18} />
          </span>
          <input
            className="input input--with-icon search"
            placeholder="Поиск продукта…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>

        {error && (
          <StatusMessage
            tone="error"
            title="Не удалось загрузить каталог цен"
            actions={
              <PrimaryButton size="sm" variant="secondary" onClick={retry}>
                Повторить
              </PrimaryButton>
            }
          />
        )}

        {catalog && (
          <section className="card card--flush appear">
            <div className="product-row product-row--head small">
              <span>Товар</span>
              <span>Розница / опт. закупка</span>
            </div>
            {list.map((p) => (
              <div key={p.id} className="product-row">
                <span className="product-row__icon" aria-hidden>
                  {EMOJI[p.id] ?? '🛒'}
                </span>
                <div className="product-row__main">
                  <div className="product-row__name">{p.name}</div>
                  <div className="small">{p.category}</div>
                </div>
                <div className="product-row__prices">
                  <div className="product-row__price">
                    {formatPrice(p.retailPrice)}
                    <span className="small"> {perUnitLabel(p.unit)}</span>
                  </div>
                  <div className="small">опт {formatPrice(p.wholesalePrice)}</div>
                </div>
              </div>
            ))}
            {list.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Ничего не найдено</p>}
          </section>
        )}
      </div>
    </>
  );
}
