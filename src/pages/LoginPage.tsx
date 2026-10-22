import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { ApiError } from '../services/apiClient';
import { describeError } from '../utils/errorMessages';

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [loginName, setLoginName] = useState(
    import.meta.env.VITE_LOGIN_NAME ?? ''
  );

  const [password, setPassword] = useState(
    import.meta.env.VITE_LOGIN_PASSWORD ?? ''
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!loginName.trim() || !password) {
      setError('Введите логин и пароль');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(loginName.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials') setError('Неверный логин или пароль');
      else if (err instanceof ApiError && err.code === 'empty_credentials') setError('Введите логин и пароль');
      else {
        const d = describeError(err);
        setError(`${d.title}. ${d.text}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login page-enter">
      <div className="login__brand">
        <div className="login__logo">
          <ShoppingCart size={36} strokeWidth={2.2} />
        </div>
        <div className="login__name">Мониторинг цен</div>
        <div className="login__tagline">Контроль СЗПТ</div>
      </div>

      <form className="login__form" onSubmit={submit} noValidate>
        <h1 className="login__title">Вход в систему</h1>

        <label className="field">
          <span className="field__label">Логин</span>
          <span className="field__control">
            <span className="field__icon">
              <User size={18} />
            </span>
            <input
              className={`input input--with-icon${touched && !loginName.trim() ? ' is-invalid' : ''}`}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Введите логин"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
            />
          </span>
        </label>

        <label className="field">
          <span className="field__label">Пароль</span>
          <span className="field__control">
            <span className="field__icon">
              <Lock size={18} />
            </span>
            <input
              className={`input input--with-icon input--with-action${touched && !password ? ' is-invalid' : ''}`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field__action">
              <button
                type="button"
                className="icon-btn"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </span>
        </label>

        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <PrimaryButton type="submit" size="lg" block loading={loading} icon={<LogIn size={19} />}>
          {loading ? 'Выполняется вход…' : 'Войти'}
        </PrimaryButton>
      </form>

      <footer className="login__footer">
        <p className="small">Система мониторинга цен на социально значимые продовольственные товары</p>
        <span className="badge badge--neutral">MVP 1.0 · демонстрационная версия</span>
      </footer>
    </div>
  );
}
