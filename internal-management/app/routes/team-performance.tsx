import { useLoaderData } from 'react-router';
import type { Route } from './+types/team-performance';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import TeamPerformanceReport from '../components/performance/TeamPerformanceReport';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch performance data from API
  return { performanceData: [] };
}

export default function TeamPerformanceRoute() {
  const { performanceData } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Team Performance</h1>
            <p className="text-gray-600 mt-1">Monitor team performance metrics and KPIs</p>
          </div>

          <TeamPerformanceReport data={performanceData} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
