import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import SuperuserDashboardPage from '../pages/SuperuserDashboardPage';

export default function SuperuserDashboardRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['superuser']}>
      <MainLayout>
        <SuperuserDashboardPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
