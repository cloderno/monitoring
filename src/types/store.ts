/** Торговая точка из перечня (public/stores.json) */
export interface Store {
  id: string;
  /** Порядковый номер в перечне — различает точки с одинаковыми названиями */
  number: number;
  name: string;
}

export interface StoreList {
  stores: Store[];
}
