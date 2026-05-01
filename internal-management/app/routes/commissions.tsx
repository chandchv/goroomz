import { useLoaderData } from 'react-router';
import type { Route } from './+types/commissions';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import CommissionDashboard from '../components/commissions/CommissionDashboard';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch commission data from API
  return { commissions: [] };
}

export default function CommissionsRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['agent', 'regional_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Commissions</h1>
            <p className="text-gray-600 mt-1">Track your earnings and commission status</p>
          </div>

          <CommissionDashboard />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
