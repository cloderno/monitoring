import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, LogOut, Trash2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { initials } from '../components/BrandMark';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../store/AuthContext';
import { useHistory } from '../store/HistoryContext';

export function ProfilePage() {
  const { session, logout } = useAuth();
  const { items, clear } = useHistory();
  const user = session!.user;

  return (
    <>
      <AppHeader title="Профиль" showBack={false} />
      <div className="screen__body page-enter">
        <section className="card profile-head appear">
          <span className="avatar avatar--lg">{initials(user.fullName)}</span>
          <div className="profile-name">{user.fullName}</div>
          <div className="muted">{user.role}</div>
          {user.demo && <span className="badge badge--warning" style={{ marginTop: 6 }}>Демонстрационный режим</span>}
        </section>

        <section className="card appear" style={{ animationDelay: '60ms' }}>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">ФИО</span>
              <span className="kv__value">{user.fullName}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Логин</span>
              <span className="kv__value">{user.login}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Роль</span>
              <span className="kv__value">{user.role}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Приложение</span>
              <span className="kv__value">Мониторинг цен — Контроль СЗПТ</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Версия</span>
              <span className="kv__value">MVP 1.0</span>
            </div>
          </div>
        </section>

        <Link to="/products" className="link-row">
          <span className="card__icon">
            <BookOpen size={18} />
          </span>
          <span className="link-row__text">Справочник товаров</span>
          <ChevronRight size={20} color="var(--color-text-muted)" />
        </Link>

        {items.length > 0 && (
          <PrimaryButton
            variant="ghost"
            block
            icon={<Trash2 size={18} />}
            onClick={() => {
              if (window.confirm('Удалить все обследования из истории этого браузера?')) clear();
            }}
          >
            Очистить историю
          </PrimaryButton>
        )}

        <PrimaryButton variant="danger" size="lg" block icon={<LogOut size={19} />} onClick={logout}>
          Выйти
        </PrimaryButton>
      </div>
    </>
  );
}
