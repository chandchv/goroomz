import { useLoaderData } from 'react-router';
import type { Route } from './+types/subscriptions';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import SubscriptionList from '../components/subscriptions/SubscriptionList';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch subscriptions from API
  return { subscriptions: [] };
}

export default function SubscriptionsRoute() {
  const { subscriptions } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-gray-600 mt-1">Manage customer subscriptions and billing</p>
          </div>

          <SubscriptionList subscriptions={subscriptions} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
