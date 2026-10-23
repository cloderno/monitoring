import { useEffect, useState } from 'react';
import type { Store, StoreList } from '../types/store';

let cache: Promise<StoreList> | null = null;

function loadStores(): Promise<StoreList> {
  cache ??= fetch('/stores.json')
    .then((r) => {
      if (!r.ok) throw new Error(`stores.json: ${r.status}`);
      return r.json() as Promise<StoreList>;
    })
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}

/** Перечень торговых точек */
export function useStores() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(false);
    loadStores()
      .then((l) => active && setStores(l.stores))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  return { stores: stores ?? [], loaded: stores !== null, error, retry: () => setAttempt((n) => n + 1) };
}
