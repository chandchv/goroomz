import { useLoaderData } from 'react-router';
import type { Route } from './+types/platform.properties';
import MainLayout from '../components/MainLayout';
import PlatformRoute from '../components/PlatformRoute';
import PropertiesManagementPage from '../pages/PropertiesManagementPage';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'All Properties - Platform Management' },
    { name: 'description', content: 'View and manage all properties across the platform' },
  ];
}

export default function PlatformPropertiesRoute() {
  return (
    <MainLayout>
      <PlatformRoute requiredRoles={['regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
        <PropertiesManagementPage />
      </PlatformRoute>
    </MainLayout>
  );
}
