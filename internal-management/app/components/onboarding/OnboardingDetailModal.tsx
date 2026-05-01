import { useState, useEffect } from 'react';
import { leadService, type Lead } from '../../services/leadService';
import DocumentViewer from './DocumentViewer';

interface OnboardingDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onApprovalComplete: () => void;
}

export default function OnboardingDetailModal({ lead, onClose, onApprovalComplete }: OnboardingDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'communications'>('details');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communications, setCommunications] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'communications') {
      loadCommunications();
    }
  }, [activeTab]);

  const loadCommunications = async () => {
    try {
      const communications = await leadService.getCommunications(lead.id);
      setCommunications(communications);
    } catch (err: any) {
      console.error('Error loading communications:', err);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this onboarding? This will activate the property and send credentials to the owner.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await leadService.approveLead(lead.id);
      onApprovalComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve onboarding');
      console.error('Error approving onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await leadService.rejectLead(lead.id, rejectionReason);
      onApprovalComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject onboarding');
      console.error('Error rejecting onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{lead.businessName}</h2>
            <p className="text-sm text-gray-600">Onboarding Review</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Property Details
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'communications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Communications
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Property Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Owner Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <div className="text-sm text-gray-600">Name</div>
                    <div className="font-medium text-gray-900">{lead.propertyOwnerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium text-gray-900">{lead.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium text-gray-900">{lead.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Business Name</div>
                    <div className="font-medium text-gray-900">{lead.businessName}</div>
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <div className="text-sm text-gray-600">Property Type</div>
                    <div className="font-medium text-gray-900 capitalize">{lead.propertyType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Estimated Rooms</div>
                    <div className="font-medium text-gray-900">{lead.estimatedRooms}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">Address</div>
                    <div className="font-medium text-gray-900">{lead.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">City</div>
                    <div className="font-medium text-gray-900">{lead.city}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">State</div>
                    <div className="font-medium text-gray-900">{lead.state}</div>
                  </div>
                </div>
              </div>

              {/* Agent Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Agent Name</div>
                      <div className="font-medium text-gray-900">{lead.agent?.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Lead Source</div>
                      <div className="font-medium text-gray-900 capitalize">{lead.source || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Created Date</div>
                      <div className="font-medium text-gray-900">{formatDate(lead.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Submitted Date</div>
                      <div className="font-medium text-gray-900">{formatDate(lead.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900">{lead.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentViewer leadId={lead.id} />
          )}

          {activeTab === 'communications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication History</h3>
              {communications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No communications recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm: any) => (
                    <div key={comm.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            comm.type === 'call' ? 'bg-blue-100 text-blue-800' :
                            comm.type === 'email' ? 'bg-green-100 text-green-800' :
                            comm.type === 'meeting' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comm.type}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{comm.subject}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(comm.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comm.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {!showRejectForm ? (
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Close
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Approve Onboarding'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  placeholder="Please provide a detailed reason for rejection..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  disabled={loading || !rejectionReason.trim()}
                >
                  {loading ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
