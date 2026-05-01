import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import PlatformAdminDashboardPage from '../pages/PlatformAdminDashboardPage';

export default function PlatformAdminDashboardRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['platform_admin']}>
      <MainLayout>
        <PlatformAdminDashboardPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
