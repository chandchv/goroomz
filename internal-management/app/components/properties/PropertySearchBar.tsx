import { useState } from 'react';

export interface PropertySearchResult {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  type: string;
  city: string;
  state: string;
  roomCount: number;
  occupancyRate: number;
  status: string;
}

interface PropertySearchBarProps {
  onPropertySelect: (property: PropertySearchResult) => void;
}

export default function PropertySearchBar({ onPropertySelect }: PropertySearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PropertySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await api.get('/api/internal/search', {
      //   params: { query: searchQuery, type: 'property' }
      // });
      // setSearchResults(response.data.data);

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setSearchResults([
        {
          id: '1',
          name: 'Sample Property 1',
          ownerName: 'John Doe',
          ownerEmail: 'john@example.com',
          type: 'hotel',
          city: 'Mumbai',
          state: 'Maharashtra',
          roomCount: 25,
          occupancyRate: 75,
          status: 'active',
        },
        {
          id: '2',
          name: 'Sample Property 2',
          ownerName: 'Jane Smith',
          ownerEmail: 'jane@example.com',
          type: 'pg',
          city: 'Pune',
          state: 'Maharashtra',
          roomCount: 15,
          occupancyRate: 60,
          status: 'active',
        },
      ]);

      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search properties');
      console.error('Error searching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProperty = (property: PropertySearchResult) => {
    onPropertySelect(property);
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search properties by name, owner, email, or location..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {loading && (
            <div className="absolute right-3 top-3.5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-sm text-gray-600 px-3 py-2 border-b border-gray-200 text-gray-900">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
            {searchResults.map(property => (
              <button
                key={property.id}
                onClick={() => handleSelectProperty(property)}
                className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{property.name}</h4>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {property.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Owner: {property.ownerName} ({property.ownerEmail})
                    </p>
                    <p className="text-sm text-gray-500">
                      {property.city}, {property.state} • {property.roomCount} rooms • {property.occupancyRate}% occupancy
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && searchResults.length === 0 && !loading && searchQuery && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No properties found matching "{searchQuery}"</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute z-10 w-full mt-2 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
