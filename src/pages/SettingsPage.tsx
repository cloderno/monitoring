import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Languages, LogOut, Trash2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { initials } from '../components/BrandMark';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n';
import { roleLabel } from '../i18n/labels';
import { useAuth } from '../store/AuthContext';
import { useHistory } from '../store/HistoryContext';

export function SettingsPage() {
  const { session, logout } = useAuth();
  const { items, clear } = useHistory();
  const { t } = useI18n();
  const user = session!.user;
  const role = roleLabel(user.role);

  return (
    <>
      <AppHeader title={t('settings.title')} showBack={false} />
      <div className="screen__body page-enter">
        <section className="card profile-head appear">
          <span className="avatar avatar--lg">{initials(user.fullName)}</span>
          <div className="profile-name">{user.fullName}</div>
          <div className="muted">{role}</div>
        </section>

        <section className="card appear" style={{ animationDelay: '40ms' }}>
          <div className="card__header">
            <span className="card__icon">
              <Languages size={20} />
            </span>
            <h2 className="card__title">{t('lang.title')}</h2>
          </div>
          <LanguageSwitcher />
        </section>

        <section className="card appear" style={{ animationDelay: '80ms' }}>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">{t('settings.fullName')}</span>
              <span className="kv__value">{user.fullName}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('settings.login')}</span>
              <span className="kv__value">{user.login}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('settings.role')}</span>
              <span className="kv__value">{role}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('settings.app')}</span>
              <span className="kv__value">{t('app.fullName')}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t('settings.version')}</span>
              <span className="kv__value">MVP 1.0</span>
            </div>
          </div>
        </section>

        <Link to="/products" className="link-row">
          <span className="card__icon">
            <BookOpen size={18} />
          </span>
          <span className="link-row__text">{t('link.catalog')}</span>
          <ChevronRight size={20} color="var(--color-text-muted)" />
        </Link>

        {items.length > 0 && (
          <PrimaryButton
            variant="ghost"
            block
            icon={<Trash2 size={18} />}
            onClick={() => {
              if (window.confirm(t('settings.clearConfirm'))) clear();
            }}
          >
            {t('settings.clearHistory')}
          </PrimaryButton>
        )}

        <PrimaryButton variant="danger" size="lg" block icon={<LogOut size={19} />} onClick={logout}>
          {t('common.logout')}
        </PrimaryButton>
      </div>
    </>
  );
}
