import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface Property {
  id: string;
  name: string;
  type: string;
  location: string;
  totalRooms: number;
  isActive: boolean;
  ownerId?: string;
  owner_id?: string;
}

interface PropertyContextType {
  properties: Property[];
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property) => void;
  loading: boolean;
  error: string | null;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: ReactNode;
}

export function PropertyProvider({ children }: PropertyProviderProps) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedPropertyState] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // For property owners, get their properties
      // For superusers/staff, get all properties or a filtered list
      const endpoint = user.role === 'owner' 
        ? '/api/internal/properties' // This will be filtered by owner on backend
        : '/api/internal/platform/properties'; // Platform-wide view for staff

      const response = await api.get(endpoint, {
        params: {
          limit: 100, // Get up to 100 properties
          isActive: true // Only active properties
        }
      });

      const propertiesData = response.data?.data?.properties || response.data?.data || [];
      
      // Transform the data to match our Property interface
      const transformedProperties: Property[] = propertiesData.map((prop: any) => ({
        id: prop.id,
        name: prop.name || prop.title || 'Unnamed Property',
        type: prop.type || 'Unknown',
        location: typeof prop.location === 'object' && prop.location !== null
          ? [prop.location.area, prop.location.city, prop.location.state].filter(Boolean).join(', ') || 'Unknown Location'
          : prop.location || `${prop.city || ''}, ${prop.state || ''}`.trim() || 'Unknown Location',
        totalRooms: prop.total_rooms || prop.totalRooms || 0,
        isActive: prop.is_active !== false && prop.isActive !== false,
        ownerId: prop.ownerId || prop.owner_id,
        owner_id: prop.owner_id || prop.ownerId
      }));

      setProperties(transformedProperties);

      // Auto-select the first property if none is selected
      if (transformedProperties.length > 0 && !selectedProperty) {
        setSelectedPropertyState(transformedProperties[0]);
        // Store in localStorage for persistence
        localStorage.setItem('selectedPropertyId', transformedProperties[0].id);
      }

    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const setSelectedProperty = (property: Property) => {
    setSelectedPropertyState(property);
    // Store in localStorage for persistence
    localStorage.setItem('selectedPropertyId', property.id);
  };

  const refreshProperties = async () => {
    await fetchProperties();
  };

  // Load properties when user changes
  useEffect(() => {
    if (user) {
      fetchProperties();
    } else {
      setProperties([]);
      setSelectedPropertyState(null);
      localStorage.removeItem('selectedPropertyId');
    }
  }, [user]);

  // Restore selected property from localStorage
  useEffect(() => {
    const savedPropertyId = localStorage.getItem('selectedPropertyId');
    if (savedPropertyId && properties.length > 0) {
      const savedProperty = properties.find(p => p.id === savedPropertyId);
      if (savedProperty) {
        setSelectedPropertyState(savedProperty);
      }
    }
  }, [properties]);

  const value: PropertyContextType = {
    properties,
    selectedProperty,
    setSelectedProperty,
    loading,
    error,
    refreshProperties
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}