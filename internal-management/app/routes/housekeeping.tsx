import HousekeepingPage from "../pages/HousekeepingPage";
import MainLayout from "../components/MainLayout";
import ProtectedRoute from "../components/ProtectedRoute";

export default function HousekeepingRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <HousekeepingPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
