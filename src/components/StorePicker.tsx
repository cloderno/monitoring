import { useMemo } from 'react';
import { useI18n } from '../i18n';
import type { Store } from '../types/store';

interface Props {
  stores: Store[];
  value: Store | null;
  onChange: (store: Store) => void;
  invalid?: boolean;
  disabled?: boolean;
}

// Казахская сортировка ставит ә, ғ, қ, ң, ө, ұ, ү, һ, і рядом с похожими русскими буквами
const collator = new Intl.Collator('kk', { sensitivity: 'base', numeric: true });

/** Название точки; у одинаковых названий («Магазин», «Зере») добавляем номер из перечня */
export function storeLabel(name: string, number: number | null | undefined, stores: Store[]) {
  const duplicates = stores.filter((s) => s.name === name).length > 1;
  return duplicates && number ? `${name} · № ${number}` : name;
}

/** Поле «Торговая точка» — обычный выпадающий список, как выбор товара из каталога, по алфавиту */
export function StoreSelect({ stores, value, onChange, invalid, disabled }: Props) {
  const { t } = useI18n();
  const sorted = useMemo(() => [...stores].sort((a, b) => collator.compare(a.name, b.name) || a.number - b.number), [stores]);

  return (
    <select
      className={`input${invalid ? ' is-invalid' : ''}`}
      value={value?.id ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const store = stores.find((s) => s.id === e.target.value);
        if (store) onChange(store);
      }}
    >
      <option value="" disabled>
        {t('store.choose')}
      </option>
      {sorted.map((s) => (
        <option key={s.id} value={s.id}>
          {storeLabel(s.name, s.number, stores)}
        </option>
      ))}
    </select>
  );
}
