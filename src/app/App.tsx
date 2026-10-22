import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../store/AuthContext';
import { HistoryProvider } from '../store/HistoryContext';
import { useI18n } from '../i18n';
import { router } from './router';

export function App() {
  const { t } = useI18n();
  return (
    <AuthProvider>
      <HistoryProvider>
        <div className="app-backdrop">
          {/* На смартфоне — во весь экран, на компьютере — мобильный макет по центру */}
          <div className="app-shell">
            <RouterProvider router={router} />
          </div>
          <div className="demo-caption">{t('app.demoCaption')}</div>
        </div>
      </HistoryProvider>
    </AuthProvider>
  );
}
