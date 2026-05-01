import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, MapPin, Filter, Grid, List, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UnifiedSearchFilters from '@/components/UnifiedSearchFilters';
import UnifiedSearchResults from '@/components/UnifiedSearchResults';
import SmartSearchBar from '@/components/SmartSearchBar';
import AdvancedSearchModal from '@/components/AdvancedSearchModal';
import { toast } from '@/components/ui/use-toast';
import propertyService from '@/services/propertyService';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({});
  const [searchMeta, setSearchMeta] = useState({});
  const [searchWarnings, setSearchWarnings] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchPerformance, setSearchPerformance] = useState(null);
  const isInitialMount = useRef(true);
  
  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';
  const category = searchParams.get('category') || '';
  const cityCode = searchParams.get('cityCode') || '';
  const latitude = searchParams.get('latitude') || '';
  const longitude = searchParams.get('longitude') || '';

  // Extract available amenities from properties
  const availableAmenities = React.useMemo(() => {
    const amenities = new Set();
    properties.forEach(property => {
      const propertyAmenities = propertyService.getPropertyAmenities(property);
      if (propertyAmenities) {
        propertyAmenities.forEach(amenity => amenities.add(amenity));
      }
    });
    return Array.from(amenities);
  }, [properties]);

  // Load search results
  useEffect(() => {
    const performSearch = async () => {
      // Skip if no search criteria
      if (!query && !location && !category && !cityCode && (!latitude || !longitude)) {
        setIsLoading(false);
        return;
      }

      const startTime = performance.now();
      
      try {
        setIsLoading(true);

        // Determine if we should use unified search (Amadeus + local) or local-only property search
        const useUnifiedSearch = !!(cityCode || (latitude && longitude));
        
        if (useUnifiedSearch) {
          const searchFilters = {
            source: 'all',
            cityCode: cityCode || undefined,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            search: query || undefined,
            page: 1,
            limit: 50
          };

          const response = await propertyService.searchUnified(searchFilters);
          
          const endTime = performance.now();
          setSearchPerformance({
            duration: Math.round(endTime - startTime),
            resultCount: response.data?.length || 0
          });
          
          if (response.success) {
            setProperties(response.data || []);
            setSearchMeta(response.meta || {});
            setSearchWarnings(response.warnings || null);
          } else {
            toast({
              title: "Search Error",
              description: "Failed to perform search. Please try again.",
              variant: "destructive"
            });
          }
        } else {
          // Use property service for local property search
          const searchFilters = {
            search: query || undefined,
            city: location || undefined,
            type: category || undefined,
            page: 1,
            limit: 50
          };

          const response = await propertyService.getProperties(searchFilters);
          
          const endTime = performance.now();
          setSearchPerformance({
            duration: Math.round(endTime - startTime),
            resultCount: response.data?.length || 0
          });
          
          if (response.success) {
            setProperties(response.data || []);
            setSearchMeta({
              total: response.data?.length || 0,
              localCount: response.data?.length || 0,
              amadeusCount: 0
            });
            setSearchWarnings(null);
          } else {
            toast({
              title: "Search Error",
              description: "Failed to perform search. Please try again.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Search Error",
          description: "Something went wrong during search.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query, location, category, cityCode, latitude, longitude]);

  // Handle filter changes
  const handleFiltersChange = async (newFilters) => {
    // Skip if this is the initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsFiltering(true);
    setFilters(newFilters);

    try {
      const useUnifiedSearch = !!(cityCode || (latitude && longitude));

      if (useUnifiedSearch) {
        // Build search parameters with filters for unified search
        const searchParams = {
          source: newFilters.source || 'all',
          search: query || undefined,
          cityCode: cityCode || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          minPrice: newFilters.minPrice || undefined,
          maxPrice: newFilters.maxPrice || undefined,
          amenities: newFilters.amenities?.length > 0 ? newFilters.amenities : undefined,
          sortBy: newFilters.sortBy || 'name',
          sortOrder: newFilters.sortOrder || 'asc',
          page: 1,
          limit: 50
        };

        const response = await propertyService.searchUnified(searchParams);
        
        if (response.success) {
          setProperties(response.data || []);
          setSearchMeta(response.meta || {});
          setSearchWarnings(response.warnings || null);
        } else {
          toast({
            title: "Filter Error",
            description: "Failed to apply filters. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        // Use property service with filters for local search
        const searchFilters = {
          search: query || undefined,
          city: location || undefined,
          type: category || newFilters.type || undefined,
          minPrice: (newFilters.minPrice && newFilters.minPrice > 0) ? newFilters.minPrice : undefined,
          maxPrice: (newFilters.maxPrice && newFilters.maxPrice < 50000) ? newFilters.maxPrice : undefined,
          amenities: newFilters.amenities?.length > 0 ? newFilters.amenities.join(',') : undefined,
          page: 1,
          limit: 50
        };

        const response = await propertyService.getProperties(searchFilters);
        
        if (response.success) {
          setProperties(response.data || []);
          setSearchMeta({
            total: response.data?.length || 0,
            localCount: response.data?.length || 0,
            amadeusCount: 0
          });
          setSearchWarnings(null);
        } else {
          toast({
            title: "Filter Error",
            description: "Failed to apply filters. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      toast({
        title: "Filter Error",
        description: "Failed to apply filters. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFiltering(false);
    }
  };

  const handlePropertyClick = (property) => {
    const isPG = (property.type || property.category || '').toLowerCase().includes('pg');
    if (isPG && property.slug) {
      navigate(`/pg/${property.slug}`);
    } else {
      navigate(`/property/${property.id}`);
    }
  };

  const getSearchTitle = () => {
    if (query && location) {
      return `Results for "${query}" in ${location}`;
    } else if (query) {
      return `Results for "${query}"`;
    } else if (location) {
      return `Properties in ${location}`;
    } else if (category) {
      return `${category} Properties`;
    }
    return 'Search Results';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Searching properties...</h3>
          <p className="text-gray-600">Finding the best matches for you</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{getSearchTitle()} - GoRoomz</title>
        <meta name="description" content={`Find the best properties matching your search criteria on GoRoomz.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Back Button and Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-purple-600 hover:text-purple-700"
              >
                ← Back
              </Button>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600" />
                <h1 className="text-3xl font-bold gradient-text">
                  {getSearchTitle()}
                </h1>
              </div>
            </div>

            {/* Smart Search Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SmartSearchBar 
                  onSearch={(query) => {
                    // Search is handled by navigation in SmartSearchBar
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedSearch(true)}
                className="px-6 py-4 h-auto"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Advanced
              </Button>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  {isFiltering ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span>Filtering properties...</span>
                    </span>
                  ) : (
                    <span>{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found</span>
                  )}
                </div>
                {searchPerformance && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>{searchPerformance.duration}ms</span>
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <UnifiedSearchFilters
          onFiltersChange={handleFiltersChange}
          availableAmenities={availableAmenities}
        />

        {/* Results */}
        <UnifiedSearchResults
          results={properties}
          meta={searchMeta}
          warnings={searchWarnings}
          viewMode={viewMode}
          onPropertyClick={handlePropertyClick}
          isLoading={isFiltering}
        />

        {/* Advanced Search Modal */}
        <AdvancedSearchModal 
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
        />
      </div>
    </>
  );
};

export default SearchResultsPage;
