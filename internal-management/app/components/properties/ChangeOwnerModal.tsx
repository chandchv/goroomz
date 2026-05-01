import { useState, useEffect } from 'react';
import superuserService, { type PropertyOwner } from '../../services/superuserService';
import api from '../../services/api';

interface ChangeOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
  onSuccess: () => void;
}

export default function ChangeOwnerModal({ isOpen, onClose, property, onSuccess }: ChangeOwnerModalProps) {
  const [owners, setOwners] = useState<PropertyOwner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOwners();
      setSelectedOwnerId('');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const loadOwners = async () => {
    try {
      setLoadingOwners(true);
      
      // Use the new endpoint that gets actual users with owner role
      const response = await api.get('/api/internal/superuser/users/owners');
      const data = response.data?.data?.propertyOwners || [];
      
      console.log('Loaded property owners:', data);
      
      // Filter out current owner and ensure valid data
      const filteredOwners = data.filter((owner: PropertyOwner) => {
        // Skip if no ID or same as current owner
        if (!owner.id || owner.id === property.owner.id) {
          return false;
        }
        
        // Skip owners with missing essential data
        if (!owner.name || !owner.email) {
          console.warn('Property owner with missing data:', owner);
          return false;
        }
        
        return true;
      });
      
      setOwners(filteredOwners);
    } catch (err: any) {
      console.error('Error loading property owners:', err);
      
      // Fallback to the old endpoint if the new one fails
      try {
        const data = await superuserService.getPropertyOwners({});
        const filteredOwners = data.filter((owner: PropertyOwner) => {
          if (!owner.id || owner.id === property.owner.id) {
            return false;
          }
          if (!owner.name || !owner.email) {
            return false;
          }
          return true;
        });
        setOwners(filteredOwners);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Failed to load property owners');
      }
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOwnerId) {
      setError('Please select a new owner');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.put(`/api/internal/platform/properties/${property.id}/owner`, {
        newOwnerId: selectedOwnerId,
        reason: reason.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to change property owner');
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = owners.filter(owner => {
    // Skip owners with missing essential data
    if (!owner.name || !owner.email) {
      return false;
    }
    
    // Apply search filter
    return owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           owner.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOwner = owners.find(o => o.id === selectedOwnerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Change Property Owner</h2>
            <p className="text-sm text-gray-600 mt-1">Property: {property.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Current Owner */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Owner
            </label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {property.owner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{property.owner.name}</div>
                <div className="text-sm text-gray-600">{property.owner.email}</div>
              </div>
            </div>
          </div>

          {/* New Owner Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Owner <span className="text-red-500">*</span>
            </label>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search owners by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-gray-900"
            />

            {loadingOwners ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading owners...
              </div>
            ) : filteredOwners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {searchTerm ? 'No owners found matching your search' : 'No other property owners available'}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {filteredOwners.map((owner) => (
                  <label
                    key={owner.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                      selectedOwnerId === owner.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="newOwner"
                      value={owner.id}
                      checked={selectedOwnerId === owner.id}
                      onChange={(e) => setSelectedOwnerId(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-semibold">
                        {owner.name ? owner.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{owner.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600 truncate">{owner.email || 'No email'}</div>
                      {owner.phone && (
                        <div className="text-sm text-gray-500">{owner.phone}</div>
                      )}
                    </div>
                    {owner.properties && owner.properties.length > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {owner.properties.length} {owner.properties.length === 1 ? 'property' : 'properties'}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Owner Preview */}
          {selectedOwner && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-green-900">
                    Property will be transferred to:
                  </div>
                  <div className="text-sm text-green-800 mt-1">
                    {selectedOwner.name || 'Unknown'} ({selectedOwner.email || 'No email'})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for changing property owner..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will be logged in the audit trail
            </p>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will transfer ownership of this property and all its associated data (rooms, bookings, etc.) to the new owner. This action is logged and can be audited.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedOwnerId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Changing Owner...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Change Owner
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
