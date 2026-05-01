import { useLoaderData } from 'react-router';
import type { Route } from './+types/my-team';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch team members from API
  return { teamMembers: [] };
}

export default function MyTeamRoute() {
  const { teamMembers } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Team</h1>
            <p className="text-gray-600 mt-1">View and manage your team members</p>
          </div>

          <div className="bg-white rounded-lg shadow">
            {teamMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No team members found.
              </div>
            ) : (
              <div className="divide-y">
                {teamMembers.map((member: any) => (
                  <div key={member.id} className="p-4">
                    {member.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
