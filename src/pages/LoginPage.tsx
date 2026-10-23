import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useI18n, type MessageKey } from '../i18n';
import { ApiError } from '../services/apiClient';
import { describeError } from '../utils/errorMessages';

type LoginError = { key: MessageKey } | { err: unknown };

export function LoginPage() {
  const { session, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loginName, setLoginName] = useState(
    import.meta.env.VITE_LOGIN_NAME ?? ''
  );

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Храним причину, а не готовый текст, — чтобы сообщение переводилось при смене языка
  const [error, setError] = useState<LoginError | null>(null);
  const [touched, setTouched] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!loginName.trim() || !password) {
      setError({ key: 'login.errEmpty' });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(loginName.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials') setError({ key: 'login.errInvalid' });
      else if (err instanceof ApiError && err.code === 'empty_credentials') setError({ key: 'login.errEmpty' });
      else setError({ err });
    } finally {
      setLoading(false);
    }
  };

  const errorText = !error
    ? null
    : 'key' in error
      ? t(error.key)
      : (({ title, text }) => `${title}. ${text}`)(describeError(error.err));

  return (
    <div className="login page-enter">
      <div className="login__lang">
        <LanguageSwitcher compact />
      </div>

      <div className="login__brand">
        <div className="login__logo">
          <ShoppingCart size={36} strokeWidth={2.2} />
        </div>
        <div className="login__name">{t('app.name')}</div>
        <div className="login__tagline">{t('app.tagline')}</div>
      </div>

      <form className="login__form" onSubmit={submit} noValidate>
        <h1 className="login__title">{t('login.title')}</h1>

        <label className="field">
          <span className="field__label">{t('login.login')}</span>
          <span className="field__control">
            <span className="field__icon">
              <User size={18} />
            </span>
            <input
              className={`input input--with-icon${touched && !loginName.trim() ? ' is-invalid' : ''}`}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t('login.loginPlaceholder')}
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
            />
          </span>
        </label>

        <label className="field">
          <span className="field__label">{t('login.password')}</span>
          <span className="field__control">
            <span className="field__icon">
              <Lock size={18} />
            </span>
            <input
              className={`input input--with-icon input--with-action${touched && !password ? ' is-invalid' : ''}`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field__action">
              <button
                type="button"
                className="icon-btn"
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </span>
        </label>

        {errorText && <StatusMessage tone="error">{errorText}</StatusMessage>}

        <PrimaryButton type="submit" size="lg" block loading={loading} icon={<LogIn size={19} />}>
          {loading ? t('login.submitting') : t('login.submit')}
        </PrimaryButton>
      </form>

      <footer className="login__footer">
        <p className="small">{t('login.footer')}</p>
      </footer>
    </div>
  );
}
