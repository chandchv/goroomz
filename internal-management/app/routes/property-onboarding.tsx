import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import PropertyOnboardingPage from '../pages/PropertyOnboardingPage';

export default function PropertyOnboardingRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PropertyOnboardingPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
