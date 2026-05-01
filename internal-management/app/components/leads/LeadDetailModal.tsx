import { useState, useEffect } from 'react';
import { leadService, type Lead, type LeadCommunication } from '../../services/leadService';
import CommunicationTimeline from './CommunicationTimeline';

interface LeadDetailModalProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LeadDetailModal({ leadId, isOpen, onClose, onUpdate }: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [communications, setCommunications] = useState<LeadCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'communications'>('details');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      loadLeadData();
    }
  }, [isOpen, leadId]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [leadData, communicationsData] = await Promise.all([
        leadService.getLeadById(leadId),
        leadService.getCommunications(leadId),
      ]);

      setLead(leadData);
      setCommunications(communicationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load lead data');
      console.error('Error loading lead data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead) return;

    try {
      setActionLoading(true);
      setError(null);
      await leadService.updateLeadStatus(lead.id, { status: newStatus });
      await loadLeadData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
      console.error('Error updating status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!lead) return;

    try {
      setActionLoading(true);
      setError(null);
      await leadService.submitForApproval(lead.id);
      await loadLeadData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit for approval');
      console.error('Error submitting for approval:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : lead ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex px-6">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'details'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('communications')}
                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'communications'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Communications ({communications.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'details' ? (
                  <div className="space-y-6">
                    {/* Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead.status === 'contacted' && (
                          <button
                            onClick={() => handleStatusChange('in_progress')}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-60"
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Updating...' : 'Mark In Progress'}
                          </button>
                        )}
                        {lead.status === 'in_progress' && (
                          <button
                            onClick={handleSubmitForApproval}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-60"
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Submitting...' : 'Submit for Approval'}
                          </button>
                        )}
                        {lead.status === 'pending_approval' && (
                          <span className="text-sm text-gray-600">Awaiting approval...</span>
                        )}
                      </div>
                    </div>

                    {/* Property Owner Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Owner Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="text-sm font-medium text-gray-900">{lead.propertyOwnerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Business Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Business Name</p>
                          <p className="text-sm font-medium text-gray-900">{lead.businessName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Property Type</p>
                          <p className="text-sm font-medium text-gray-900">{lead.propertyType.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Estimated Rooms</p>
                          <p className="text-sm font-medium text-gray-900">{lead.estimatedRooms}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Lead Source</p>
                          <p className="text-sm font-medium text-gray-900">{lead.source}</p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="text-sm font-medium text-gray-900">{lead.address}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">City</p>
                            <p className="text-sm font-medium text-gray-900">{lead.city}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">State</p>
                            <p className="text-sm font-medium text-gray-900">{lead.state}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Country</p>
                            <p className="text-sm font-medium text-gray-900">{lead.country}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Agent</p>
                          <p className="text-sm font-medium text-gray-900">{lead.agent?.name || 'N/A'}</p>
                        </div>
                        {lead.territory && (
                          <div>
                            <p className="text-sm text-gray-600">Territory</p>
                            <p className="text-sm font-medium text-gray-900">{lead.territory.name}</p>
                          </div>
                        )}
                        {lead.expectedCloseDate && (
                          <div>
                            <p className="text-sm text-gray-600">Expected Close Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(lead.expectedCloseDate)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(lead.createdAt)}</p>
                        </div>
                      </div>
                      {lead.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">Notes</p>
                          <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                        </div>
                      )}
                      {lead.rejectionReason && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">Rejection Reason</p>
                          <p className="text-sm font-medium text-red-600 whitespace-pre-wrap">{lead.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <CommunicationTimeline
                    leadId={leadId}
                    communications={communications}
                    onUpdate={loadLeadData}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
