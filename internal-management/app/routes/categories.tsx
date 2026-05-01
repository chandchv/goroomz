import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import CategoryManagementPage from "../pages/CategoryManagementPage";

export default function CategoriesRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <CategoryManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
