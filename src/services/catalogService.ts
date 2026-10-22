import type { ProductCatalog } from '../types/product';

let cache: Promise<ProductCatalog> | null = null;

export function loadCatalog(): Promise<ProductCatalog> {
  cache ??= fetch('/products.json')
    .then((r) => {
      if (!r.ok) throw new Error(`products.json: ${r.status}`);
      return r.json() as Promise<ProductCatalog>;
    })
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}
