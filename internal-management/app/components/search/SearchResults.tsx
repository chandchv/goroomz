import type { SearchResponse, PropertySearchResult, OwnerSearchResult, LeadSearchResult } from '../../services/searchService';

interface SearchResultsProps {
  results: SearchResponse;
  query: string;
  onResultClick: (result: any) => void;
}

export default function SearchResults({ results, query, onResultClick }: SearchResultsProps) {
  const { properties, owners, leads } = results.results;
  const hasResults = properties.count > 0 || owners.count > 0 || leads.count > 0;

  if (!hasResults) {
    return (
      <div className="p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          No results found for "<span className="font-medium">{query}</span>"
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Try searching with different keywords
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* Summary */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} for "
          <span className="font-medium">{query}</span>"
        </p>
      </div>

      {/* Properties Section */}
      {properties.count > 0 && (
        <div className="py-2">
          <div className="px-4 py-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Properties ({properties.count})
            </h3>
          </div>
          <div className="space-y-1">
            {properties.data.map((property) => (
              <PropertyResultItem
                key={property.id}
                property={property}
                onClick={() => onResultClick(property)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Owners Section */}
      {owners.count > 0 && (
        <div className="py-2 border-t border-gray-100">
          <div className="px-4 py-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Property Owners ({owners.count})
            </h3>
          </div>
          <div className="space-y-1">
            {owners.data.map((owner) => (
              <OwnerResultItem
                key={owner.id}
                owner={owner}
                onClick={() => onResultClick(owner)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leads Section */}
      {leads.count > 0 && (
        <div className="py-2 border-t border-gray-100">
          <div className="px-4 py-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Leads ({leads.count})
            </h3>
          </div>
          <div className="space-y-1">
            {leads.data.map((lead) => (
              <LeadResultItem
                key={lead.id}
                lead={lead}
                onClick={() => onResultClick(lead)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Property Result Item Component
function PropertyResultItem({
  property,
  onClick
}: {
  property: PropertySearchResult;
  onClick: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors focus:outline-none focus:bg-gray-50"
    >
      <div className="flex items-start space-x-3">
        {/* Property Image or Icon */}
        {property.primaryImage ? (
          <img
            src={property.primaryImage}
            alt={property.title}
            className="w-12 h-12 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
        )}

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {property.title}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {property.roomNumber && `Room ${property.roomNumber} • `}
                {property.location?.city || 'Location not specified'}
              </p>
            </div>
            <span
              className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(
                property.currentStatus
              )}`}
            >
              {property.currentStatus}
            </span>
          </div>
          {property.owner && (
            <p className="mt-1 text-xs text-gray-500">
              Owner: {property.owner.name}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Owner Result Item Component
function OwnerResultItem({
  owner,
  onClick
}: {
  owner: OwnerSearchResult;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors focus:outline-none focus:bg-gray-50"
    >
      <div className="flex items-start space-x-3">
        {/* Owner Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-primary-700">
            {owner.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Owner Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {owner.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{owner.email}</p>
            </div>
            <span
              className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                owner.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {owner.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
            {owner.phone && <span>{owner.phone}</span>}
            {owner.city && owner.state && (
              <span>
                {owner.city}, {owner.state}
              </span>
            )}
            <span>{owner.propertyCount} properties</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Lead Result Item Component
function LeadResultItem({
  lead,
  onClick
}: {
  lead: LeadSearchResult;
  onClick: () => void;
}) {
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

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors focus:outline-none focus:bg-gray-50"
    >
      <div className="flex items-start space-x-3">
        {/* Lead Icon */}
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>

        {/* Lead Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {lead.propertyOwnerName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {lead.businessName}
              </p>
            </div>
            <span
              className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(
                lead.status
              )}`}
            >
              {lead.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
            <span>{lead.email}</span>
            {lead.city && lead.state && (
              <span>
                {lead.city}, {lead.state}
              </span>
            )}
            <span className="capitalize">{lead.propertyType}</span>
          </div>
          {lead.agent && (
            <p className="mt-1 text-xs text-gray-500">
              Agent: {lead.agent.name}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
