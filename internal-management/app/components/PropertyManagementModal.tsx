import React, { useState, useEffect } from 'react';
import superuserService, { type Property, type PropertyOwner } from '../services/superuserService';

interface PropertyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProperty?: Property | null;
  defaultOwnerId?: string;
}

const PropertyManagementModal: React.FC<PropertyManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProperty,
  defaultOwnerId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Hotel' as 'Hotel' | 'PG',
    address: '',
    city: '',
    state: '',
    pincode: '',
    ownerId: '',
  });
  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('existing');
  const [newOwnerData, setNewOwnerData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owners, setOwners] = useState<PropertyOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingProperty) {
      setFormData({
        name: editingProperty.name,
        description: editingProperty.description || '',
        type: editingProperty.type,
        address: editingProperty.address || '',
        city: editingProperty.location?.city || '',
        state: editingProperty.location?.state || '',
        pincode: editingProperty.location?.pincode || '',
        ownerId: editingProperty.ownerId,
      });
      setShowTransferOwnership(false);
      setNewOwnerId('');
      setOwnerMode('existing');
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'Hotel',
        address: '',
        city: '',
        state: '',
        pincode: '',
        ownerId: defaultOwnerId || '',
      });
      setShowTransferOwnership(false);
      setNewOwnerId('');
      setOwnerMode(defaultOwnerId ? 'existing' : 'existing');
      setNewOwnerData({ name: '', email: '', phone: '' });
    }
    setError(null);
  }, [editingProperty, defaultOwnerId, isOpen]);

  const loadOwners = async () => {
    try {
      setLoadingOwners(true);
      const data = await superuserService.getPropertyOwners();
      setOwners(data);
    } catch (err: any) {
      console.error('Error loading property owners:', err);
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Property name is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Property description is required');
      return;
    }
    if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim()) {
      setError('Address, city, and state are required');
      return;
    }

    // Validate owner selection or new owner data
    if (ownerMode === 'existing' && !formData.ownerId) {
      setError('Please select a property owner');
      return;
    }
    if (ownerMode === 'new') {
      if (!newOwnerData.name.trim() || !newOwnerData.email.trim() || !newOwnerData.phone.trim()) {
        setError('Owner name, email, and phone are required');
        return;
      }
    }

    try {
      setLoading(true);

      let ownerId = formData.ownerId;

      // Create new owner if needed
      if (ownerMode === 'new' && !editingProperty) {
        const ownerResponse = await superuserService.createPropertyOwner({
          name: newOwnerData.name,
          email: newOwnerData.email,
          phone: newOwnerData.phone,
          role: 'owner',
          sendCredentials: true
        });
        ownerId = ownerResponse.owner.id;
      }

      if (editingProperty) {
        // Update existing property
        await superuserService.updateProperty(editingProperty.id, {
          name: formData.name,
          description: formData.description,
          location: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: 'India'
          }
        });
      } else {
        // Create new property
        await superuserService.createProperty({
          ownerId: ownerId,
          name: formData.name,
          description: formData.description,
          propertyType: formData.type,
          location: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: 'India'
          },
          amenities: [],
          rules: []
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save property');
      console.error('Error saving property:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!editingProperty || !newOwnerId) {
      setError('Please select a new owner');
      return;
    }

    if (!window.confirm('Are you sure you want to transfer ownership of this property?')) {
      return;
    }

    try {
      setLoading(true);
      await superuserService.transferPropertyOwnership(editingProperty.id, newOwnerId);
      alert('Property ownership transferred successfully');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer ownership');
      console.error('Error transferring ownership:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettingsDescription = (type: 'Hotel' | 'PG') => {
    if (type === 'Hotel') {
      return 'Daily pricing, check-in/check-out workflow, room-level booking';
    } else {
      return 'Monthly pricing, bed-level booking for shared rooms, payment schedules';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Property Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Describe the property..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  disabled={!!editingProperty}
                >
                  <option value="Hotel">Hotel (Daily Basis)</option>
                  <option value="PG">PG (Monthly Basis)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Default settings: {getDefaultSettingsDescription(formData.type)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Optional"
                />
              </div>

              {/* Property Owner Section */}
              {!editingProperty && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Property Owner <span className="text-red-500">*</span>
                  </label>

                  {/* Toggle between existing and new owner */}
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setOwnerMode('existing')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        ownerMode === 'existing'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Select Existing Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setOwnerMode('new')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        ownerMode === 'new'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Create New Owner
                    </button>
                  </div>

                  {/* Existing Owner Selection */}
                  {ownerMode === 'existing' && (
                    <div>
                      <select
                        name="ownerId"
                        value={formData.ownerId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required={ownerMode === 'existing'}
                        disabled={loadingOwners}
                      >
                        <option value="">Select Owner</option>
                        {owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name} ({owner.email})
                          </option>
                        ))}
                      </select>
                      {loadingOwners && (
                        <p className="mt-1 text-xs text-gray-500">Loading owners...</p>
                      )}
                    </div>
                  )}

                  {/* New Owner Form */}
                  {ownerMode === 'new' && (
                    <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700 mb-2">
                        Create a new property owner account. Login credentials will be sent via email.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Owner Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newOwnerData.name}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Full name"
                          required={ownerMode === 'new'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newOwnerData.email}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="owner@example.com"
                          required={ownerMode === 'new'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={newOwnerData.phone}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="10-digit phone number"
                          required={ownerMode === 'new'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show owner for editing mode */}
              {editingProperty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Owner
                  </label>
                  <select
                    name="ownerId"
                    value={formData.ownerId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900"
                    disabled
                  >
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} ({owner.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Use "Transfer Ownership" below to change the owner
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transfer Ownership Section (only for editing) */}
          {editingProperty && (
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Transfer Ownership</h3>
                <button
                  type="button"
                  onClick={() => setShowTransferOwnership(!showTransferOwnership)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showTransferOwnership ? 'Cancel Transfer' : 'Transfer to Another Owner'}
                </button>
              </div>

              {showTransferOwnership && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Owner <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newOwnerId}
                      onChange={(e) => setNewOwnerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      disabled={loadingOwners}
                    >
                      <option value="">Select New Owner</option>
                      {owners
                        .filter((owner) => owner.id !== formData.ownerId)
                        .map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name} ({owner.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleTransferOwnership}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-orange-300"
                    disabled={!newOwnerId || loading}
                  >
                    {loading ? 'Transferring...' : 'Transfer Ownership'}
                  </button>

                  <p className="text-xs text-gray-600">
                    Note: All property data and bookings will be preserved during the transfer.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Saving...' : editingProperty ? 'Update Property' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyManagementModal;
