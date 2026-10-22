import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  /** Куда вести кнопку «Назад»; по умолчанию — на шаг назад в истории */
  backTo?: string;
  showBack?: boolean;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, backTo, showBack = true, right }: Props) {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      {showBack && (
        <button
          className="icon-btn"
          aria-label="Назад"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="app-header__titles" style={showBack ? undefined : { paddingLeft: 12 }}>
        <h1 className="app-header__title">{title}</h1>
        {subtitle && <div className="app-header__subtitle">{subtitle}</div>}
      </div>
      {right && <div className="app-header__right">{right}</div>}
    </header>
  );
}
