import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, History, ImageOff, MapPin, PencilLine, Plus, SearchX } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { LocationMap } from '../components/LocationMap';
import { ManualConfirmSheet } from '../components/ManualConfirmSheet';
import { PriceComparisonCard } from '../components/PriceComparisonCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { TestBadge, testWarning } from '../components/LocationCard';
import { useCatalog } from '../hooks/useCatalog';
import { useHistory } from '../store/HistoryContext';
import { formatCoords, googleMapsUrl } from '../services/geolocationService';
import { dateLocale, useI18n } from '../i18n';
import { categoryLabel, inspectionProductLabel, packageLabel } from '../i18n/labels';
import { buildInspection } from '../utils/inspection';

export const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function StatusBadge({ status }: { status: 'success' | 'needs_confirmation' | 'error' }) {
  const { t } = useI18n();
  if (status === 'success') return <span className="badge badge--success">{t('status.success')}</span>;
  if (status === 'needs_confirmation') return <span className="badge badge--warning">{t('status.needs')}</span>;
  return <span className="badge badge--danger">{t('status.error')}</span>;
}

export function InspectionResultPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { get, update } = useHistory();
  const { products } = useCatalog();
  const [editing, setEditing] = useState(false);
  const fromHistory = pathname.startsWith('/history');
  const inspection = id ? get(id) : undefined;

  if (!inspection) {
    return (
      <>
        <AppHeader title={t('result.title')} backTo={fromHistory ? '/history' : '/'} />
        <div className="empty">
          <div className="empty__icon">
            <SearchX size={32} />
          </div>
          <div className="empty__title">{t('result.notFound')}</div>
          <p>{t('result.notFoundText')}</p>
          <Link to="/history" className="btn btn--secondary" style={{ marginTop: 8 }}>
            {t('result.toHistory')}
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
        title={t('result.title')}
        subtitle={formatFullDate(i.createdAt)}
        backTo={fromHistory ? '/history' : '/'}
        right={<StatusBadge status={i.status} />}
      />

      <div className="screen__body page-enter">
        <section className="card appear">
          <div className="product-head">
            {i.photo ? (
              <img className="product-thumb" src={i.photo} alt={t('result.photoAlt')} />
            ) : (
              <span className="product-thumb">
                <ImageOff size={24} />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="product-name">{inspectionProductLabel(i.productName, i.productId, products) ?? t('product.unrecognized')}</div>
              <div className="muted">
                {[i.brand, packageLabel(i.packageSize)].filter(Boolean).join(' · ') || t('result.noBrand')}
              </div>
              <div className="inline" style={{ marginTop: 6 }}>
                {i.category && <span className="badge badge--info">{categoryLabel(i.category, products)}</span>}
                {i.manual ? (
                  <span className="badge badge--neutral">{t('result.manual')}</span>
                ) : (
                  i.confidence !== null && (
                    <span className="badge badge--neutral">{t('result.confidence', { n: Math.round(i.confidence * 100) })}</span>
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
            <h2 className="card__title">{t('result.place')}</h2>
            {isTest && <TestBadge />}
          </div>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">{t('result.city')}</span>
              <span className="kv__value">{(isTest ? t('city.shymkent') : i.city) ?? t('result.cityUnknown')}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('result.coords')}</span>
              <span className="kv__value mono">
                {i.latitude !== null && i.longitude !== null ? formatCoords(i.latitude, i.longitude) : '—'}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('result.dateTime')}</span>
              <span className="kv__value">{formatFullDate(i.createdAt)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('result.source')}</span>
              <span className="kv__value">{isTest ? t('result.sourceTest') : t('result.sourceGps')}</span>
            </div>
          </div>
          {isTest && (
            <div style={{ marginTop: 10 }}>
              <StatusMessage tone="warning">{testWarning()}</StatusMessage>
            </div>
          )}
          {i.latitude !== null && i.longitude !== null && (
            <div className="stack" style={{ marginTop: 12 }}>
              <LocationMap
                latitude={i.latitude}
                longitude={i.longitude}
                isTest={isTest}
                label={(isTest ? t('city.shymkent') : i.city) ?? undefined}
                zoom={isTest ? 12 : 15}
              />
              <a className="ext-link" href={googleMapsUrl(i.latitude, i.longitude)} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> {t('loc.openMaps')}
              </a>
            </div>
          )}
        </section>

        <div className="stack">
          <PrimaryButton size="lg" block icon={<Plus size={20} />} onClick={() => navigate('/inspection')}>
            {t('result.new')}
          </PrimaryButton>
          {!fromHistory && (
            <PrimaryButton variant="secondary" block icon={<History size={18} />} onClick={() => navigate('/history')}>
              {t('result.toHistory')}
            </PrimaryButton>
          )}
          <PrimaryButton
            variant="ghost"
            block
            icon={<PencilLine size={18} />}
            onClick={() => setEditing(true)}
            disabled={!products.length}
          >
            {t('result.edit')}
          </PrimaryButton>
        </div>
      </div>

      {editing && (
        <ManualConfirmSheet
          title={t('result.edit')}
          initial={i}
          catalog={products}
          submitLabel={t('common.save')}
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
