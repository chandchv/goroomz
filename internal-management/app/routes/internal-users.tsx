import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InternalUserManagementPage from "../pages/InternalUserManagementPage";

export default function InternalUsersRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <InternalUserManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
