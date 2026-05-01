import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { leadService, type Lead } from '../services/leadService';
import LeadCreationForm from '../components/leads/LeadCreationForm';
import OnboardingApprovalView from '../components/onboarding/OnboardingApprovalView';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import DirectPropertyCreationModal from '../components/properties/DirectPropertyCreationModal';

type ViewMode = 'my-leads' | 'pending-approval' | 'approved' | 'create-new';

export default function PropertyOnboardingPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('my-leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    myLeads: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
  });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);
  const [directCreateModal, setDirectCreateModal] = useState(false);

  // Check if user can create properties directly (superuser or platform_admin)
  const canCreateDirectly = user?.role === 'admin' || 
                            user?.internalRole === 'platform_admin' || 
                            user?.internalRole === 'superuser';

  const normalizeLead = (lead: Lead & Record<string, any>): Lead => ({
    ...lead,
    propertyOwnerName: lead.propertyOwnerName || lead.businessName || lead.ownerName || 'Unnamed Property',
    email: lead.email || lead.propertyOwnerEmail || lead.contactEmail || '',
    phone: lead.phone || lead.propertyOwnerPhone || lead.contactPhone || '',
    createdAt: lead.createdAt || lead.created_at || lead.updatedAt || lead.updated_at || new Date().toISOString(),
    updatedAt: lead.updatedAt || lead.updated_at || lead.createdAt || lead.created_at || new Date().toISOString(),
  });

  useEffect(() => {
    loadLeads();
  }, [user, viewMode]);

  const loadLeads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      
      // Filter based on role and view mode
      if (user.internalRole === 'agent') {
        filters.agentId = user.id;
      } else if (user.internalRole === 'regional_manager' && user.territoryId) {
        filters.territoryId = user.territoryId;
      }

      // Apply status filter based on view mode
      if (viewMode === 'pending-approval') {
        filters.status = 'pending_approval';
      } else if (viewMode === 'approved') {
        filters.status = 'approved';
      } else if (viewMode === 'my-leads') {
        // Show all leads for the agent/manager
      }

      const response = await leadService.getLeads(filters);
      const normalizedLeads = (response.data || []).map(normalizeLead);
      setLeads(normalizedLeads);

      // Calculate stats
      const allLeadsResponse = await leadService.getLeads(
        user.internalRole === 'agent' 
          ? { agentId: user.id }
          : user.territoryId 
            ? { territoryId: user.territoryId }
            : {}
      );
      
      const allLeads = (allLeadsResponse.data || []).map(normalizeLead);
      setStats({
        myLeads: allLeads.length,
        pendingApproval: allLeads.filter(l => l.status === 'pending_approval').length,
        approved: allLeads.filter(l => l.status === 'approved').length,
        rejected: allLeads.filter(l => l.status === 'rejected').length,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load onboarding data');
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkInProgress = async (leadId: string) => {
    try {
      setActionLeadId(leadId);
      setError(null);
      await leadService.updateLeadStatus(leadId, { status: 'in_progress' });
      await loadLeads();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update lead status');
      console.error('Error updating lead status:', err);
    } finally {
      setActionLeadId(null);
    }
  };

  const handleSubmitForApproval = async (leadId: string) => {
    try {
      setActionLeadId(leadId);
      setError(null);
      await leadService.submitForApproval(leadId);
      await loadLeads();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit lead for approval');
      console.error('Error submitting for approval:', err);
    } finally {
      setActionLeadId(null);
    }
  };

  const handleViewDetails = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsLeadModalOpen(true);
  };

  const closeLeadModal = () => {
    setIsLeadModalOpen(false);
    setSelectedLeadId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'lost':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const canCreateLead = user?.internalRole === 'agent' || 
                        user?.internalRole === 'regional_manager' ||
                        user?.internalRole === 'operations_manager' ||
                        user?.internalRole === 'platform_admin' ||
                        user?.internalRole === 'superuser';

  const canApprove = user?.internalRole === 'regional_manager' ||
                     user?.internalRole === 'operations_manager' ||
                     user?.internalRole === 'platform_admin' ||
                     user?.internalRole === 'superuser';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Onboarding</h1>
              <p className="text-gray-600 mt-1">Manage property leads and onboarding workflow</p>
            </div>
            <div className="flex gap-2">
              {canCreateDirectly && (
                <button
                  onClick={() => setDirectCreateModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  title="Create property directly without lead workflow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Direct Create
                </button>
              )}
              {canCreateLead && (
                <button
                  onClick={() => setViewMode('create-new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Property Lead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">All Leads</div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.myLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Pending Approval</div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.pendingApproval}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Approved</div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Rejected</div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.rejected}</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setViewMode('my-leads')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'my-leads'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Leads
              </button>
              {canApprove && (
                <button
                  onClick={() => setViewMode('pending-approval')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    viewMode === 'pending-approval'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pending Approval
                  {stats.pendingApproval > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                      {stats.pendingApproval}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setViewMode('approved')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'approved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved Properties
              </button>
              {canCreateLead && (
                <button
                  onClick={() => setViewMode('create-new')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    viewMode === 'create-new'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create New Lead
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {viewMode === 'create-new' ? (
              <LeadCreationForm
                onSuccess={() => {
                  setViewMode('my-leads');
                  loadLeads();
                }}
                onCancel={() => setViewMode('my-leads')}
              />
            ) : viewMode === 'pending-approval' && canApprove ? (
              <OnboardingApprovalView
                territoryId={
                  user?.internalRole === 'regional_manager'
                    ? user.territoryId ?? undefined
                    : undefined
                }
                onApprovalUpdate={loadLeads}
              />
            ) : (
              <div className="space-y-4">
                {leads.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 font-medium">No leads found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {viewMode === 'approved' 
                        ? 'No approved properties yet'
                        : 'Create your first property lead to get started'}
                    </p>
                  </div>
                ) : (
                  leads.map(lead => (
                    <div key={lead.id} className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{lead.businessName}</h3>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                              {getStatusLabel(lead.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Owner:</span>
                              <span className="ml-2 font-medium text-gray-900">{lead.propertyOwnerName}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-2 font-medium text-gray-900">{lead.email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Phone:</span>
                              <span className="ml-2 font-medium text-gray-900">{lead.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Property Type:</span>
                              <span className="ml-2 font-medium text-gray-900 capitalize">{lead.propertyType}</span>
                            </div>
                            {lead.agent && (
                              <div>
                                <span className="text-gray-600">Agent:</span>
                                <span className="ml-2 font-medium text-gray-900">{lead.agent.name}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600">Updated:</span>
                              <span className="ml-2 font-medium text-gray-900">{formatDate(lead.updatedAt)}</span>
                            </div>
                          </div>

                          {lead.notes && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-600">Notes:</span>
                              <p className="mt-1 text-gray-700">{lead.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          {lead.status === 'contacted' && (
                            <button
                              onClick={() => handleMarkInProgress(lead.id)}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-60"
                              disabled={actionLeadId === lead.id}
                            >
                              {actionLeadId === lead.id ? 'Updating...' : 'Mark In Progress'}
                            </button>
                          )}
                          {lead.status === 'in_progress' && (
                            <button
                              onClick={() => handleSubmitForApproval(lead.id)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-60"
                              disabled={actionLeadId === lead.id}
                            >
                              {actionLeadId === lead.id ? 'Submitting...' : 'Submit for Approval'}
                            </button>
                          )}
                          {lead.status === 'pending_approval' && canApprove && (
                            <button
                              onClick={() => handleViewDetails(lead.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Review for Approval
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(lead.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedLeadId !== null && (
        <LeadDetailModal
          leadId={selectedLeadId}
          isOpen={isLeadModalOpen}
          onClose={closeLeadModal}
          onUpdate={loadLeads}
        />
      )}

      {/* Direct Property Creation Modal */}
      <DirectPropertyCreationModal
        isOpen={directCreateModal}
        onClose={() => setDirectCreateModal(false)}
        onSuccess={() => {
          loadLeads();
          setDirectCreateModal(false);
        }}
      />
    </div>
  );
}
