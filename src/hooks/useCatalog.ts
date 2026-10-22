import { useEffect, useState } from 'react';
import type { ProductCatalog } from '../types/product';
import { loadCatalog } from '../services/catalogService';

export function useCatalog() {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(false);
    loadCatalog()
      .then((c) => active && setCatalog(c))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  return { catalog, products: catalog?.products ?? [], error, retry: () => setAttempt((n) => n + 1) };
}
