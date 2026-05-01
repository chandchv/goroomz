import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PropertiesManagementPage from '../pages/PropertiesManagementPage';

export default function PropertiesRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PropertiesManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
