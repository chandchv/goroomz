import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PaymentSchedulePage from '../pages/PaymentSchedulePage';

export default function PaymentScheduleRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PaymentSchedulePage />
      </MainLayout>
    </ProtectedRoute>
  );
}
