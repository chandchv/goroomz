import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PropertyOwnerManagementPage from '../pages/PropertyOwnerManagementPage';

export default function PropertyOwnersRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PropertyOwnerManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
