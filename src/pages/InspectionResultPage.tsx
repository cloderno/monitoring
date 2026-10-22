import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, History, ImageOff, MapPin, PencilLine, Plus, SearchX } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { LocationMap } from '../components/LocationMap';
import { ManualConfirmSheet } from '../components/ManualConfirmSheet';
import { PriceComparisonCard } from '../components/PriceComparisonCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { TEST_WARNING, TestBadge } from '../components/LocationCard';
import { useCatalog } from '../hooks/useCatalog';
import { useHistory } from '../store/HistoryContext';
import { formatCoords, googleMapsUrl } from '../services/geolocationService';
import { buildInspection } from '../utils/inspection';

export const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function StatusBadge({ status }: { status: 'success' | 'needs_confirmation' | 'error' }) {
  if (status === 'success') return <span className="badge badge--success">Выполнено</span>;
  if (status === 'needs_confirmation') return <span className="badge badge--warning">Требует проверки</span>;
  return <span className="badge badge--danger">Ошибка</span>;
}

export function InspectionResultPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { get, update } = useHistory();
  const { products } = useCatalog();
  const [editing, setEditing] = useState(false);
  const fromHistory = pathname.startsWith('/history');
  const inspection = id ? get(id) : undefined;

  if (!inspection) {
    return (
      <>
        <AppHeader title="Результат обследования" backTo={fromHistory ? '/history' : '/'} />
        <div className="empty">
          <div className="empty__icon">
            <SearchX size={32} />
          </div>
          <div className="empty__title">Обследование не найдено</div>
          <p>Возможно, история была очищена в этом браузере.</p>
          <Link to="/history" className="btn btn--secondary" style={{ marginTop: 8 }}>
            Перейти в историю
          </Link>
        </div>
      </>
    );
  }

  const i = inspection;
  const isTest = i.locationSource === 'test';

  return (
    <>
      <AppHeader
        title="Результат обследования"
        subtitle={formatFullDate(i.createdAt)}
        backTo={fromHistory ? '/history' : '/'}
        right={<StatusBadge status={i.status} />}
      />

      <div className="screen__body page-enter">
        <section className="card appear">
          <div className="product-head">
            {i.photo ? (
              <img className="product-thumb" src={i.photo} alt="Фото товара с ценником" />
            ) : (
              <span className="product-thumb">
                <ImageOff size={24} />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="product-name">{i.productName ?? 'Товар не распознан'}</div>
              <div className="muted">
                {[i.brand, i.packageSize].filter(Boolean).join(' · ') || 'Бренд и фасовка не определены'}
              </div>
              <div className="inline" style={{ marginTop: 6 }}>
                {i.category && <span className="badge badge--info">{i.category}</span>}
                {i.manual ? (
                  <span className="badge badge--neutral">Подтверждено вручную</span>
                ) : (
                  i.confidence !== null && (
                    <span className="badge badge--neutral">Уверенность {Math.round(i.confidence * 100)}%</span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <PriceComparisonCard inspection={i} />

        <section className="card appear" style={{ animationDelay: '120ms' }}>
          <div className="card__header">
            <span className="card__icon">
              <MapPin size={20} />
            </span>
            <h2 className="card__title">Место обследования</h2>
            {isTest && <TestBadge />}
          </div>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">Населённый пункт</span>
              <span className="kv__value">{i.city ?? 'Не определён'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Координаты</span>
              <span className="kv__value mono">
                {i.latitude !== null && i.longitude !== null ? formatCoords(i.latitude, i.longitude) : '—'}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Дата и время</span>
              <span className="kv__value">{formatFullDate(i.createdAt)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Источник</span>
              <span className="kv__value">{isTest ? 'Тестовый режим' : 'GPS браузера'}</span>
            </div>
          </div>
          {isTest && (
            <div style={{ marginTop: 10 }}>
              <StatusMessage tone="warning">{TEST_WARNING}</StatusMessage>
            </div>
          )}
          {i.latitude !== null && i.longitude !== null && (
            <div className="stack" style={{ marginTop: 12 }}>
              <LocationMap
                latitude={i.latitude}
                longitude={i.longitude}
                isTest={isTest}
                label={i.city ?? undefined}
                zoom={isTest ? 12 : 15}
              />
              <a className="ext-link" href={googleMapsUrl(i.latitude, i.longitude)} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Открыть в Google Maps
              </a>
            </div>
          )}
        </section>

        <div className="stack">
          <PrimaryButton size="lg" block icon={<Plus size={20} />} onClick={() => navigate('/inspection')}>
            Новое обследование
          </PrimaryButton>
          {!fromHistory && (
            <PrimaryButton variant="secondary" block icon={<History size={18} />} onClick={() => navigate('/history')}>
              Перейти в историю
            </PrimaryButton>
          )}
          <PrimaryButton
            variant="ghost"
            block
            icon={<PencilLine size={18} />}
            onClick={() => setEditing(true)}
            disabled={!products.length}
          >
            Изменить результат
          </PrimaryButton>
        </div>
      </div>

      {editing && (
        <ManualConfirmSheet
          title="Изменить результат"
          initial={i}
          catalog={products}
          submitLabel="Сохранить"
          onCancel={() => setEditing(false)}
          onSubmit={(fields) => {
            update(buildInspection({ base: i, fields, catalog: products, location: null, confidence: null, manual: true, photo: null }));
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
