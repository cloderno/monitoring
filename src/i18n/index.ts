import { useSyncExternalStore } from 'react';
import { kk } from './kk';
import { ru, type MessageKey } from './ru';

export type Lang = 'ru' | 'kk';
export type { MessageKey };

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'ru', label: 'Русский', short: 'РУС' },
  { code: 'kk', label: 'Қазақша', short: 'ҚАЗ' },
];

const STORAGE_KEY = 'szpt.lang';
const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { ru, kk };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'kk') return saved;
  } catch {
    // localStorage недоступен (приватный режим) — выбираем по языку браузера
  }
  return navigator.language?.toLowerCase().startsWith('kk') ? 'kk' : 'ru';
}

let current: Lang = initialLang();
applyToDocument();
const listeners = new Set<() => void>();

export const getLang = () => current;

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // язык просто не запомнится между запусками
  }
  applyToDocument();
  listeners.forEach((listener) => listener());
}

/** Текст на текущем языке; {name} в строке заменяется значением из params */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = DICTIONARIES[current][key] ?? ru[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Язык страницы и заголовок вкладки браузера */
function applyToDocument() {
  document.documentElement.lang = current;
  document.title = t('app.fullName');
}

/**
 * Локаль для дат. Даты показываем цифрами — в Казахстане привычен формат 22.10.2026 на обоих языках,
 * а локаль kk-KZ в браузерах выводит 2026-10-22, поэтому всегда ru-RU.
 */
export const dateLocale = () => 'ru-RU';

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Подписывает компонент на смену языка: после переключения он перерисуется с новыми текстами */
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return { lang, t, setLang };
}
