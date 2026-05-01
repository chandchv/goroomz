import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import MyProfilePage from "../pages/MyProfilePage";

export default function MyProfileRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <MyProfilePage />
      </MainLayout>
    </ProtectedRoute>
  );
}
