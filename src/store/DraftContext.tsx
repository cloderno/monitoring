import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGeolocation, type GeolocationState } from '../hooks/useGeolocation';
import type { Inspection } from '../types/inspection';

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
}

const DraftContext = createContext<DraftContextValue | null>(null);

/** Контекст текущей проверки: фото, местоположение и несохранённый результат сохраняются при переходах между экранами */
export function DraftProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation();
  const [photo, setPhoto] = useState<DraftPhoto | null>(null);
  const [pending, setPending] = useState<Inspection | null>(null);

  const setPhotoFile = useCallback((file: File | null) => {
    setPhoto(file ? { file, url: URL.createObjectURL(file) } : null);
  }, []);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const value = useMemo(() => ({ geo, photo, setPhotoFile, pending, setPending }), [geo, photo, setPhotoFile, pending]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft вне DraftProvider');
  return ctx;
}
