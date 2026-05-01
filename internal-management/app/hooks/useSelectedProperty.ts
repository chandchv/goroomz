import { useProperty } from '../contexts/PropertyContext';

/**
 * Hook to get the currently selected property and related utilities
 */
export function useSelectedProperty() {
  const { selectedProperty, properties, setSelectedProperty, loading, error } = useProperty();

  return {
    // Current selected property
    selectedProperty,
    
    // All available properties
    properties,
    
    // Function to change selected property
    setSelectedProperty,
    
    // Loading and error states
    loading,
    error,
    
    // Utility functions
    hasMultipleProperties: properties.length > 1,
    hasProperties: properties.length > 0,
    
    // Get property by ID
    getPropertyById: (id: string) => properties.find(p => p.id === id),
    
    // Check if current user has access to a specific property
    hasAccessToProperty: (propertyId: string) => properties.some(p => p.id === propertyId),
  };
}