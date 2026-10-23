import { useMemo } from 'react';
import { useI18n } from '../i18n';
import type { Store } from '../types/store';
import { Combobox } from './Combobox';

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

/** Поле «Торговая точка» — список с поиском по названию или номеру, по алфавиту */
export function StoreSelect({ stores, value, onChange, invalid, disabled }: Props) {
  const { t } = useI18n();
  const options = useMemo(
    () =>
      [...stores]
        .sort((a, b) => collator.compare(a.name, b.name) || a.number - b.number)
        .map((s) => ({ value: s.id, label: storeLabel(s.name, s.number, stores), keywords: String(s.number) })),
    [stores],
  );

  return (
    <Combobox
      options={options}
      value={value?.id ?? ''}
      onChange={(id) => {
        const store = stores.find((s) => s.id === id);
        if (store) onChange(store);
      }}
      placeholder={t('store.choose')}
      ariaLabel={t('store.title')}
      invalid={invalid}
      disabled={disabled}
    />
  );
}
