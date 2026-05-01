import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InternalUserManagementPage from "../pages/InternalUserManagementPage";

export default function InternalUsersCreateRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <InternalUserManagementPage openCreateModal={true} />
      </MainLayout>
    </ProtectedRoute>
  );
}
