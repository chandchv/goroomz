import { useState, useEffect } from 'react';
import territoryService, { type Territory } from '../../services/territoryService';

interface TerritoryMapViewProps {
  territoryId?: string;
  onTerritorySelect?: (territory: Territory) => void;
}

interface PropertyMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  occupancy: number;
}

export default function TerritoryMapView({ territoryId, onTerritorySelect }: TerritoryMapViewProps) {
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [properties, setProperties] = useState<PropertyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);

  useEffect(() => {
    if (territoryId) {
      loadTerritoryData();
    }
  }, [territoryId]);

  const loadTerritoryData = async () => {
    if (!territoryId) return;

    try {
      setLoading(true);
      setError(null);

      const territoryData = await territoryService.getTerritory(territoryId);
      setTerritory(territoryData);

      const propertiesResponse = await territoryService.getTerritoryProperties(territoryId);
      
      // Handle different response structures
      let propertiesData = [];
      if (Array.isArray(propertiesResponse)) {
        propertiesData = propertiesResponse;
      } else if (propertiesResponse && Array.isArray(propertiesResponse.data)) {
        propertiesData = propertiesResponse.data;
      } else if (propertiesResponse && propertiesResponse.properties && Array.isArray(propertiesResponse.properties)) {
        propertiesData = propertiesResponse.properties;
      }
      
      console.log('Properties response:', propertiesResponse);
      console.log('Properties data:', propertiesData);
      
      // Transform properties to markers (assuming properties have location data)
      const markers = propertiesData.map((property: any) => ({
        id: property.id,
        name: property.name || property.businessName,
        lat: property.latitude || 0,
        lng: property.longitude || 0,
        status: property.status || 'active',
        occupancy: property.occupancyRate || 0,
      }));
      
      setProperties(markers);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load territory data');
      console.error('Error loading territory data:', err);
      setProperties([]); // Ensure properties is always an array
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 80) return 'text-green-600';
    if (occupancy >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Territory Info Header */}
      {territory && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{territory.name}</h3>
              <p className="text-sm text-gray-600">{territory.description}</p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-gray-600">Cities: </span>
                <span className="font-medium text-gray-900">{territory.cities?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Properties: </span>
                <span className="font-medium text-gray-900">{properties.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="relative h-96 bg-gray-100">
          {/* Placeholder for actual map implementation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-gray-600 font-medium">Interactive Map View</p>
              <p className="text-sm text-gray-500 mt-1">
                Integrate with Google Maps or Mapbox to display territory boundaries and property locations
              </p>
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-700 mb-2">Property Status</div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Pending</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-gray-600">Inactive</span>
            </div>
          </div>
        </div>

        {/* Property List Below Map */}
        <div className="border-t border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Properties in Territory</h4>
          {!Array.isArray(properties) || properties.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No properties in this territory</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {properties.map(property => (
                <div
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedProperty?.id === property.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900 text-sm">{property.name}</h5>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(property.status)}`}></div>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Occupancy: <span className={`font-semibold ${getOccupancyColor(property.occupancy)}`}>
                      {property.occupancy}%
                    </span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Property Details */}
      {selectedProperty && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{selectedProperty.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Status: <span className="capitalize">{selectedProperty.status}</span>
              </p>
              <p className="text-sm text-gray-600">
                Occupancy: <span className={`font-semibold ${getOccupancyColor(selectedProperty.occupancy)}`}>
                  {selectedProperty.occupancy}%
                </span>
              </p>
            </div>
            <button
              onClick={() => setSelectedProperty(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
