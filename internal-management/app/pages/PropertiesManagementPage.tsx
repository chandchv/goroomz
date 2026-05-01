import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import ChangeOwnerModal from '../components/properties/ChangeOwnerModal';
import AssignOwnerModal from '../components/properties/AssignOwnerModal';
import DirectPropertyCreationModal from '../components/properties/DirectPropertyCreationModal';

interface Property {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  totalRooms?: number;
  occupiedRooms?: number;
  occupancyRate?: number;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'active' | 'inactive' | 'onboarding';
  createdAt: string;
}

export default function PropertiesManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<Property[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [changeOwnerModal, setChangeOwnerModal] = useState<{
    isOpen: boolean;
    property: Property | null;
  }>({ isOpen: false, property: null });
  const [assignOwnerModal, setAssignOwnerModal] = useState<{
    isOpen: boolean;
    property: Property | null;
  }>({ isOpen: false, property: null });
  const [directCreateModal, setDirectCreateModal] = useState(false);

  // Check if user can create properties directly (superuser or platform_admin)
  const canCreateDirectly = user?.role === 'admin' || 
                            user?.internalRole === 'platform_admin' || 
                            user?.internalRole === 'superuser';

  // Debounce search input — wait 300ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Fetch suggestions for autocomplete (min 2 chars)
    if (searchTerm.length >= 2) {
      setSuggestionsLoading(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const isPlatformStaff = !!user?.internalRole || user?.role === 'superuser' || user?.role === 'admin' || user?.role === 'category_owner';
          const endpoint = isPlatformStaff ? '/api/internal/platform/properties' : '/api/internal/properties';
          const response = await api.get(endpoint, {
            params: { search: searchTerm, limit: 8 }
          });
          const results = (response.data.data || []).map((prop: any) => ({
            id: prop.id,
            name: prop.title || prop.name || 'Unnamed',
            type: typeof prop.category === 'object' ? prop.category?.name || '' : prop.category || prop.type || '',
            city: prop.location?.city || '',
            owner: { id: prop.owner?.id || '', name: prop.owner?.name || '', email: prop.owner?.email || '' },
            status: prop.isActive ? 'active' : 'inactive',
          }));
          setSuggestions(results);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        } finally {
          setSuggestionsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
    }

    // Also update debounced search for the main table
    const tableTimer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      clearTimeout(tableTimer);
    };
  }, [searchTerm]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch properties when debounced search or filters change
  useEffect(() => {
    loadProperties();
  }, [debouncedSearch, filterStatus, filterType]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which endpoint to use based on user type
      // Platform staff (with internalRole or superuser role) use platform endpoint
      // Property owners use regular properties endpoint
      const isPlatformStaff = !!user?.internalRole || user?.role === 'superuser' || user?.role === 'admin' || user?.role === 'category_owner';
      
      let allProperties: Property[] = [];

      if (isPlatformStaff) {
        // Platform staff: Use platform properties endpoint
        const response = await api.get('/api/internal/platform/properties', {
          params: {
            search: debouncedSearch || undefined,
            status: filterStatus || undefined,
            category: filterType || undefined,
            limit: 1000
          }
        });

        // Map the response to our Property interface
        allProperties = response.data.data.map((prop: any) => ({
          id: prop.id,
          name: prop.title || prop.name,
          type: typeof prop.category === 'object' ? prop.category?.name || 'hostel' : prop.category || 'hostel',
          address: prop.location?.address,
          city: prop.location?.city,
          state: prop.location?.state,
          totalRooms: prop.statistics?.totalRooms || 0,
          occupiedRooms: prop.statistics?.occupiedRooms || 0,
          occupancyRate: prop.statistics?.occupiedRooms && prop.statistics?.totalRooms 
            ? (prop.statistics.occupiedRooms / prop.statistics.totalRooms) * 100 
            : 0,
          owner: {
            id: prop.owner?.id || '',
            name: prop.owner?.name || 'Unknown',
            email: prop.owner?.email || '',
          },
          status: prop.isActive ? 'active' : 'inactive',
          createdAt: prop.createdAt,
        }));
      } else {
        // Property owners: Use internal properties endpoint (automatically scoped to their properties)
        console.log('Fetching properties for property owner:', user?.id, user?.email);
        const response = await api.get('/api/internal/properties', {
          params: {
            search: debouncedSearch || undefined,
            status: filterStatus || undefined,
            category: filterType || undefined,
            limit: 1000
          }
        });

        console.log('Properties API response:', response.data);
        
        // Map the response to our Property interface
        allProperties = response.data.data.map((prop: any) => ({
          id: prop.id,
          name: prop.name || 'Unnamed Property',
          type: typeof prop.type === 'object' ? prop.type?.name || 'hostel' : prop.type || 'hostel',
          address: prop.address?.street || prop.location?.address,
          city: prop.address?.city || prop.location?.city,
          state: prop.address?.state || prop.location?.state,
          totalRooms: prop.totalRooms ?? prop.statistics?.totalRooms ?? 0,
          occupiedRooms: prop.occupiedRooms ?? prop.statistics?.occupiedRooms ?? 0,
          occupancyRate: (() => {
            const total = prop.totalRooms ?? prop.statistics?.totalRooms ?? 0;
            const occupied = prop.occupiedRooms ?? prop.statistics?.occupiedRooms ?? 0;
            if (prop.occupancyRate != null) return prop.occupancyRate;
            return total > 0 ? (occupied / total) * 100 : 0;
          })(),
          owner: {
            id: prop.owner?.id || prop.ownerId || user?.id || '',
            name: prop.owner?.name || prop.ownerName || user?.name || 'You',
            email: prop.owner?.email || prop.ownerEmail || user?.email || '',
          },
          status: prop.status || (prop.isActive ? 'active' : 'inactive'),
          createdAt: prop.createdAt,
        }))
      }

      setProperties(allProperties);
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const [navigatingToProperty, setNavigatingToProperty] = useState<string | null>(null);

  const handleViewProperty = (propertyId: string) => {
    setNavigatingToProperty(propertyId);
    // Navigate to property detail page
    navigate(`/properties/${propertyId}`);
  };

  const handleViewOwner = (ownerId: string) => {
    navigate(`/property-owners/${ownerId}`);
  };

  const handleChangeOwner = (property: Property) => {
    setChangeOwnerModal({ isOpen: true, property });
  };

  const handleAssignOwner = (property: Property) => {
    setAssignOwnerModal({ isOpen: true, property });
  };

  const handleChangeOwnerSuccess = () => {
    loadProperties();
  };

  const handleAssignOwnerSuccess = () => {
    loadProperties();
  };

  const formatOccupancy = (rate?: number) => {
    if (rate === undefined) return 'N/A';
    return `${Math.round(rate)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Properties Management</h1>
          <p className="text-gray-600">View and manage all properties on the platform</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/property-owners')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 whitespace-nowrap"
          >
            Manage Owners
          </button>
          {canCreateDirectly && (
            <button
              onClick={() => setDirectCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 whitespace-nowrap"
              title="Create property directly without lead workflow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Direct Create
            </button>
          )}
          <button
            onClick={() => navigate('/property-onboarding')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Onboard Property
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Properties</div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{properties.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Active Properties</div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {properties.filter(p => p.status === 'active').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Rooms</div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {properties.reduce((sum, p) => sum + (p.totalRooms || 0), 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Avg Occupancy</div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {properties.length > 0
              ? Math.round(
                  properties.reduce((sum, p) => sum + (p.occupancyRate || 0), 0) / properties.length
                )
              : 0}%
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by property name, owner, city, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setSuggestions([]); setShowSuggestions(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {suggestionsLoading && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                </div>
                {suggestions.map((prop) => (
                  <button
                    key={prop.id}
                    onClick={() => {
                      setShowSuggestions(false);
                      navigate(`/properties/${prop.id}`);
                    }}
                    className="w-full text-left px-3 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{prop.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {prop.type && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {prop.type}
                            </span>
                          )}
                          {prop.city && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {prop.city}
                            </span>
                          )}
                          {prop.owner?.name && (
                            <span className="text-xs text-gray-500">
                              by {prop.owner.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
                {searchTerm.length >= 2 && (
                  <button
                    onClick={() => { setShowSuggestions(false); setDebouncedSearch(searchTerm); }}
                    className="w-full text-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium border-t border-gray-100"
                  >
                    View all results for "{searchTerm}"
                  </button>
                )}
              </div>
            )}

            {/* No results message */}
            {showSuggestions && searchTerm.length >= 2 && suggestions.length === 0 && !suggestionsLoading && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="px-4 py-6 text-center text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">No properties found for "{searchTerm}"</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="onboarding">Onboarding</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Types</option>
              <option value="hostel">Hostel</option>
              <option value="pg">PG</option>
              <option value="hotel">Hotel</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        {properties.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mb-2 font-medium">No properties found</p>
            <p className="text-sm">Start by onboarding your first property</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Location
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Rooms
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Occupancy
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{property.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {typeof property.type === 'object' ? property.type?.name : property.type}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    {property.owner ? (
                      <button
                        onClick={() => handleViewOwner(property.owner.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm truncate max-w-[150px] block"
                        title={property.owner.name}
                      >
                        {property.owner.name}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm italic">No owner assigned</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-900">{property.city || '-'}</div>
                    <div className="text-xs text-gray-500">{property.state || '-'}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                    <div className="text-sm text-gray-900">
                      {property.totalRooms || 0}
                    </div>
                    {property.occupiedRooms !== undefined && (
                      <div className="text-xs text-gray-500">
                        {property.occupiedRooms} occ.
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {formatOccupancy(property.occupancyRate)}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        property.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : property.status === 'onboarding'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {property.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewProperty(property.id)}
                        disabled={navigatingToProperty === property.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="View Details"
                      >
                        {navigatingToProperty === property.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs">Loading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-xs">View Details</span>
                          </>
                        )}
                      </button>
                      {(user?.internalRole || user?.role === 'superuser' || user?.role === 'admin' || user?.role === 'category_owner') && (
                        <>
                          {property.owner ? (
                            <button
                              onClick={() => handleChangeOwner(property)}
                              className="text-purple-600 hover:text-purple-900 px-2 py-1"
                              title="Change Owner"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignOwner(property)}
                              className="text-green-600 hover:text-green-900 px-2 py-1"
                              title="Assign Owner"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Change Owner Modal */}
      {changeOwnerModal.property && (
        <ChangeOwnerModal
          isOpen={changeOwnerModal.isOpen}
          onClose={() => setChangeOwnerModal({ isOpen: false, property: null })}
          property={changeOwnerModal.property}
          onSuccess={handleChangeOwnerSuccess}
        />
      )}

      {assignOwnerModal.property && (
        <AssignOwnerModal
          isOpen={assignOwnerModal.isOpen}
          onClose={() => setAssignOwnerModal({ isOpen: false, property: null })}
          property={assignOwnerModal.property}
          onSuccess={handleAssignOwnerSuccess}
        />
      )}

      {/* Direct Property Creation Modal */}
      <DirectPropertyCreationModal
        isOpen={directCreateModal}
        onClose={() => setDirectCreateModal(false)}
        onSuccess={() => {
          loadProperties();
          setDirectCreateModal(false);
        }}
      />
    </div>
  );
}
