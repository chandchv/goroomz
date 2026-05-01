import { useState } from 'react';
import { useSelectedProperty } from '../hooks/useSelectedProperty';
import PropertySelectorModal from './PropertySelectorModal';

interface PropertySwitcherProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'select' | 'minimal';
  className?: string;
}

export default function PropertySwitcher({ 
  showLabel = true, 
  size = 'md',
  variant = 'button',
  className = ''
}: PropertySwitcherProps) {
  const { selectedProperty, properties, setSelectedProperty, hasMultipleProperties } = useSelectedProperty();
  const [showModal, setShowModal] = useState(false);

  // Don't show anything if there's only one property or no properties
  if (!hasMultipleProperties) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  if (variant === 'select') {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property
          </label>
        )}
        <select
          value={selectedProperty?.id || ''}
          onChange={(e) => {
            const property = properties.find(p => p.id === e.target.value);
            if (property) {
              setSelectedProperty(property);
            }
          }}
          className={`border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${sizeClasses[size]}`}
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setShowModal(true)}
        className={`text-left hover:bg-gray-50 rounded-md transition-colors ${sizeClasses[size]} ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {showLabel && (
              <div className="text-xs text-gray-500 mb-0.5">Property</div>
            )}
            <div className="font-medium text-gray-900 truncate">
              {selectedProperty?.name || 'Select Property'}
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
        <PropertySelectorModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </button>
    );
  }

  // Default button variant
  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property
        </label>
      )}
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center justify-between border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${sizeClasses[size]} min-w-48`}
      >
        <div className="flex items-center min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">
              {selectedProperty?.name || 'Select Property'}
            </div>
            {selectedProperty && (
              <div className="text-xs text-gray-500 truncate">
                {selectedProperty.totalRooms} rooms • {selectedProperty.location}
              </div>
            )}
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <PropertySelectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}