import { useLoaderData } from 'react-router';
import type { Route } from './+types/performance-targets';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import TargetSettingForm from '../components/performance/TargetSettingForm';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch targets from API
  return { targets: [] };
}

export default function PerformanceTargetsRoute() {
  const { targets } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Performance Targets</h1>
            <p className="text-gray-600 mt-1">Set and manage performance targets for your team</p>
          </div>

          <div className="mb-6">
            <TargetSettingForm />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {targets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No targets set yet.</p>
            ) : (
              <div>Targets will be displayed here</div>
            )}
          </div>
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
