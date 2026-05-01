import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import RegionalManagerDashboardPage from '../pages/RegionalManagerDashboardPage';

export default function RegionalManagerDashboardRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['regional_manager']}>
      <MainLayout>
        <RegionalManagerDashboardPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
