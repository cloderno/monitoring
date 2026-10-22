import { NavLink } from 'react-router-dom';
import { History, House, UserRound } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Главная', icon: House, end: true },
  { to: '/history', label: 'История', icon: History, end: false },
  { to: '/profile', label: 'Профиль', icon: UserRound, end: false },
];

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
