import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, ImageOff, Search } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { useHistory } from '../store/HistoryContext';
import { formatPrice, formatSigned } from '../utils/priceComparison';
import { normalizeText } from '../utils/productMatching';
import { StatusBadge } from './InspectionResultPage';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export function HistoryPage() {
  const { items } = useHistory();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');

  const list = useMemo(() => {
    const q = normalizeText(query);
    return items
      .filter((i) => !q || normalizeText(`${i.productName ?? ''} ${i.brand ?? ''}`).includes(q))
      .sort((a, b) => (order === 'desc' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [items, query, order]);

  return (
    <>
      <AppHeader title="История проверок" subtitle={`Всего: ${items.length}`} showBack={false} />

      {items.length === 0 ? (
        <div className="empty page-enter">
          <div className="empty__icon">
            <ClipboardList size={32} />
          </div>
          <div className="empty__title">Проверок пока нет</div>
          <p>Результаты проверок будут появляться здесь.</p>
          <PrimaryButton style={{ marginTop: 8 }} onClick={() => navigate('/inspection')}>
            Начать проверку
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
                placeholder="Поиск по товару"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Фильтр по товару"
              />
            </span>
            <select
              className="input"
              value={order}
              onChange={(e) => setOrder(e.target.value as 'desc' | 'asc')}
              aria-label="Сортировка по дате"
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>
          </div>

          {list.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 24 }}>Ничего не найдено</p>}

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
                <div className="history-item__name">{i.productName ?? 'Товар не распознан'}</div>
                <div className="history-item__prices">
                  {formatPrice(i.shelfPrice)} · розн. {formatPrice(i.expectedPrice)}
                </div>
                <div className="history-item__meta">
                  <span>{formatDate(i.createdAt)}</span>
                  <span>·</span>
                  <span>{i.city ?? 'Место не определено'}</span>
                  {i.locationSource === 'test' && <span className="badge badge--warning" style={{ padding: '1px 6px' }}>тест</span>}
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
            Демонстрационная история хранится только в этом браузере и не синхронизируется между устройствами.
          </p>
        </div>
      )}
    </>
  );
}
