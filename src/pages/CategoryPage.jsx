import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import RoomGrid from '@/components/RoomGrid';
import CategoryFilters from '@/components/CategoryFilters';
import roomService from '@/services/roomService';
import categoryService from '@/services/categoryService';

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]); // Store all rooms for filtering
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [filters, setFilters] = useState({});

  // Extract available areas and amenities from rooms
  const availableAreas = useMemo(() => {
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

  const availableAmenities = useMemo(() => {
    const amenities = new Set();
    allRooms.forEach(room => {
      if (room.amenities) {
        room.amenities.forEach(amenity => amenities.add(amenity));
      }
    });
    return Array.from(amenities);
  }, [allRooms]);

  // Load initial category data
  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        setIsLoading(true);
        
        // Load category info and rooms in parallel
        const [roomsResponse, categoryResponse] = await Promise.all([
          roomService.getRoomsByCategory(decodeURIComponent(categoryName)),
          categoryService.getCategoryByName(decodeURIComponent(categoryName))
        ]);

        if (roomsResponse.success) {
          setAllRooms(roomsResponse.data || []);
          setRooms(roomsResponse.data || []);
        } else {
          toast({
            title: "Error Loading Rooms",
            description: "Failed to load rooms for this category.",
            variant: "destructive"
          });
        }

        if (categoryResponse.success) {
          setCategoryInfo(categoryResponse.data);
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
  }, [categoryName]);

  // Handle filter changes
  const handleFiltersChange = async (newFilters) => {
    setIsFiltering(true);
    setFilters(newFilters);

    try {
      // Call backend API with filters
      const response = await roomService.getRoomsByCategory(decodeURIComponent(categoryName), newFilters);
      
      if (response.success) {
        setRooms(response.data || []);
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

  const handleRoomClick = (room) => {
    // Navigate to property detail page
    navigate(`/property/${room.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {categoryName} rooms...</p>
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
                  Filtering rooms...
                </span>
              ) : (
                `${rooms.length} room${rooms.length !== 1 ? 's' : ''} available`
              )}
            </p>
            {allRooms.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {rooms.length} of {allRooms.length} rooms
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
        {rooms.length > 0 ? (
          <RoomGrid rooms={rooms} onRoomClick={handleRoomClick} />
        ) : !isLoading ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No {displayName}s Found</h3>
            <p className="text-muted-foreground mb-6">
              {Object.keys(filters).length > 0 
                ? "No rooms match your current filters. Try adjusting your search criteria."
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