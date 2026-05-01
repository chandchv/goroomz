import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import SecurityDepositPage from '../pages/SecurityDepositPage';

export default function DepositsRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <SecurityDepositPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
