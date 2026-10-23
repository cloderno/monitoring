import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n';
import { normalizeText } from '../utils/productMatching';

export interface ComboOption {
  value: string;
  label: string;
  /** Вторая строка мелким шрифтом (цена, номер) */
  hint?: string;
  /** Дополнительный текст для поиска: казахское название, синонимы, номер */
  keywords?: string;
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Выпадающий список с поиском. В покое выглядит как обычный select;
 * по нажатию в поле можно печатать, список под ним фильтруется. Выбрать можно только вариант из списка.
 */
export function Combobox({ options, value, onChange, placeholder, invalid, disabled, ariaLabel }: Props) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const indexed = useMemo(
    () => options.map((o) => ({ option: o, label: normalizeText(o.label), text: normalizeText(`${o.label} ${o.keywords ?? ''}`) })),
    [options],
  );

  const filtered = useMemo(() => {
    const words = normalizeText(query).split(' ').filter(Boolean);
    if (!words.length) return options;
    const hits = indexed.filter((o) => words.every((w) => o.text.includes(w)));
    // Совпадение с началом названия — выше остальных
    const first = words[0];
    return [...hits.filter((o) => o.label.startsWith(first)), ...hits.filter((o) => !o.label.startsWith(first))].map((o) => o.option);
  }, [indexed, options, query]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    const idx = options.findIndex((o) => o.value === value);
    setActive(Math.max(0, idx));
    // На телефоне клавиатура закрывает низ экрана — поднимаем поле, чтобы список было видно
    window.setTimeout(() => rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (o: ComboOption) => {
    onChange(o.value);
    close();
    inputRef.current?.blur();
  };

  // Клик мимо — закрываем, выбор не меняется
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Подсвеченный вариант всегда в зоне видимости списка
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div className={`combo${open ? ' is-open' : ''}`} ref={rootRef}>
      <input
        ref={inputRef}
        className={`input combo__input${invalid ? ' is-invalid' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        // Закрыт — показываем выбранное; открыт — то, что печатают
        value={open ? query : selected?.label ?? ''}
        placeholder={open ? selected?.label ?? t('combo.typeToSearch') : placeholder}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="combo__list" id={listId} role="listbox" ref={listRef}>
          {filtered.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              className={`combo__option${i === active ? ' is-active' : ''}${o.value === value ? ' is-selected' : ''}`}
              // mousedown, а не click: иначе поле теряет фокус раньше, чем засчитается выбор
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onPointerMove={() => setActive(i)}
            >
              <span className="combo__label">{o.label}</span>
              {o.hint && <span className="combo__hint">{o.hint}</span>}
            </li>
          ))}
          {filtered.length === 0 && <li className="combo__empty">{t('common.nothingFound')}</li>}
        </ul>
      )}
    </div>
  );
}
