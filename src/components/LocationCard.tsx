import { Crosshair, ExternalLink, MapPin } from 'lucide-react';
import type { GeolocationState } from '../hooks/useGeolocation';
import { useI18n, type MessageKey } from '../i18n';
import { formatCoords, googleMapsUrl } from '../services/geolocationService';
import { LocationMap } from './LocationMap';
import { PrimaryButton } from './PrimaryButton';
import { StatusMessage } from './StatusMessage';

const GEO_ERRORS: Record<string, MessageKey> = {
  denied: 'geoErr.denied',
  unavailable: 'geoErr.unavailable',
  timeout: 'geoErr.timeout',
  unsupported: 'geoErr.unsupported',
  insecure: 'geoErr.insecure',
};

/** Карточка «Место проверки» на экране проверки: реальная геолокация или тестовая точка */
export function LocationCard({ geo }: { geo: GeolocationState }) {
  const { location, status, error, isTest, testMode } = geo;
  const { t } = useI18n();

  return (
    <section className="card appear">
      <div className="card__header">
        <span className="card__icon">
          <MapPin size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__step">{t('loc.step')}</div>
          <h2 className="card__title">{t('loc.title')}</h2>
        </div>
      </div>

      <div className="stack">
        {location ? (
          <div className="location-head">
            <div>
              <div className="location-city">{(isTest ? t('city.shymkent') : location.city) ?? t('loc.cityUnknown')}</div>
              <div className="location-coords">{formatCoords(location.latitude, location.longitude)}</div>
              <div className="small">
                {isTest
                  ? t('loc.sourceTest')
                  : `${t('loc.sourceGps')}${location.accuracy ? t('loc.accuracy', { n: location.accuracy }) : ''}`}
              </div>
            </div>
            {!isTest && <span className="badge badge--success">{t('loc.badgeDetected')}</span>}
          </div>
        ) : status === 'loading' ? (
          <div className="inline muted">
            <span className="spinner" style={{ color: 'var(--color-primary)' }} /> {t('loc.detecting')}
          </div>
        ) : status === 'error' && error ? (
          <StatusMessage tone="error">{t(GEO_ERRORS[error] ?? 'geoErr.unavailable')}</StatusMessage>
        ) : (
          <div className="muted">{t('loc.notDetected')}</div>
        )}

        {location && (
          <>
            <LocationMap
              latitude={location.latitude}
              longitude={location.longitude}
              label={(isTest ? t('city.shymkent') : location.city) ?? undefined}
              zoom={isTest ? 12 : 15}
            />
            <a
              className="ext-link"
              href={googleMapsUrl(location.latitude, location.longitude)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> {t('loc.openMaps')}
            </a>
          </>
        )}

        {!isTest && (
          <PrimaryButton
            variant="secondary"
            block
            loading={status === 'loading'}
            icon={<Crosshair size={18} />}
            onClick={geo.requestGps}
          >
            {location ? t('loc.update') : t('loc.detect')}
          </PrimaryButton>
        )}

        {/* Только переключатель: включён — точка в Шымкенте, выключен — реальный GPS */}
        <div className="switch-row switch-row--bare">
          <span className="switch">
            <input
              type="checkbox"
              role="switch"
              aria-label={t('loc.testTitle')}
              checked={testMode}
              onChange={(e) => geo.setTestMode(e.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </div>
      </div>
    </section>
  );
}
