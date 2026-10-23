import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGeolocation, type GeolocationState } from '../hooks/useGeolocation';
import type { Inspection } from '../types/inspection';
import type { Store } from '../types/store';

export interface DraftPhoto {
  file: File;
  url: string;
}

interface DraftContextValue {
  geo: GeolocationState;
  photo: DraftPhoto | null;
  setPhotoFile: (file: File | null) => void;
  /** Готовый, но ещё не сохранённый результат: в историю попадает только по кнопке «Сохранить результат» */
  pending: Inspection | null;
  setPending: (inspection: Inspection | null) => void;
  /** Выбранная торговая точка — запоминается до смены, чтобы не выбирать её для каждого товара */
  store: Store | null;
  setStore: (store: Store) => void;
}

const STORE_KEY = 'szpt.store';

function readStore(): Store | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

const DraftContext = createContext<DraftContextValue | null>(null);

/** Контекст текущей проверки: фото, местоположение и несохранённый результат сохраняются при переходах между экранами */
export function DraftProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation();
  const [photo, setPhoto] = useState<DraftPhoto | null>(null);
  const [pending, setPending] = useState<Inspection | null>(null);
  const [store, setStoreState] = useState<Store | null>(readStore);

  const setStore = useCallback((s: Store) => {
    setStoreState(s);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {
      // выбор сохранится только до перезагрузки
    }
  }, []);

  const setPhotoFile = useCallback((file: File | null) => {
    setPhoto(file ? { file, url: URL.createObjectURL(file) } : null);
  }, []);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const value = useMemo(
    () => ({ geo, photo, setPhotoFile, pending, setPending, store, setStore }),
    [geo, photo, setPhotoFile, pending, store, setStore],
  );
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft вне DraftProvider');
  return ctx;
}
