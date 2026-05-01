import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Property {
  id: string;
  name: string;
  owner?: Owner;
}

interface AssignOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property: Property;
}

const AssignOwnerModal: React.FC<AssignOwnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  property,
}) => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOwners();
      setSelectedOwnerId(property.owner?.id || '');
    }
  }, [isOpen, property.owner?.id]);

  const loadOwners = async () => {
    try {
      setLoadingOwners(true);
      const response = await api.get('/api/internal/platform/owners', {
        params: {
          search: searchTerm || undefined,
          limit: 100
        }
      });
      setOwners(response.data.data || []);
    } catch (err: any) {
      console.error('Error loading owners:', err);
      setError('Failed to load property owners');
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerId) {
      setError('Please select an owner');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.put(`/internal/platform/properties/${property.id}/owner`, {
        newOwnerId: selectedOwnerId
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign owner');
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Property Owner</h2>
            <p className="text-sm text-gray-600 mt-1">Property: {property.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {property.owner && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Owner:</strong> {property.owner.name} ({property.owner.email})
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Owners
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={() => loadOwners()}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Owner *
            </label>
            {loadingOwners ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 mt-2">Loading owners...</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                {filteredOwners.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No owners found. Try adjusting your search.
                  </div>
                ) : (
                  filteredOwners.map((owner) => (
                    <label
                      key={owner.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="radio"
                        name="ownerId"
                        value={owner.id}
                        checked={selectedOwnerId === owner.id}
                        onChange={(e) => setSelectedOwnerId(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{owner.name}</div>
                        <div className="text-sm text-gray-600">{owner.email}</div>
                        {owner.phone && (
                          <div className="text-sm text-gray-500">{owner.phone}</div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedOwnerId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignOwnerModal;