import MaintenancePage from "../pages/MaintenancePage";
import MainLayout from "../components/MainLayout";
import ProtectedRoute from "../components/ProtectedRoute";

export default function MaintenanceRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <MaintenancePage />
      </MainLayout>
    </ProtectedRoute>
  );
}
