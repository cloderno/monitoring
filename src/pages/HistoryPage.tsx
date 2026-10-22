import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ClipboardList, ImageOff, Search } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCatalog } from '../hooks/useCatalog';
import { dateLocale, useI18n, type MessageKey } from '../i18n';
import type { Inspection } from '../types/inspection';
import { inspectionProductLabel } from '../i18n/labels';
import { useHistory } from '../store/HistoryContext';
import { formatPrice, formatSigned } from '../utils/priceComparison';
import { normalizeText } from '../utils/productMatching';
import { StatusBadge } from './InspectionResultPage';

type StatusFilter = 'all' | 'needs_confirmation' | 'success';

const STATUS_FILTERS: { value: StatusFilter; label: MessageKey }[] = [
  { value: 'all', label: 'history.filterAll' },
  // Короткие подписи, чтобы три фильтра помещались на узком экране
  { value: 'needs_confirmation', label: 'history.filterNeeds' },
  { value: 'success', label: 'history.filterDone' },
];

const matchesStatus = (i: Inspection, filter: StatusFilter) => filter === 'all' || i.status === filter;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export function HistoryPage() {
  const { items } = useHistory();
  const { t } = useI18n();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [status, setStatus] = useState<StatusFilter>('all');

  const list = useMemo(() => {
    const q = normalizeText(query);
    return items
      .filter((i) => matchesStatus(i, status))
      .filter((i) => !q || normalizeText(`${i.productName ?? ''} ${inspectionProductLabel(i.productName, i.productId, products) ?? ''} ${i.brand ?? ''}`).includes(q))
      .sort((a, b) => (order === 'desc' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [items, query, order, status, products]);

  return (
    <>
      <AppHeader title={t('history.title')} subtitle={t('history.total', { n: items.length })} showBack={false} />

      {items.length === 0 ? (
        <div className="empty page-enter">
          <div className="empty__icon">
            <ClipboardList size={32} />
          </div>
          <div className="empty__title">{t('history.emptyTitle')}</div>
          <p>{t('history.emptyText')}</p>
          <PrimaryButton style={{ marginTop: 8 }} onClick={() => navigate('/inspection')}>
            {t('welcome.start')}
          </PrimaryButton>
        </div>
      ) : (
        <div className="screen__body page-enter">
          <div className="toolbar">
            <span className="field__control">
              <span className="field__icon">
                <Search size={18} />
              </span>
              <input
                className="input input--with-icon search"
                placeholder={t('history.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('history.filterAria')}
              />
            </span>
            {/* Сортировка — компактной кнопкой, чтобы поиску хватало места на узком экране */}
            <button
              type="button"
              className="sort-btn"
              onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              aria-label={`${t('history.sortAria')}: ${order === 'desc' ? t('history.newest') : t('history.oldest')}`}
              title={order === 'desc' ? t('history.newest') : t('history.oldest')}
            >
              {order === 'desc' ? <ArrowDownWideNarrow size={20} /> : <ArrowUpNarrowWide size={20} />}
            </button>
          </div>

          <div className="chips" role="radiogroup" aria-label={t('history.statusAria')}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={status === f.value}
                className={`chip${status === f.value ? ' is-active' : ''}${f.value === 'needs_confirmation' ? ' chip--warning' : ''}`}
                onClick={() => setStatus(f.value)}
              >
                <span className="chip__label">{t(f.label)}</span>
                {/* У «Все» число не нужно — общее количество уже в шапке */}
                {f.value !== 'all' && <span className="chip__count">{items.filter((i) => matchesStatus(i, f.value)).length}</span>}
              </button>
            ))}
          </div>

          {list.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 24 }}>{t('common.nothingFound')}</p>}

          {list.map((i, idx) => (
            <Link
              key={i.id}
              to={`/history/${i.id}`}
              className="history-item appear"
              style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
            >
              {i.photo ? (
                <img className="product-thumb" src={i.photo} alt="" />
              ) : (
                <span className="product-thumb">
                  <ImageOff size={20} />
                </span>
              )}
              <div className="history-item__main">
                <div className="history-item__name">{inspectionProductLabel(i.productName, i.productId, products) ?? t('product.unrecognized')}</div>
                <div className="history-item__prices">
                  {formatPrice(i.shelfPrice)} · {t('history.retailShort')} {formatPrice(i.expectedPrice)}
                </div>
                <div className="history-item__meta">
                  <span>{formatDate(i.createdAt)}</span>
                  <span>·</span>
                  <span>{(i.locationSource === 'test' ? t('city.shymkent') : i.city) ?? t('history.noPlace')}</span>
                  {i.locationSource === 'test' && <span className="badge badge--warning" style={{ padding: '1px 6px' }}>{t('history.testShort')}</span>}
                </div>
              </div>
              <div className="history-item__delta">
                {i.percentage !== null && i.difference !== null ? (
                  <>
                    <div className={`text-${i.comparison}`}>{formatSigned(i.percentage, '%')}</div>
                    <div className="small">{formatSigned(i.difference, ' ₸')}</div>
                  </>
                ) : (
                  <StatusBadge status={i.status} />
                )}
              </div>
            </Link>
          ))}

          <p className="small" style={{ textAlign: 'center', marginTop: 8 }}>
            {t('history.footer')}
          </p>
        </div>
      )}
    </>
  );
}
