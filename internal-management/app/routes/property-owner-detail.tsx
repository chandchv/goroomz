import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PropertyOwnerDetailPage from '../pages/PropertyOwnerDetailPage';

export default function PropertyOwnerDetailRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PropertyOwnerDetailPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
