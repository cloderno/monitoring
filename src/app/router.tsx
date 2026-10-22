import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { useAuth } from '../store/AuthContext';
import { DraftProvider } from '../store/DraftContext';
import { HistoryPage } from '../pages/HistoryPage';
import { InspectionPage } from '../pages/InspectionPage';
import { InspectionResultPage } from '../pages/InspectionResultPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { WelcomePage } from '../pages/WelcomePage';

/** Доступ только после входа; контекст проверки живёт, пока пользователь в системе */
function ProtectedLayout() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return (
    <DraftProvider>
      <Outlet />
    </DraftProvider>
  );
}

/** Основные экраны с нижней навигацией */
function TabsLayout() {
  return (
    <>
      <main className="screen">
        <Outlet />
      </main>
      <BottomNavigation />
    </>
  );
}

/** Экраны процесса: кнопка «Назад» вместо нижней навигации */
function FlowLayout() {
  return (
    <main className="screen">
      <Outlet />
    </main>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { path: '/', element: <WelcomePage /> },
          { path: '/history', element: <HistoryPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
      {
        element: <FlowLayout />,
        children: [
          { path: '/inspection', element: <InspectionPage /> },
          { path: '/inspection/result/:id', element: <InspectionResultPage /> },
          { path: '/history/:id', element: <InspectionResultPage /> },
          { path: '/products', element: <ProductsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
