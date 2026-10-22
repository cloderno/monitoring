import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, History, LogOut, ScanLine } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { BrandMark, initials } from '../components/BrandMark';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n';
import { roleLabel } from '../i18n/labels';

export function WelcomePage() {
  const { session, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = session!.user;

  return (
    <>
      <header className="app-header app-header--brand">
        <BrandMark />
        <div className="app-header__titles" style={{ padding: 0 }}>
          <div className="app-header__title">{t('app.name')}</div>
          <div className="app-header__subtitle">{t('app.tagline')}</div>
        </div>
        <button className="avatar" aria-label={t('nav.settings')} onClick={() => navigate('/settings')}>
          {initials(user.fullName)}
        </button>
        <button className="icon-btn" aria-label={t('common.logout')} onClick={logout}>
          <LogOut size={20} />
        </button>
      </header>

      <div className="screen__body page-enter">
        <div style={{ padding: '6px 4px 4px' }}>
          <div className="greeting__hello">{t('welcome.hello')}</div>
          <div className="greeting__name">{user.fullName}</div>
          <div className="greeting__role">{roleLabel(user.role)}</div>
        </div>

        <section className="hero appear">
          <div className="hero__icon">
            <ScanLine size={24} />
          </div>
          <h2 className="hero__title">{t('welcome.heroTitle')}</h2>
          <p className="hero__text">{t('welcome.heroText')}</p>
          <PrimaryButton size="lg" block icon={<ScanLine size={20} />} onClick={() => navigate('/inspection')}>
            {t('welcome.start')}
          </PrimaryButton>
        </section>

        <Link to="/products" className="link-row appear" style={{ animationDelay: '80ms' }}>
          <span className="card__icon">
            <BookOpen size={18} />
          </span>
          <span className="link-row__text">{t('link.catalog')}</span>
          <ChevronRight size={20} color="var(--color-text-muted)" />
        </Link>
        <Link to="/history" className="link-row appear" style={{ animationDelay: '120ms' }}>
          <span className="card__icon">
            <History size={18} />
          </span>
          <span className="link-row__text">{t('link.history')}</span>
          <ChevronRight size={20} color="var(--color-text-muted)" />
        </Link>
      </div>
    </>
  );
}
