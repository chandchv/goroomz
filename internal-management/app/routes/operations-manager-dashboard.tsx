import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import OperationsManagerDashboardPage from '../pages/OperationsManagerDashboardPage';

export default function OperationsManagerDashboardRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['operations_manager']}>
      <MainLayout>
        <OperationsManagerDashboardPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
