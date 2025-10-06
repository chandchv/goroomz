import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import RoomGrid from '@/components/RoomGrid';
import RoomModal from '@/components/RoomModal';
import BookingModal from '@/components/BookingModal';
import roomService from '@/services/roomService';
import categoryService from '@/services/categoryService';
import bookingService from '@/services/bookingService';

const CategoryPage = () => {
  const { categoryName } = useParams();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState(null);

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
          setRooms(roomsResponse.data);
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

  const handleUpdateRoom = async (updatedRoom) => {
    try {
      const response = await roomService.updateRoom(updatedRoom.id, updatedRoom);
      if (response.success) {
        const updatedRooms = rooms.map(room => 
          room.id === updatedRoom.id ? response.data : room
        );
        setRooms(updatedRooms);
        setSelectedRoom(response.data);
        toast({
          title: "Room Updated",
          description: "Room information has been updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update room information.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      const response = await roomService.deleteRoom(roomId);
      if (response.success) {
        const updatedRooms = rooms.filter(room => room.id !== roomId);
        setRooms(updatedRooms);
        setSelectedRoom(null);
        toast({
          title: "Room Deleted",
          description: "Room has been deleted successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete room.",
        variant: "destructive"
      });
    }
  };

  const handleBookRoom = async (bookingData) => {
    try {
      const response = await bookingService.createBooking({
        ...bookingData,
        room: selectedRoom.id,
        contactInfo: {
          phone: bookingData.phone || '',
          email: bookingData.email || ''
        }
      });

      if (response.success) {
        toast({
          title: "Booking Created",
          description: "Your booking has been created successfully!",
        });
        setIsBookingModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking.",
        variant: "destructive"
      });
    }
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
          <p className="text-sm text-muted-foreground mt-2">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        {rooms.length > 0 ? (
          <RoomGrid rooms={rooms} onRoomClick={setSelectedRoom} />
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No {displayName}s Found</h3>
            <p className="text-muted-foreground mb-6">
              We don't have any {displayName.toLowerCase()}s available at the moment.
            </p>
          </div>
        )}
      </div>

      {selectedRoom && (
        <RoomModal
          room={selectedRoom}
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onUpdate={handleUpdateRoom}
          onDelete={handleDeleteRoom}
          onBook={() => setIsBookingModalOpen(true)}
        />
      )}

      {isBookingModalOpen && selectedRoom && (
        <BookingModal
          room={selectedRoom}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onBook={handleBookRoom}
        />
      )}
    </>
  );
};

export default CategoryPage;