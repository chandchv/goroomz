import { useLoaderData } from 'react-router';
import type { Route } from './+types/tickets';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import SupportTicketList from '../components/tickets/SupportTicketList';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch tickets from API
  return { tickets: [] };
}

export default function TicketsRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-600 mt-1">Manage customer support tickets</p>
          </div>

          <SupportTicketList />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
