import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import NotificationPreferencesPage from '../pages/NotificationPreferencesPage';

export default function NotificationPreferencesRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <NotificationPreferencesPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
