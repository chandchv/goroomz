import { useLoaderData } from 'react-router';
import type { Route } from './+types/announcements';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import AnnouncementCreationForm from '../components/announcements/AnnouncementCreationForm';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch announcements from API
  return { announcements: [] };
}

export default function AnnouncementsRoute() {
  const { announcements } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-1">Create and manage platform announcements</p>
          </div>

          <div className="mb-6">
            <AnnouncementCreationForm />
          </div>

          <div className="bg-white rounded-lg shadow">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No announcements yet.
              </div>
            ) : (
              <div className="divide-y">
                {announcements.map((announcement: any) => (
                  <div key={announcement.id} className="p-4">
                    {announcement.title}
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
