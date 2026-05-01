import { useLoaderData } from 'react-router';
import type { Route } from './+types/platform.agents';
import MainLayout from '../components/MainLayout';
import PlatformRoute from '../components/PlatformRoute';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Agents - Platform Management' },
    { name: 'description', content: 'Manage platform agents' },
  ];
}

export default function PlatformAgentsRoute() {
  return (
    <MainLayout>
      <PlatformRoute requiredRoles={['regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage platform agents and their assignments
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">Agent management interface coming soon...</p>
          </div>
        </div>
      </PlatformRoute>
    </MainLayout>
  );
}
