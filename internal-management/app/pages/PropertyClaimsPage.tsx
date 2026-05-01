import React, { useState, useEffect } from 'react';
import { Building, CheckCircle, XCircle, Clock, Eye, Phone, Mail, MapPin, X } from 'lucide-react';

interface PropertyClaim {
  id: string;
  propertyId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  businessName?: string;
  proofOfOwnership: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  verificationNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  property?: {
    id: string;
    name: string;
    location: { address: string; area: string; city: string };
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Simple inline toast component
const SimpleToast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-2`}>
    {message}
    <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-4 h-4" /></button>
  </div>
);

export default function PropertyClaimsPage() {
  const [claims, setClaims] = useState<PropertyClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedClaim, setSelectedClaim] = useState<PropertyClaim | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadClaims(); }, [statusFilter]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClaims = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/properties/admin/claims?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setClaims(data.data);
    } catch {
      showToast('Failed to load claims', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const handleReview = async () => {
    if (!selectedClaim || !reviewAction) return;
    if (reviewAction === 'reject' && !rejectionReason) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/properties/admin/claims/${selectedClaim.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: reviewAction,
          notes: reviewNotes,
          rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Claim ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
        closeModal();
        loadClaims();
      } else {
        showToast(data.message || 'Failed to process claim', 'error');
      }
    } catch {
      showToast('Failed to process claim', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedClaim(null);
    setReviewAction(null);
    setReviewNotes('');
    setRejectionReason('');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      under_review: <Eye className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {icons[status]} {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };


  return (
    <div className="p-6 space-y-6">
      {toast && <SimpleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="w-6 h-6" /> Property Claims
          </h1>
          <p className="text-gray-500">Review and manage property ownership claims</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse h-32" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No claims found</h3>
          <p className="text-gray-500">No {statusFilter} claims at the moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{claim.property?.name || 'Unknown Property'}</h3>
                    {getStatusBadge(claim.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {claim.property?.location?.area}, {claim.property?.location?.city}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="font-medium">Claimant</p>
                      <p>{claim.claimantName}</p>
                      {claim.businessName && <p className="text-gray-500">{claim.businessName}</p>}
                    </div>
                    <div>
                      <p className="font-medium">Contact</p>
                      <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {claim.claimantPhone}</p>
                      <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {claim.claimantEmail}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="font-medium text-sm">Proof of Ownership</p>
                    <p className="text-sm text-gray-500">{claim.proofOfOwnership}</p>
                  </div>
                </div>
                {claim.status === 'pending' && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => { setSelectedClaim(claim); setReviewAction('approve'); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => { setSelectedClaim(claim); setReviewAction('reject'); }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Review Modal */}
      {selectedClaim && reviewAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {reviewAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-1">Property</p>
                <p className="text-gray-500">{selectedClaim.property?.name}</p>
              </div>
              <div>
                <p className="font-medium mb-1">Claimant</p>
                <p className="text-gray-500">{selectedClaim.claimantName} ({selectedClaim.claimantEmail})</p>
              </div>
              <div>
                <label className="font-medium block mb-1">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this review..."
                  className="w-full px-3 py-2 border rounded-lg resize-none h-20"
                />
              </div>
              {reviewAction === 'reject' && (
                <div>
                  <label className="font-medium block mb-1">Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this claim is being rejected..."
                    className="w-full px-3 py-2 border rounded-lg resize-none h-20"
                    required
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
