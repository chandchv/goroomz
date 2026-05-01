import { useLoaderData } from 'react-router';
import type { Route } from './+types/settings';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import CommissionRateConfig from '../components/config/CommissionRateConfig';
import RegionalSettingsConfig from '../components/config/RegionalSettingsConfig';
import PlatformPoliciesConfig from '../components/config/PlatformPoliciesConfig';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch settings from API
  return { settings: {} };
}

export default function SettingsRoute() {
  const { settings } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-1">Configure platform settings and policies</p>
          </div>

          <div className="space-y-6">
            <CommissionRateConfig />
            <RegionalSettingsConfig />
            <PlatformPoliciesConfig />
          </div>
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
