export interface RecognitionResult {
  product_name: string | null;
  brand: string | null;
  package_size: string | null;
  shelf_price: number | null;
  currency: 'KZT';
  price_unit: string | null;
  /** id позиции справочника, предложенный моделью (подсказка, проверяется на клиенте) */
  catalog_id: string | null;
  confidence: number;
  needs_confirmation: boolean;
  message: string | null;
}

export type LocationSource = 'gps' | 'test';

export interface InspectionLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  source: LocationSource;
  capturedAt: string;
  accuracy: number | null;
}

export type ComparisonStatus = 'higher' | 'lower' | 'equal' | 'not_comparable';

export interface Inspection {
  id: string;
  createdAt: string;
  productId: string | null;
  productName: string | null;
  brand: string | null;
  packageSize: string | null;
  category: string | null;
  shelfPrice: number | null;
  priceUnit: string | null;
  /** Справочная розничная цена (поле названо так для совместимости со старой историей) */
  expectedPrice: number | null;
  /** Справочная оптовая закупочная цена; в старых записях отсутствует */
  wholesalePrice?: number | null;
  /** Наценка сопоставимой цены к оптовой закупочной, % */
  markup?: number | null;
  expectedUnit: string | null;
  /** Цена на ценнике, приведённая к единице справочника (например, за 1 кг) */
  comparablePrice: number | null;
  difference: number | null;
  percentage: number | null;
  comparison: ComparisonStatus;
  comparisonNote: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  locationSource: LocationSource;
  /** Торговая точка из перечня; в старых записях отсутствует */
  storeId?: string | null;
  storeName?: string | null;
  storeNumber?: number | null;
  locationCapturedAt: string | null;
  status: 'success' | 'needs_confirmation' | 'error';
  confidence: number | null;
  /** Данные исправлены или подтверждены вручную */
  manual: boolean;
  /** Уменьшенная копия фото (data URL) для истории; может отсутствовать */
  photo: string | null;
}
