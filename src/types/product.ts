export interface Product {
  id: string;
  name: string;
  /** Название на казахском */
  nameKk?: string;
  category: string;
  categoryKk?: string;
  /** Оптовая закупочная цена */
  wholesalePrice: number;
  /** Розничная цена */
  retailPrice: number;
  unit: string;
  aliases?: string[];
}

export interface ProductCatalog {
  disclaimer: string;
  currency: 'KZT';
  products: Product[];
}
