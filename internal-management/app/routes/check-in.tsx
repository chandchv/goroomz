import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import CheckInPage from '../pages/CheckInPage';

export default function CheckInRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <CheckInPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
