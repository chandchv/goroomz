import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import FloorViewPage from "../pages/FloorViewPage";

export default function RoomsRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <FloorViewPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
