import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Star, Filter, Search, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * AdvancedSearchModal Component
 * 
 * Modal for advanced search with comprehensive filters for both
 * local and Amadeus properties.
 */
const AdvancedSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    source: 'all',
    cityCode: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    amenities: [],
    ratings: [],
    propertyType: '',
    gender: '',
    radius: '50',
    radiusUnit: 'KM'
  });

  const amenityOptions = [
    'wifi', 'parking', 'ac', 'gym', 'pool', 'restaurant',
    'laundry', 'room_service', 'pet_friendly', 'spa'
  ];

  const ratingOptions = [5, 4, 3, 2, 1];

  const propertyTypes = [
    { value: 'pg', label: 'Paying Guest' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'apartment', label: 'Apartment' }
  ];

  const handleParamChange = (key, value) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setSearchParams(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleRatingToggle = (rating) => {
    setSearchParams(prev => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter(r => r !== rating)
        : [...prev.ratings, rating]
    }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    // Add all non-empty parameters
    if (searchParams.source !== 'all') params.append('source', searchParams.source);
    if (searchParams.cityCode) params.append('cityCode', searchParams.cityCode.toUpperCase());
    if (searchParams.location) params.append('q', searchParams.location);
    if (searchParams.minPrice) params.append('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice) params.append('maxPrice', searchParams.maxPrice);
    if (searchParams.amenities.length > 0) params.append('amenities', searchParams.amenities.join(','));
    if (searchParams.ratings.length > 0) params.append('ratings', searchParams.ratings.join(','));
    if (searchParams.propertyType) params.append('type', searchParams.propertyType);
    if (searchParams.gender) params.append('gender', searchParams.gender);
    if (searchParams.radius) params.append('radius', searchParams.radius);
    if (searchParams.radiusUnit) params.append('radiusUnit', searchParams.radiusUnit);

    navigate(`/search?${params.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setSearchParams({
      source: 'all',
      cityCode: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      amenities: [],
      ratings: [],
      propertyType: '',
      gender: '',
      radius: '50',
      radiusUnit: 'KM'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Advanced Search</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-6">
              {/* Source Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">Search Source</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleParamChange('source', 'all')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all
                      ${searchParams.source === 'all'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => handleParamChange('source', 'local')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                      ${searchParams.source === 'local'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Building2 className="w-4 h-4" />
                    Local
                  </button>
                  <button
                    onClick={() => handleParamChange('source', 'amadeus')}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                      ${searchParams.source === 'amadeus'
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

              {/* Location Search */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      City Code (for Amadeus)
                    </div>
                  </label>
                  <input
                    type="text"
                    value={searchParams.cityCode}
                    onChange={(e) => handleParamChange('cityCode', e.target.value.toUpperCase())}
                    placeholder="e.g., DEL, BOM, BLR"
                    maxLength={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">3-letter IATA code</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      Location/City Name
                    </div>
                  </label>
                  <input
                    type="text"
                    value={searchParams.location}
                    onChange={(e) => handleParamChange('location', e.target.value)}
                    placeholder="e.g., Delhi, Mumbai"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Search Radius (for Amadeus) */}
              {(searchParams.source === 'all' || searchParams.source === 'amadeus') && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Search Radius</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={searchParams.radius}
                      onChange={(e) => handleParamChange('radius', e.target.value)}
                      placeholder="50"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                    <select
                      value={searchParams.radiusUnit}
                      onChange={(e) => handleParamChange('radiusUnit', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    >
                      <option value="KM">Kilometers</option>
                      <option value="MILE">Miles</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price Range
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={searchParams.minPrice}
                    onChange={(e) => handleParamChange('minPrice', e.target.value)}
                    placeholder="Min Price"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                  <input
                    type="number"
                    value={searchParams.maxPrice}
                    onChange={(e) => handleParamChange('maxPrice', e.target.value)}
                    placeholder="Max Price"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {propertyTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => handleParamChange('propertyType', 
                        searchParams.propertyType === type.value ? '' : type.value
                      )}
                      className={`
                        px-4 py-3 rounded-xl font-medium transition-all
                        ${searchParams.propertyType === type.value
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

              {/* Gender Preference (for PGs) */}
              {searchParams.propertyType === 'pg' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Gender Preference</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['male', 'female', 'any'].map(gender => (
                      <button
                        key={gender}
                        onClick={() => handleParamChange('gender', 
                          searchParams.gender === gender ? '' : gender
                        )}
                        className={`
                          px-4 py-3 rounded-xl font-medium transition-all capitalize
                          ${searchParams.gender === gender
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div>
                <label className="block text-sm font-semibold mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map(amenity => (
                    <button
                      key={amenity}
                      onClick={() => handleAmenityToggle(amenity)}
                      className={`
                        px-4 py-2 rounded-full font-medium text-sm transition-all capitalize
                        ${searchParams.amenities.includes(amenity)
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {amenity.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ratings */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Minimum Rating
                  </div>
                </label>
                <div className="flex gap-2">
                  {ratingOptions.map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingToggle(rating)}
                      className={`
                        px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-1
                        ${searchParams.ratings.includes(rating)
                          ? 'bg-yellow-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {rating}
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800"
            >
              Reset All
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSearch}
                className="px-8"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdvancedSearchModal;
