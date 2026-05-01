import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import superuserService, { type PropertyOwner } from '../services/superuserService';
import PropertyOwnerModal from '../components/PropertyOwnerModal';
import PropertyManagementModal from '../components/PropertyManagementModal';

const PropertyOwnerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<PropertyOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<PropertyOwner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    loadOwners();
  }, [debouncedSearch, filterStatus]);

  const loadOwners = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (debouncedSearch) filters.search = debouncedSearch;
      if (filterStatus) filters.status = filterStatus;
      
      const data = await superuserService.getPropertyOwners(filters);
      setOwners(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load property owners');
      console.error('Error loading property owners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingOwner(null);
    setShowModal(true);
  };

  const handleEdit = (owner: PropertyOwner) => {
    setEditingOwner(owner);
    setShowModal(true);
  };

  const handleViewDetails = (ownerId: string) => {
    navigate(`/property-owners/${ownerId}`);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingOwner(null);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingOwner(null);
    loadOwners();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Owner Management</h1>
          <p className="text-gray-600">Manage property owners and their accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPropertyModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Create Property
          </button>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property Owner
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Owners Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {owners.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No property owners found</p>
            <p className="text-sm">Create your first property owner account to get started</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{owners.length}</p>
                <p className="text-xs text-gray-500">Total Owners</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{owners.filter(o => o.isVerified).length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{owners.reduce((sum, o) => sum + (o.propertiesCount || 0), 0)}</p>
                <p className="text-xs text-gray-500">Total Properties</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{owners.reduce((sum, o) => sum + ((o as any).totalRooms || 0), 0)}</p>
                <p className="text-xs text-gray-500">Total Rooms</p>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rooms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {owners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(owner.id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {(owner.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{owner.name}</div>
                          {(owner as any).propertyTypes && (
                            <div className="text-xs text-gray-400 mt-0.5">{(owner as any).propertyTypes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{owner.email}</div>
                      <div className="text-xs text-gray-500">{owner.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {owner.propertiesCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(owner.propertiesCount || 0) === 1 ? 'property' : 'properties'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{(owner as any).totalRooms || 0}</div>
                      <div className="text-xs text-gray-500">rooms</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{(owner as any).cities || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          owner.isVerified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {owner.isVerified ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(owner.id)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(owner)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Property Owner Modal */}
      <PropertyOwnerModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingOwner={editingOwner}
      />

      {/* Property Management Modal */}
      <PropertyManagementModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSuccess={() => {
          setShowPropertyModal(false);
          loadOwners(); // Refresh the list
        }}
      />
    </div>
  );
};

export default PropertyOwnerManagementPage;
