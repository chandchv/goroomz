import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import NotificationsPage from '../pages/NotificationsPage';

export default function NotificationsRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <NotificationsPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
