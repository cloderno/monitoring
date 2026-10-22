import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InspectionLocation } from '../types/inspection';
import {
  GeoError,
  getCurrentPosition,
  reverseGeocode,
  testLocation,
  type TestCityId,
} from '../services/geolocationService';

export type GeoStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TestChoice = 'real' | TestCityId;

export interface GeolocationState {
  status: GeoStatus;
  error: GeoError['code'] | null;
  /** Итоговое местоположение обследования (реальное или тестовое — никогда не смешиваются) */
  location: InspectionLocation | null;
  testMode: boolean;
  testChoice: TestChoice;
  isTest: boolean;
  requestGps: () => Promise<void>;
  setTestMode: (on: boolean) => void;
  setTestChoice: (choice: TestChoice) => void;
}

export function useGeolocation(): GeolocationState {
  const [gps, setGps] = useState<InspectionLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<GeoError['code'] | null>(null);
  const [testMode, setTestModeState] = useState(false);
  const [testChoice, setTestChoice] = useState<TestChoice>('shymkent');
  const requestId = useRef(0);

  const isTest = testMode && testChoice !== 'real';
  const testPoint = useMemo(
    () => (testMode && testChoice !== 'real' ? testLocation(testChoice) : null),
    [testMode, testChoice],
  );

  const requestGps = useCallback(async () => {
    const id = ++requestId.current;
    setStatus('loading');
    setError(null);
    try {
      const pos = await getCurrentPosition();
      if (id !== requestId.current) return;
      const loc: InspectionLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        city: null,
        source: 'gps',
        capturedAt: new Date(pos.timestamp).toISOString(),
      };
      setGps(loc);
      setStatus('ready');
      const city = await reverseGeocode(loc.latitude, loc.longitude);
      if (id === requestId.current && city) setGps({ ...loc, city });
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof GeoError ? err.code : 'unavailable');
      setStatus('error');
    }
  }, []);

  // Если доступ к геолокации уже разрешён — определяем местоположение сразу, без лишнего нажатия.
  // В тестовом режиме GPS не запрашивается.
  useEffect(() => {
    if (isTest || gps || status !== 'idle' || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') requestGps();
      })
      .catch(() => undefined);
  }, [isTest, gps, status, requestGps]);

  const setTestMode = useCallback((on: boolean) => {
    setTestModeState(on);
    if (on) setTestChoice('shymkent');
  }, []);

  return {
    status: isTest ? 'ready' : status,
    error: isTest ? null : error,
    location: isTest ? testPoint : gps,
    testMode,
    testChoice,
    isTest,
    requestGps,
    setTestMode,
    setTestChoice,
  };
}
