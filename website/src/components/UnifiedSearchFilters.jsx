import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Building2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * UnifiedSearchFilters Component
 * 
 * Provides filtering UI for unified search across local and Amadeus properties.
 * Supports source selection, price range, amenities, and sorting options.
 * 
 * @param {Object} props
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {string[]} [props.availableAmenities=[]] - Available amenity options
 * @param {Object} [props.initialFilters={}] - Initial filter values
 */
const UnifiedSearchFilters = ({ 
  onFiltersChange, 
  availableAmenities = [],
  initialFilters = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    source: 'all',
    minPrice: '',
    maxPrice: '',
    amenities: [],
    type: '',
    sortBy: 'name',
    sortOrder: 'asc',
    ...initialFilters
  });
  const isInitialMount = useRef(true);

  // Apply filters when they change (debounced)
  useEffect(() => {
    // Skip the initial mount to prevent triggering on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange(filters);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearFilters = () => {
    setFilters({
      source: 'all',
      minPrice: '',
      maxPrice: '',
      amenities: [],
      type: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const hasActiveFilters = () => {
    return filters.source !== 'all' ||
           filters.minPrice !== '' ||
           filters.maxPrice !== '' ||
           filters.amenities.length > 0 ||
           filters.type !== '' ||
           filters.sortBy !== 'name' ||
           filters.sortOrder !== 'asc';
  };

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant={isOpen ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters() && (
            <span className="ml-1 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
              {[
                filters.source !== 'all' ? 1 : 0,
                filters.minPrice || filters.maxPrice ? 1 : 0,
                filters.amenities.length
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-purple-600 hover:text-purple-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-effect rounded-2xl p-6 space-y-6">
              {/* Source Filter */}
              <div>
                <label className="block text-sm font-semibold mb-3">Property Source</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleFilterChange('source', 'all')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all
                      ${filters.source === 'all'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => handleFilterChange('source', 'local')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                      ${filters.source === 'local'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Building2 className="w-4 h-4" />
                    Local
                  </button>
                  <button
                    onClick={() => handleFilterChange('source', 'amadeus')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                      ${filters.source === 'amadeus'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Globe className="w-4 h-4" />
                    Amadeus
                  </button>
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-semibold mb-3">Property Type</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: '', label: 'All' },
                    { value: 'pg', label: 'PG' },
                    { value: 'hostel', label: 'Hostel' },
                    { value: 'hotel', label: 'Hotel' },
                    { value: 'apartment', label: 'Apartment' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleFilterChange('type', type.value)}
                      className={`
                        px-4 py-2 rounded-xl font-medium transition-all
                        ${filters.type === type.value
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-semibold mb-3">Price Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Min Price</label>
                    <input
                      type="number"
                      placeholder="₹0"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Max Price</label>
                    <input
                      type="number"
                      placeholder="₹10000"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities Filter */}
              {availableAmenities.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-3">Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {availableAmenities.map((amenity) => (
                      <button
                        key={amenity}
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`
                          px-4 py-2 rounded-full font-medium text-sm transition-all
                          ${filters.amenities.includes(amenity)
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-semibold mb-3">Sort By</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    >
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="rating">Rating</option>
                      <option value="distance">Distance</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Filters */}
              <div>
                <label className="block text-sm font-semibold mb-3">Quick Filters</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      handleFilterChange('minPrice', '');
                      handleFilterChange('maxPrice', '2000');
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all"
                  >
                    Budget Friendly
                  </button>
                  <button
                    onClick={() => {
                      handleFilterChange('sortBy', 'rating');
                      handleFilterChange('sortOrder', 'desc');
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all"
                  >
                    Top Rated
                  </button>
                  <button
                    onClick={() => {
                      handleFilterChange('sortBy', 'distance');
                      handleFilterChange('sortOrder', 'asc');
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all"
                  >
                    Nearest First
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedSearchFilters;
