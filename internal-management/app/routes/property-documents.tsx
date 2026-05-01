import { useLoaderData } from 'react-router';
import type { Route } from './+types/property-documents';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import DocumentList from '../components/documents/DocumentList';
import DocumentUploadComponent from '../components/documents/DocumentUploadComponent';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch documents from API
  return { documents: [] };
}

export default function PropertyDocumentsRoute() {
  const { documents } = useLoaderData<typeof loader>();

  return (
    <RoleProtectedRoute allowedRoles={['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']}>
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Property Documents</h1>
            <p className="text-gray-600 mt-1">Manage property-related documents</p>
          </div>

          <div className="mb-6">
            <DocumentUploadComponent />
          </div>

          <DocumentList documents={documents} />
        </div>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
