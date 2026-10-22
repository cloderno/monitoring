import { Crosshair, ExternalLink, MapPin } from 'lucide-react';
import type { GeolocationState } from '../hooks/useGeolocation';
import { t, useI18n, type MessageKey } from '../i18n';
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

/** Предупреждение о тестовом местоположении на текущем языке */
export const testWarning = () => t('loc.testWarning');

export function TestBadge() {
  const { t } = useI18n();
  return <span className="badge badge--test">{t('loc.testBadge')}</span>;
}

/** Карточка «Место проверки» на экране проверки: реальная геолокация или тестовая точка */
export function LocationCard({ geo }: { geo: GeolocationState }) {
  const { location, status, error, isTest, testMode, testChoice } = geo;
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
        {isTest && <TestBadge />}
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
            <span className={`badge ${isTest ? 'badge--warning' : 'badge--success'}`}>
              {isTest ? t('loc.badgeTest') : t('loc.badgeDetected')}
            </span>
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
              isTest={isTest}
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

        <label className="switch-row">
          <span>
            <b style={{ fontSize: 14.5 }}>{t('loc.testTitle')}</b>
            <div className="small">{t('loc.testHint')}</div>
          </span>
          <span className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={testMode}
              onChange={(e) => geo.setTestMode(e.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </label>

        {testMode && (
          <div className="stack reveal">
            <div className="segmented" role="radiogroup" aria-label={t('loc.sourceAria')}>
              <button
                type="button"
                role="radio"
                aria-checked={testChoice === 'real'}
                className={testChoice === 'real' ? 'is-active' : ''}
                onClick={() => geo.setTestChoice('real')}
              >
                {t('loc.real')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={testChoice === 'shymkent'}
                className={testChoice === 'shymkent' ? 'is-active' : ''}
                onClick={() => geo.setTestChoice('shymkent')}
              >
                {t('loc.shymkentTest')}
              </button>
            </div>
            {isTest && <StatusMessage tone="warning">{testWarning()}</StatusMessage>}
          </div>
        )}
      </div>
    </section>
  );
}
