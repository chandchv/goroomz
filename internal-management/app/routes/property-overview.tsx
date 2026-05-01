import PropertyOverviewPage from "../pages/PropertyOverviewPage";
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';

export function meta() {
  return [
    { title: "Property Details - Manage Property Information" },
    { name: "description", content: "Manage property details, amenities, photos, and house rules" },
  ];
}

export default function PropertyOverview() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <PropertyOverviewPage />
      </MainLayout>
    </ProtectedRoute>
  );
}