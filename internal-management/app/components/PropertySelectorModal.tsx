import { useState } from 'react';
import { useProperty } from '../contexts/PropertyContext';
import * as Dialog from '@radix-ui/react-dialog';

interface PropertySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertySelectorModal({ isOpen, onClose }: PropertySelectorModalProps) {
  const { properties, selectedProperty, setSelectedProperty, loading } = useProperty();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProperty = (property: any) => {
    setSelectedProperty(property);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden z-50">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Select Property
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-100 rounded-md">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
            
            {/* Search */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Property List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="ml-2 text-gray-500">Loading properties...</span>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No properties found matching your search' : 'No properties available'}
              </div>
            ) : (
              <div className="py-2">
                {filteredProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleSelectProperty(property)}
                    className={`w-full px-6 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                      selectedProperty?.id === property.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {property.name}
                          </h3>
                          {selectedProperty?.id === property.id && (
                            <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{property.location}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-400 capitalize">{property.type}</span>
                          <span className="text-xs text-gray-400">{property.totalRooms} rooms</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}