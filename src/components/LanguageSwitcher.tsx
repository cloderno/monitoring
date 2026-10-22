import { LANGUAGES, useI18n } from '../i18n';

/** Переключатель «Русский / Қазақша». compact — короткие подписи для экрана входа */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`segmented${compact ? ' segmented--compact' : ''}`} role="radiogroup" aria-label={t('lang.aria')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          lang={l.code}
          aria-checked={lang === l.code}
          className={lang === l.code ? 'is-active' : ''}
          onClick={() => setLang(l.code)}
        >
          {compact ? l.short : l.label}
        </button>
      ))}
    </div>
  );
}
