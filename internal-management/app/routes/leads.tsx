import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/leads';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import LeadCreationForm from '../components/leads/LeadCreationForm';
import LeadCard from '../components/leads/LeadCard';
import BulkLeadUploadModal from '../components/leads/BulkLeadUploadModal';
import { Upload, Plus, RefreshCw } from 'lucide-react';
import { leadService, Lead } from '../services/leadService';
import { useAuth } from '../contexts/AuthContext';

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Fetch leads from API
  return { leads: [] };
}

export default function LeadsRoute() {
  const { leads: initialLeads } = useLoaderData<typeof loader>();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const canBulkUpload = user?.role === 'admin' || user?.role === 'superuser';

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await leadService.getLeads({ limit: 50 });
      setLeads(response.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleBulkUploadSuccess = () => {
    fetchLeads();
    setShowBulkUpload(false);
  };

  return (
    <RoleProtectedRoute allowedRoles={['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser', 'admin']}>
      <MainLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
              <p className="text-gray-600 mt-1">Manage and track your leads</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchLeads}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {canBulkUpload && (
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Lead
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="mb-6">
              <LeadCreationForm />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No leads found. Create your first lead to get started.</p>
                {canBulkUpload && (
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="mt-4 text-indigo-600 hover:text-indigo-700"
                  >
                    Or bulk upload leads from a file
                  </button>
                )}
              </div>
            ) : (
              leads.map((lead: any) => (
                <LeadCard key={lead.id} lead={lead} />
              ))
            )}
          </div>
        </div>

        {/* Bulk Upload Modal */}
        <BulkLeadUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
