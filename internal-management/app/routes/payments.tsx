import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PaymentDashboardPage from '../pages/PaymentDashboardPage';

export default function PaymentsRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PaymentDashboardPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
