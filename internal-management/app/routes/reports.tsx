import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import ReportsPage from "../pages/ReportsPage";

export default function ReportsRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ReportsPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
