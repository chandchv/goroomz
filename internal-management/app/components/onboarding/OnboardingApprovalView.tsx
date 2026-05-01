import { useState, useEffect } from 'react';
import { leadService, type Lead } from '../../services/leadService';
import OnboardingDetailModal from './OnboardingDetailModal';

interface OnboardingApprovalViewProps {
  territoryId?: string;
  onApprovalUpdate?: () => void;
}

export default function OnboardingApprovalView({ territoryId, onApprovalUpdate }: OnboardingApprovalViewProps) {
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'hotel' | 'pg'>('all');

  useEffect(() => {
    loadPendingApprovals();
  }, [territoryId, filter]);

  const normalizeLead = (lead: Lead & Record<string, any>): Lead => ({
    ...lead,
    email: lead.email || lead.propertyOwnerEmail || lead.contactEmail || '',
    phone: lead.phone || lead.propertyOwnerPhone || lead.contactPhone || '',
    createdAt: lead.createdAt || lead.created_at || lead.updatedAt || lead.updated_at || new Date().toISOString(),
    updatedAt: lead.updatedAt || lead.updated_at || lead.createdAt || lead.created_at || new Date().toISOString(),
  });

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        status: 'pending_approval',
      };

      if (territoryId) {
        filters.territoryId = territoryId;
      }

      if (filter !== 'all') {
        filters.propertyType = filter;
      }

      const response = await leadService.getLeads(filters);
      const normalizedLeads = (response.data || []).map(normalizeLead);
      setPendingLeads(normalizedLeads);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load pending approvals');
      console.error('Error loading pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleApprovalComplete = () => {
    setShowDetailModal(false);
    setSelectedLead(null);
    loadPendingApprovals();
    onApprovalUpdate?.();
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

  const getPropertyTypeColor = (type: string) => {
    return type === 'hotel' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pending Onboarding Approvals</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pendingLeads.length} onboarding{pendingLeads.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('hotel')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'hotel'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Hotels
          </button>
          <button
            onClick={() => setFilter('pg')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pg'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            PGs
          </button>
        </div>
      </div>

      {/* Pending Approvals List */}
      {pendingLeads.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending onboarding approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingLeads.map(lead => (
            <div
              key={lead.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{lead.businessName}</h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPropertyTypeColor(lead.propertyType)}`}>
                      {lead.propertyType.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Property Owner</div>
                      <div className="font-medium text-gray-900">{lead.propertyOwnerName}</div>
                      <div className="text-sm text-gray-600">{lead.email}</div>
                      <div className="text-sm text-gray-600">{lead.phone}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Location</div>
                      <div className="font-medium text-gray-900">{lead.city}, {lead.state}</div>
                      <div className="text-sm text-gray-600 mt-2">
                        Estimated Rooms: <span className="font-medium text-gray-900">{lead.estimatedRooms}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Agent: <span className="font-medium text-gray-900 ml-1">{lead.agent?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submitted: <span className="font-medium text-gray-900 ml-1">{formatDate(lead.updatedAt)}</span>
                      </div>
                  </div>

                  {lead.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Notes</div>
                      <div className="text-sm text-gray-900">{lead.notes}</div>
                    </div>
                  )}
                </div>

                <div className="ml-6">
                  <button
                    onClick={() => handleReview(lead)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLead && (
        <OnboardingDetailModal
          lead={selectedLead}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLead(null);
          }}
          onApprovalComplete={handleApprovalComplete}
        />
      )}
    </div>
  );
}
