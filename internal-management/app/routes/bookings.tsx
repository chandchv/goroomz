import type { Route } from "./+types/bookings";
import BookingManagementPage from "../pages/BookingManagementPage";
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from '../components/MainLayout';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Booking Management - Internal Management" },
    { name: "description", content: "Manage bookings, check-ins, and check-outs" },
  ];
}

export default function Bookings() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <BookingManagementPage />
      </MainLayout>
    </ProtectedRoute>
  );
}

