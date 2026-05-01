import { useLoaderData } from 'react-router';
import type { Route } from './+types/audit-logs';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import AuditLogViewer from '../components/audit/AuditLogViewer';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch audit logs from API
  return { logs: [] };
}

export default function AuditLogsRoute() {
  const { logs } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">View system audit logs and activity history</p>
          </div>

          <AuditLogViewer logs={logs} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
