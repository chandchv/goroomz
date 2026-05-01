import { useLoaderData } from 'react-router';
import type { Route } from './+types/lead-pipeline';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import LeadPipelineView from '../components/leads/LeadPipelineView';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch pipeline data from API
  return { pipelineData: [] };
}

export default function LeadPipelineRoute() {
  const { pipelineData } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
            <p className="text-gray-600 mt-1">Track leads through your sales pipeline</p>
          </div>

          <LeadPipelineView data={pipelineData} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
