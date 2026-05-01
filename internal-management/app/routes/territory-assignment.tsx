import { useLoaderData } from 'react-router';
import type { Route } from './+types/territory-assignment';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import AgentAssignment from '../components/territories/AgentAssignment';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch assignment data from API
  return { assignments: [], agents: [], territories: [] };
}

export default function TerritoryAssignmentRoute() {
  const { assignments, agents, territories } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Territory Assignment</h1>
            <p className="text-gray-600 mt-1">Assign agents to territories</p>
          </div>

          <AgentAssignment 
            assignments={assignments}
            agents={agents}
            territories={territories}
          />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
