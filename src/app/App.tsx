import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../store/AuthContext';
import { HistoryProvider } from '../store/HistoryContext';
import { router } from './router';

export function App() {
  return (
    <AuthProvider>
      <HistoryProvider>
        <div className="app-backdrop">
          {/* На смартфоне — во весь экран, на компьютере — мобильный макет по центру */}
          <div className="app-shell">
            <RouterProvider router={router} />
          </div>
        </div>
      </HistoryProvider>
    </AuthProvider>
  );
}
