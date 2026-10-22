import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGeolocation, type GeolocationState } from '../hooks/useGeolocation';

export interface DraftPhoto {
  file: File;
  url: string;
}

interface DraftContextValue {
  geo: GeolocationState;
  photo: DraftPhoto | null;
  setPhotoFile: (file: File | null) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

/** Контекст текущего обследования: фото и местоположение сохраняются при переходах между экранами */
export function DraftProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation();
  const [photo, setPhoto] = useState<DraftPhoto | null>(null);

  const setPhotoFile = useCallback((file: File | null) => {
    setPhoto(file ? { file, url: URL.createObjectURL(file) } : null);
  }, []);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const value = useMemo(() => ({ geo, photo, setPhotoFile }), [geo, photo, setPhotoFile]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft вне DraftProvider');
  return ctx;
}
