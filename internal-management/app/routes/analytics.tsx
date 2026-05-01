import { useLoaderData } from 'react-router';
import type { Route } from './+types/analytics';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import PlatformAnalytics from '../components/analytics/PlatformAnalytics';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch analytics data from API
  return { analyticsData: {} };
}

export default function AnalyticsRoute() {
  const { analyticsData } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-1">View platform-wide analytics and insights</p>
          </div>

          <PlatformAnalytics data={analyticsData} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
