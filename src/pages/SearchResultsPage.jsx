import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, MapPin, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RoomGrid from '@/components/RoomGrid';
import CategoryFilters from '@/components/CategoryFilters';
import { toast } from '@/components/ui/use-toast';
import roomService from '@/services/roomService';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({});
  
  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';
  const category = searchParams.get('category') || '';

  // Extract available areas and amenities from rooms
  const availableAreas = React.useMemo(() => {
    const areas = new Set();
    allRooms.forEach(room => {
      if (room.location?.city) {
        areas.add(room.location.city);
      }
      if (room.location?.address) {
        const area = room.location.address.split(',')[0]?.trim();
        if (area) areas.add(area);
      }
    });
    return Array.from(areas).sort();
  }, [allRooms]);

  const availableAmenities = React.useMemo(() => {
    const amenities = new Set();
    allRooms.forEach(room => {
      if (room.amenities) {
        room.amenities.forEach(amenity => amenities.add(amenity));
      }
    });
    return Array.from(amenities);
  }, [allRooms]);

  // Load search results
  useEffect(() => {
    const performSearch = async () => {
      try {
        setIsLoading(true);
        
        // Build search parameters
        const searchFilters = {
          search: query,
          area: location,
          category: category
        };

        const response = await roomService.getRooms(searchFilters);
        
        if (response.success) {
          setAllRooms(response.data || []);
          setRooms(response.data || []);
        } else {
          toast({
            title: "Search Error",
            description: "Failed to perform search. Please try again.",
            variant: "destructive"
          });
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

    if (query || location || category) {
      performSearch();
    }
  }, [query, location, category]);

  // Handle filter changes
  const handleFiltersChange = async (newFilters) => {
    setIsFiltering(true);
    setFilters(newFilters);

    try {
      // Apply filters to all rooms
      let filteredRooms = [...allRooms];

      // Search filter
      if (newFilters.search) {
        const searchTerm = newFilters.search.toLowerCase();
        filteredRooms = filteredRooms.filter(room => 
          room.title?.toLowerCase().includes(searchTerm) ||
          room.description?.toLowerCase().includes(searchTerm) ||
          room.location?.city?.toLowerCase().includes(searchTerm) ||
          room.location?.address?.toLowerCase().includes(searchTerm)
        );
      }

      // Area filter
      if (newFilters.area) {
        filteredRooms = filteredRooms.filter(room => 
          room.location?.city === newFilters.area ||
          room.location?.address?.includes(newFilters.area)
        );
      }

      // Price range filter
      if (newFilters.minPrice !== undefined && newFilters.maxPrice !== undefined) {
        filteredRooms = filteredRooms.filter(room => 
          room.price >= newFilters.minPrice && room.price <= newFilters.maxPrice
        );
      }

      // Guests filter
      if (newFilters.minGuests !== undefined && newFilters.maxGuests !== undefined) {
        filteredRooms = filteredRooms.filter(room => 
          room.maxGuests >= newFilters.minGuests && room.maxGuests <= newFilters.maxGuests
        );
      }

      // Room type filter
      if (newFilters.roomType) {
        filteredRooms = filteredRooms.filter(room => 
          room.roomType === newFilters.roomType
        );
      }

      // Amenities filter
      if (newFilters.amenities && newFilters.amenities.length > 0) {
        filteredRooms = filteredRooms.filter(room => 
          newFilters.amenities.every(amenity => 
            room.amenities?.includes(amenity)
          )
        );
      }

      // Featured filter
      if (newFilters.featured) {
        filteredRooms = filteredRooms.filter(room => room.featured);
      }

      // Sort results
      if (newFilters.sortBy) {
        switch (newFilters.sortBy) {
          case 'priceAsc':
            filteredRooms.sort((a, b) => a.price - b.price);
            break;
          case 'priceDesc':
            filteredRooms.sort((a, b) => b.price - a.price);
            break;
          case 'rating':
            filteredRooms.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
            break;
          case 'featured':
            filteredRooms.sort((a, b) => {
              if (a.featured && !b.featured) return -1;
              if (!a.featured && b.featured) return 1;
              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });
            break;
          case 'newest':
          default:
            filteredRooms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        }
      }

      setRooms(filteredRooms);
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

  const handleRoomClick = (room) => {
    // Navigate to property detail page
    navigate(`/property/${room.id}`);
  };

  const getSearchTitle = () => {
    if (query && location) {
      return `Results for "${query}" in ${location}`;
    } else if (query) {
      return `Results for "${query}"`;
    } else if (location) {
      return `Rooms in ${location}`;
    } else if (category) {
      return `${category} Rooms`;
    }
    return 'Search Results';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Searching rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{getSearchTitle()} - GoRoomz</title>
        <meta name="description" content={`Find the best rooms matching your search criteria on GoRoomz.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-4"
          >
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
          </motion.div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {isFiltering ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    Filtering rooms...
                  </span>
                ) : (
                  `${rooms.length} room${rooms.length !== 1 ? 's' : ''} found`
                )}
              </p>
              {allRooms.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {rooms.length} of {allRooms.length} rooms
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
        </div>

        {/* Filters */}
        <CategoryFilters
          categoryName=""
          onFiltersChange={handleFiltersChange}
          availableAreas={availableAreas}
          availableAmenities={availableAmenities}
        />

        {/* Results */}
        {rooms.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <RoomGrid rooms={rooms} viewMode={viewMode} onRoomClick={handleRoomClick} />
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Rooms Found</h3>
            <p className="text-muted-foreground mb-6">
              {Object.keys(filters).length > 0 
                ? "No rooms match your current filters. Try adjusting your search criteria."
                : "We couldn't find any rooms matching your search criteria. Try different keywords or locations."
              }
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/')}>
                Back to Home
              </Button>
              {Object.keys(filters).length > 0 && (
                <Button variant="outline" onClick={() => handleFiltersChange({})}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchResultsPage;
