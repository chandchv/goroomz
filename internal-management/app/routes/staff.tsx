import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import StaffManagementPage from "../pages/StaffManagementPage";

export default function StaffRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <StaffManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
