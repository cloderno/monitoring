import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useCatalog } from '../hooks/useCatalog';
import { formatPrice, perUnitLabel } from '../utils/priceComparison';
import { useI18n } from '../i18n';
import { productLabel } from '../i18n/labels';
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
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = normalizeText(query);
    // Ищем и по русскому, и по казахскому названию
    return products.filter(
      (p) => !q || normalizeText(`${p.name} ${p.nameKk ?? ''} ${p.category} ${p.categoryKk ?? ''}`).includes(q),
    );
  }, [products, query]);

  return (
    <>
      <AppHeader title={t('catalog.title')} subtitle={catalog ? t('catalog.count', { n: products.length }) : undefined} />
      <div className="screen__body page-enter">
        <StatusMessage tone="warning">
          {t('catalog.disclaimer')}
        </StatusMessage>

        <span className="field__control">
          <span className="field__icon">
            <Search size={18} />
          </span>
          <input
            className="input input--with-icon search"
            placeholder={t('catalog.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>

        {error && (
          <StatusMessage
            tone="error"
            title={t('catalog.loadError')}
            actions={
              <PrimaryButton size="sm" variant="secondary" onClick={retry}>
                {t('common.retry')}
              </PrimaryButton>
            }
          />
        )}

        {catalog && (
          <section className="card card--flush appear">
            <div className="product-row product-row--head small">
              <span>{t('catalog.headProduct')}</span>
              <span>{t('catalog.headPrices')}</span>
            </div>
            {list.map((p) => (
              <div key={p.id} className="product-row">
                <span className="product-row__icon" aria-hidden>
                  {EMOJI[p.id] ?? '🛒'}
                </span>
                <div className="product-row__main">
                  <div className="product-row__name">{productLabel(p)}</div>
                  <div className="small">{lang === 'kk' && p.categoryKk ? p.categoryKk : p.category}</div>
                </div>
                <div className="product-row__prices">
                  <div className="product-row__price">
                    {formatPrice(p.retailPrice)}
                    <span className="small"> {perUnitLabel(p.unit)}</span>
                  </div>
                  <div className="small">{t('catalog.wholesaleShort')} {p.wholesalePrice > 0 ? formatPrice(p.wholesalePrice) : '—'}</div>
                </div>
              </div>
            ))}
            {list.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center' }}>{t('common.nothingFound')}</p>}
          </section>
        )}
      </div>
    </>
  );
}
