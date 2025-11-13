import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  MapPin, 
  DollarSign, 
  Users, 
  Wifi, 
  Car, 
  Utensils, 
  Star,
  X,
  ChevronDown,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

const CategoryFilters = ({ 
  categoryName, 
  onFiltersChange, 
  initialFilters = {},
  availableAreas = [],
  availableAmenities = []
}) => {
  const [filters, setFilters] = useState({
    search: '',
    area: '',
    minPrice: 0,
    maxPrice: 50000,
    minGuests: 1,
    maxGuests: 10,
    amenities: [],
    roomType: '',
    featured: false,
    sortBy: 'newest',
    ...initialFilters
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const onFiltersChangeRef = useRef(onFiltersChange);

  // Update ref when onFiltersChange changes
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  // Common amenities with icons
  const amenityOptions = [
    { value: 'wifi', label: 'WiFi', icon: Wifi },
    { value: 'ac', label: 'Air Conditioning', icon: Star },
    { value: 'parking', label: 'Parking', icon: Car },
    { value: 'meals', label: 'Meals', icon: Utensils },
    { value: 'tv', label: 'TV', icon: Star },
    { value: 'kitchen', label: 'Kitchen', icon: Utensils },
    { value: 'washing_machine', label: 'Washing Machine', icon: Star },
    { value: 'security', label: 'Security', icon: Star },
    { value: 'gym', label: 'Gym', icon: Star },
    { value: 'pool', label: 'Swimming Pool', icon: Star },
    ...availableAmenities.filter(amenity => 
      !['wifi', 'ac', 'parking', 'meals', 'tv', 'kitchen', 'washing_machine', 'security', 'gym', 'pool'].includes(amenity)
    ).map(amenity => ({ value: amenity, label: amenity.replace(/_/g, ' '), icon: Star }))
  ];

  const roomTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'Private Room', label: 'Private Room' },
    { value: 'Shared Room', label: 'Shared Room' },
    { value: 'Entire Place', label: 'Entire Place' },
    { value: 'Studio', label: 'Studio' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'priceAsc', label: 'Price: Low to High' },
    { value: 'priceDesc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'featured', label: 'Featured First' }
  ];

  // Apply filters with debouncing
  useEffect(() => {
    const applyFilters = async () => {
      setIsLoading(true);
      try {
        await onFiltersChangeRef.current(filters);
      } catch (error) {
        toast({
          title: "Filter Error",
          description: "Failed to apply filters. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only apply filters if search has been debounced or other filters have changed
    const timeoutId = setTimeout(applyFilters, 300);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearch, filters.area, filters.minPrice, filters.maxPrice, filters.minGuests, filters.maxGuests, filters.amenities, filters.roomType, filters.featured, filters.sortBy]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleAmenityToggle = useCallback((amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      area: '',
      minPrice: 0,
      maxPrice: 50000,
      minGuests: 1,
      maxGuests: 10,
      amenities: [],
      roomType: '',
      featured: false,
      sortBy: 'newest'
    });
  }, []);

  const activeFiltersCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== '' && value !== 'newest';
    return value !== 0 && value !== 50000 && value !== 1 && value !== 10;
  }).length;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
      {/* Filter Header */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-lg">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Filter Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-6 border-t border-gray-200">
              {/* Search */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search by location or keywords
                </Label>
                <Input
                  placeholder="e.g., Koramangala, Whitefield, near metro..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Area Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Area
                </Label>
                <select
                  value={filters.area}
                  onChange={(e) => handleFilterChange('area', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Areas</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price Range: ₹{filters.minPrice.toLocaleString()} - ₹{filters.maxPrice.toLocaleString()}
                </Label>
                <div className="px-3">
                  <Slider
                    value={[filters.minPrice, filters.maxPrice]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('minPrice', min);
                      handleFilterChange('maxPrice', max);
                    }}
                    max={50000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Guests Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Guests: {filters.minGuests} - {filters.maxGuests}
                </Label>
                <div className="px-3">
                  <Slider
                    value={[filters.minGuests, filters.maxGuests]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('minGuests', min);
                      handleFilterChange('maxGuests', max);
                    }}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Room Type */}
              <div className="space-y-2">
                <Label>Room Type</Label>
                <select
                  value={filters.roomType}
                  onChange={(e) => handleFilterChange('roomType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {roomTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenityOptions.map((amenity) => {
                    const Icon = amenity.icon;
                    const isSelected = filters.amenities.includes(amenity.value);
                    return (
                      <div
                        key={amenity.value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        onClick={() => handleAmenityToggle(amenity.value)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onChange={() => handleAmenityToggle(amenity.value)}
                        />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{amenity.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.checked)}
                />
                <Label className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Show only featured properties
                </Label>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="space-y-2">
                  <Label>Active Filters:</Label>
                  <div className="flex flex-wrap gap-2">
                    {filters.search && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        Search: {filters.search}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleFilterChange('search', '')}
                        />
                      </span>
                    )}
                    {filters.area && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        Area: {filters.area}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleFilterChange('area', '')}
                        />
                      </span>
                    )}
                    {filters.amenities.length > 0 && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        Amenities: {filters.amenities.length}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleFilterChange('amenities', [])}
                        />
                      </span>
                    )}
                    {filters.roomType && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        Type: {filters.roomType}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleFilterChange('roomType', '')}
                        />
                      </span>
                    )}
                    {filters.featured && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        Featured Only
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleFilterChange('featured', false)}
                        />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}
    </div>
  );
};

export default CategoryFilters;
