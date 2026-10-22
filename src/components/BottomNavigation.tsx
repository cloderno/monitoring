import { NavLink } from 'react-router-dom';
import { History, House, Settings } from 'lucide-react';
import { useI18n, type MessageKey } from '../i18n';

const ITEMS: { to: string; label: MessageKey; icon: typeof House; end: boolean }[] = [
  { to: '/', label: 'nav.home', icon: House, end: true },
  { to: '/history', label: 'nav.history', icon: History, end: false },
  { to: '/settings', label: 'nav.settings', icon: Settings, end: false },
];

export function BottomNavigation() {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('nav.aria')}>
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <Icon size={22} />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}
