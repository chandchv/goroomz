import { useLoaderData } from 'react-router';
import type { Route } from './+types/role-management';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import RoleManagement from '../components/roles/RoleManagement';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch roles from API
  return { roles: [] };
}

export default function RoleManagementRoute() {
  const { roles } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
          </div>

          <RoleManagement roles={roles} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
