import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import CheckOutPage from '../pages/CheckOutPage';

export default function CheckOutRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <CheckOutPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
