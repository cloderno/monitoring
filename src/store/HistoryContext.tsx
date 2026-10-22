import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Inspection } from '../types/inspection';

// Демонстрационная история: хранится только в этом браузере и не синхронизируется между устройствами.
const STORAGE_KEY = 'szpt.history.v1';
const MAX_ITEMS = 100;

function load(): Inspection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: Inspection[]) {
  // При нехватке места постепенно убираем миниатюры у старых записей
  let data = list;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    } catch {
      const keep = Math.floor(data.length / 2 ** (attempt + 1));
      data = data.map((item, i) => (i < keep ? item : { ...item, photo: null }));
    }
  }
}

interface HistoryContextValue {
  items: Inspection[];
  add: (item: Inspection) => void;
  update: (item: Inspection) => void;
  get: (id: string) => Inspection | undefined;
  clear: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Inspection[]>(load);

  useEffect(() => save(items), [items]);

  const add = useCallback((item: Inspection) => setItems((list) => [item, ...list].slice(0, MAX_ITEMS)), []);
  const update = useCallback(
    (item: Inspection) => setItems((list) => list.map((x) => (x.id === item.id ? item : x))),
    [],
  );
  const get = useCallback((id: string) => items.find((x) => x.id === id), [items]);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, add, update, get, clear }), [items, add, update, get, clear]);
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory вне HistoryProvider');
  return ctx;
}
