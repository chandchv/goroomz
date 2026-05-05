import ProtectedRoute from '~/components/ProtectedRoute';
import MainLayout from '~/components/MainLayout';
import EnquiriesPage from '~/pages/EnquiriesPage';

export default function EnquiriesRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <EnquiriesPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
