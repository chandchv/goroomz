import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import PropertyDetailPage from '../pages/PropertyDetailPage';

export default function PropertyDetailRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <PropertyDetailPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
