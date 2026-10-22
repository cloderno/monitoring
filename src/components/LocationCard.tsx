import { Crosshair, ExternalLink, MapPin } from 'lucide-react';
import type { GeolocationState } from '../hooks/useGeolocation';
import { formatCoords, googleMapsUrl } from '../services/geolocationService';
import { LocationMap } from './LocationMap';
import { PrimaryButton } from './PrimaryButton';
import { StatusMessage } from './StatusMessage';

const GEO_ERRORS: Record<string, string> = {
  denied: 'Нет доступа к геолокации. Разрешите доступ в настройках браузера или включите тестовый режим.',
  unavailable: 'Не удалось определить местоположение. Проверьте, что GPS включён, и повторите попытку.',
  timeout: 'Определение местоположения заняло слишком много времени. Повторите попытку или включите тестовый режим.',
  unsupported: 'Браузер не поддерживает геолокацию. Включите тестовый режим.',
  insecure: 'Геолокация доступна только по защищённому соединению (HTTPS). Откройте приложение по HTTPS или включите тестовый режим.',
};

export const TEST_WARNING = 'Используется тестовое местоположение. Эти координаты не отражают фактическое положение устройства.';

export function TestBadge() {
  return <span className="badge badge--test">ТЕСТОВЫЙ РЕЖИМ</span>;
}

/** Карточка «Место обследования» на экране обследования: реальная геолокация или тестовая точка */
export function LocationCard({ geo }: { geo: GeolocationState }) {
  const { location, status, error, isTest, testMode, testChoice } = geo;

  return (
    <section className="card appear">
      <div className="card__header">
        <span className="card__icon">
          <MapPin size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__step">Шаг 1</div>
          <h2 className="card__title">Место обследования</h2>
        </div>
        {isTest && <TestBadge />}
      </div>

      <div className="stack">
        {location ? (
          <div className="location-head">
            <div>
              <div className="location-city">{location.city ?? (isTest ? '' : 'Населённый пункт не определён')}</div>
              <div className="location-coords">{formatCoords(location.latitude, location.longitude)}</div>
              <div className="small">
                {isTest
                  ? 'Источник: тестовый режим'
                  : `Источник: GPS браузера${location.accuracy ? ` · точность ±${location.accuracy} м` : ''}`}
              </div>
            </div>
            <span className={`badge ${isTest ? 'badge--warning' : 'badge--success'}`}>
              {isTest ? 'Тест' : 'Определено'}
            </span>
          </div>
        ) : status === 'loading' ? (
          <div className="inline muted">
            <span className="spinner" style={{ color: 'var(--color-primary)' }} /> Определяем местоположение…
          </div>
        ) : status === 'error' && error ? (
          <StatusMessage tone="error">{GEO_ERRORS[error]}</StatusMessage>
        ) : (
          <div className="muted">Местоположение не определено</div>
        )}

        {location && (
          <>
            <LocationMap
              latitude={location.latitude}
              longitude={location.longitude}
              isTest={isTest}
              label={location.city ?? undefined}
              zoom={isTest ? 12 : 15}
            />
            <a
              className="ext-link"
              href={googleMapsUrl(location.latitude, location.longitude)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> Открыть в Google Maps
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
            {location ? 'Обновить местоположение' : 'Определить местоположение'}
          </PrimaryButton>
        )}

        <label className="switch-row">
          <span>
            <b style={{ fontSize: 14.5 }}>Тестовая геолокация</b>
            <div className="small">Для демонстрации без реального GPS</div>
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
            <div className="segmented" role="radiogroup" aria-label="Источник местоположения">
              <button
                type="button"
                role="radio"
                aria-checked={testChoice === 'real'}
                className={testChoice === 'real' ? 'is-active' : ''}
                onClick={() => geo.setTestChoice('real')}
              >
                Реальное местоположение
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={testChoice === 'shymkent'}
                className={testChoice === 'shymkent' ? 'is-active' : ''}
                onClick={() => geo.setTestChoice('shymkent')}
              >
                Шымкент (тест)
              </button>
            </div>
            {isTest && <StatusMessage tone="warning">{TEST_WARNING}</StatusMessage>}
          </div>
        )}
      </div>
    </section>
  );
}
