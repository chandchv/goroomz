import { useLoaderData } from 'react-router';
import type { Route } from './+types/platform.owners';
import MainLayout from '../components/MainLayout';
import PlatformRoute from '../components/PlatformRoute';
import PropertyOwnerManagementPage from '../pages/PropertyOwnerManagementPage';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Property Owners - Platform Management' },
    { name: 'description', content: 'Manage property owners across the platform' },
  ];
}

export default function PlatformOwnersRoute() {
  return (
    <MainLayout>
      <PlatformRoute requiredRoles={['operations_manager', 'platform_admin', 'superuser']}>
        <PropertyOwnerManagementPage />
      </PlatformRoute>
    </MainLayout>
  );
}
