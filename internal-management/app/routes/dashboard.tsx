import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import DashboardPage from '../pages/DashboardPage';

export default function DashboardRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <DashboardPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
