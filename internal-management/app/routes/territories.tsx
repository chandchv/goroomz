import { useLoaderData } from 'react-router';
import type { Route } from './+types/territories';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import TerritoryManagement from '../components/territories/TerritoryManagement';
import TerritoryMapView from '../components/territories/TerritoryMapView';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch territories from API
  return { territories: [] };
}

export default function TerritoriesRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Territories</h1>
            <p className="text-gray-600 mt-1">Manage sales territories and coverage areas</p>
          </div>

          <TerritoryManagement />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
