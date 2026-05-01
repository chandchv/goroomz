import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import RoomGrid from '@/components/RoomGrid';
import CategoryFilters from '@/components/CategoryFilters';
import Pagination from '@/components/Pagination';
import categoryService from '@/services/categoryService';
import propertyService from '@/services/propertyService';

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Normalize property data into the shape RoomGrid/RoomCard expects
  const normalizeProperty = (prop) => ({
    id: prop.id,
    slug: prop.slug || null,
    title: prop.name || prop.title,
    description: prop.description,
    price: prop.metadata?.pgOptions?.basePrice || prop.price || 0,
    location: prop.location,
    amenities: prop.amenities || [],
    images: prop.images || [],
    rating: prop.rating,
    category: prop.category || (prop.type === 'pg' ? 'PG' : prop.type) || 'PG',
    roomType: prop.type || 'PG',
    pricingType: prop.type === 'hotel' ? 'daily' : 'monthly',
    maxGuests: prop.metadata?.maxGuests || 4,
    pgOptions: {
      sharingPrices: prop.metadata?.pgOptions?.sharingPrices,
      genderPreference: prop.metadata?.genderPreference
    },
    isProperty: true
  });

  // Map category URL param to property type for the API
  const getCategoryType = (name) => {
    const map = {
      'pg': 'pg',
      'hotel room': 'hotel',
      'home stay': 'apartment',
      'independent home': 'apartment',
      'hostel': 'hostel'
    };
    return map[name.toLowerCase()] || null;
  };

  // Extract available areas from properties
  const availableAreas = useMemo(() => {
    const areas = new Set();
    allProperties.forEach(property => {
      if (property.location?.area) {
        const area = property.location.area.trim();
        if (area) areas.add(area);
      }
    });
    return Array.from(areas).sort();
  }, [allProperties]);

  // Extract available amenities from properties
  const availableAmenities = useMemo(() => {
    const amenities = new Set();
    allProperties.forEach(property => {
      if (property.amenities) {
        property.amenities.forEach(amenity => amenities.add(amenity));
      }
    });
    return Array.from(amenities);
  }, [allProperties]);

  // Load initial category data
  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        setIsLoading(true);
        
        const decodedCategory = decodeURIComponent(categoryName);
        const categoryType = getCategoryType(decodedCategory);
        
        // Load category info
        const categoryResponse = await categoryService.getCategoryByName(decodedCategory);
        if (categoryResponse.success) {
          setCategoryInfo(categoryResponse.data);
        }

        // Fetch properties from the properties API
        const params = { page: currentPage, limit: ITEMS_PER_PAGE };
        if (categoryType) params.type = categoryType;

        const response = await propertyService.getProperties(params);
        if (response.success) {
          const normalized = (response.data || []).map(normalizeProperty);
          setAllProperties(normalized);
          setProperties(normalized);
          setPagination(response.pagination || { page: 1, totalPages: 1, total: normalized.length });
        } else {
          toast({
            title: "Error Loading Properties",
            description: "Failed to load properties for this category.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading category data:', error);
        toast({
          title: "Error Loading Data",
          description: "Something went wrong while loading the category data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryName) {
      loadCategoryData();
    }
  }, [categoryName, currentPage]);

  const isInitialMount = React.useRef(true);

  // Handle filter changes
  const handleFiltersChange = async (newFilters) => {
    // Skip the initial mount trigger from CategoryFilters
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsFiltering(true);
    setFilters(newFilters);
    setCurrentPage(1);

    try {
      const decodedCategory = decodeURIComponent(categoryName);
      const categoryType = getCategoryType(decodedCategory);

      // Only send non-default filter values to the API
      const params = { page: 1, limit: ITEMS_PER_PAGE };
      if (categoryType) params.type = categoryType;
      if (newFilters.search) params.search = newFilters.search;
      if (newFilters.area) params.area = newFilters.area;
      if (newFilters.city) params.city = newFilters.city;
      if (newFilters.gender) params.gender = newFilters.gender;
      if (newFilters.minPrice && newFilters.minPrice > 0) params.minPrice = newFilters.minPrice;
      if (newFilters.maxPrice && newFilters.maxPrice < 50000) params.maxPrice = newFilters.maxPrice;
      if (newFilters.amenities && newFilters.amenities.length > 0) params.amenities = newFilters.amenities.join(',');

      const response = await propertyService.getProperties(params);
      
      if (response.success) {
        const normalized = (response.data || []).map(normalizeProperty);
        setProperties(normalized);
        setPagination(response.pagination || { page: 1, totalPages: 1, total: normalized.length });
      } else {
        toast({
          title: "Filter Error",
          description: "Failed to apply filters. Please try again.",
          variant: "destructive"
        });
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

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePropertyClick = (property) => {
    // Route PG properties to the PG detail page, everything else to the generic property page
    const isPG = (property.category || property.roomType || '').toLowerCase().includes('pg');
    if (isPG && property.slug) {
      navigate(`/pg/${property.slug}`);
    } else {
      navigate(`/property/${property.slug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {categoryName} properties...</p>
        </div>
      </div>
    );
  }

  const displayName = categoryInfo?.displayInfo?.title || categoryName;

  return (
    <>
      <Helmet>
        <title>{displayName}s - GoRoomz</title>
        <meta name="description" content={`Find the best ${displayName}s on GoRoomz.`} />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-text">{displayName}s</h1>
          {categoryInfo?.description && (
            <p className="text-lg text-muted-foreground">{categoryInfo.description}</p>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {isFiltering ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Filtering properties...
                </span>
              ) : (
                `${pagination.total || properties.length} propert${(pagination.total || properties.length) !== 1 ? 'ies' : 'y'} available`
              )}
            </p>
            {pagination.total > 0 && (
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({properties.length} shown)
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <CategoryFilters
          categoryName={categoryName}
          onFiltersChange={handleFiltersChange}
          availableAreas={availableAreas}
          availableAmenities={availableAmenities}
        />
        
        {/* Results */}
        {properties.length > 0 ? (
          <>
            <RoomGrid rooms={properties} onRoomClick={handlePropertyClick} />
            
            {/* Pagination Controls */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : !isLoading ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No {displayName}s Found</h3>
            <p className="text-muted-foreground mb-6">
              {Object.keys(filters).length > 0 
                ? "No properties match your current filters. Try adjusting your search criteria."
                : `We don't have any ${displayName.toLowerCase()}s available at the moment.`
              }
            </p>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={() => handleFiltersChange({})}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
};

export default CategoryPage;
