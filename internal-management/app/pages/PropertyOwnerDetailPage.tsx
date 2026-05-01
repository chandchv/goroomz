import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import superuserService, { type PropertyOwner } from '../services/superuserService';

const PropertyOwnerDetailPage: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const [owner, setOwner] = useState<PropertyOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  useEffect(() => {
    if (ownerId) {
      loadOwnerDetails();
    }
  }, [ownerId]);

  const loadOwnerDetails = async () => {
    if (!ownerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await superuserService.getPropertyOwner(ownerId);
      setOwner(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load property owner details');
      console.error('Error loading property owner:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!owner || !deactivateConfirm) {
      setDeactivateConfirm(true);
      return;
    }

    try {
      await superuserService.deactivatePropertyOwner(owner.id);
      alert('Property owner deactivated successfully');
      navigate('/property-owners');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate property owner');
      setDeactivateConfirm(false);
    }
  };

  const handleBack = () => {
    navigate('/property-owners');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property owner details...</p>
        </div>
      </div>
    );
  }

  if (error || !owner) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Property owner not found'}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{owner.name}</h1>
            <p className="text-gray-600">Property Owner Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {owner.isVerified && (
            <button
              onClick={handleDeactivate}
              className={`px-4 py-2 rounded ${
                deactivateConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-600 text-red-600 hover:bg-red-50'
              }`}
            >
              {deactivateConfirm ? 'Confirm Deactivate?' : 'Deactivate Account'}
            </button>
          )}
          {deactivateConfirm && (
            <button
              onClick={() => setDeactivateConfirm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Owner Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Owner Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-gray-900">{owner.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{owner.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900">{owner.phone || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    owner.isVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {owner.isVerified ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                <p className="text-gray-900">{new Date(owner.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                <p className="text-gray-900">{new Date(owner.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Total Properties</label>
                <p className="text-2xl font-bold text-gray-900">{owner.propertiesCount || 0}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Subscription Status</label>
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Properties Owned</h2>
        
        {!owner.properties || owner.properties.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No properties found</p>
        ) : (
          <div className="space-y-4">
            {owner.properties.map((property) => (
              <div
                key={property.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Type: <span className="font-medium">{property.type}</span>
                    </p>
                    {property.address && (
                      <p className="text-sm text-gray-600 mt-1">{property.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {property.totalRooms !== undefined && (
                      <p className="text-sm text-gray-600">
                        {property.totalRooms} rooms
                      </p>
                    )}
                    {property.occupancyRate !== undefined && (
                      <p className="text-sm text-gray-600">
                        {property.occupancyRate}% occupancy
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Activity Log */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Activity</h2>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Account created</p>
              <p className="text-xs text-gray-500">{new Date(owner.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          {owner.updatedAt !== owner.createdAt && (
            <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Account updated</p>
                <p className="text-xs text-gray-500">{new Date(owner.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">More activity logs coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOwnerDetailPage;
