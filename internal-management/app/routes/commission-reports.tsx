import { useLoaderData } from 'react-router';
import type { Route } from './+types/commission-reports';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch commission reports from API
  return { reports: [] };
}

export default function CommissionReportsRoute() {
  const { reports } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Commission Reports</h1>
            <p className="text-gray-600 mt-1">View and analyze commission data</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {reports.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No commission reports available.</p>
            ) : (
              <div>Commission reports will be displayed here</div>
            )}
          </div>
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
