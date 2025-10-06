import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import AddRoomModal from '@/components/AddRoomModal';
import EditRoomModal from '@/components/EditRoomModal';
import roomService from '@/services/roomService';
import bookingService from '@/services/bookingService';

const AdminPage = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setIsLoading(true);
        
        // Load rooms and bookings in parallel
        const [roomsResponse, bookingsResponse] = await Promise.all([
          roomService.getMyRooms(),
          bookingService.getOwnerBookings()
        ]);

        if (roomsResponse.success) {
          setRooms(roomsResponse.data);
        }

        if (bookingsResponse.success) {
          setBookings(bookingsResponse.data);
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load rooms and bookings data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handleAddRoom = async (newRoom) => {
    try {
      const response = await roomService.createRoom(newRoom);
      if (response.success) {
        setRooms([...rooms, response.data]);
        toast({ title: "Room added successfully! ✨" });
      }
    } catch (error) {
      toast({
        title: "Add Room Failed",
        description: "Failed to add new room.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRoom = async (updatedRoom) => {
    try {
      const response = await roomService.updateRoom(updatedRoom.id, updatedRoom);
      if (response.success) {
        const updatedRooms = rooms.map(room => 
          room.id === updatedRoom.id ? response.data : room
        );
        setRooms(updatedRooms);
        setSelectedRoom(null);
        setIsEditModalOpen(false);
        toast({ title: "Room updated successfully! ✨" });
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
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const response = await roomService.deleteRoom(roomId);
        if (response.success) {
          const updatedRooms = rooms.filter(room => room.id !== roomId);
          setRooms(updatedRooms);
          toast({ title: "Room deleted successfully! 🗑️" });
        }
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: "Failed to delete room.",
          variant: "destructive"
        });
      }
    }
  };

  const handleEditClick = (room) => {
    setSelectedRoom(room);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - GoRoomz</title>
        <meta name="description" content="Manage rooms and bookings on GoRoomz." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Admin Panel</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Room
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Room Management</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{room.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.location?.address}, {room.location?.city} - ₹{room.price}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(room)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Recent Bookings</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking.id} className="p-4 bg-white/50 rounded-lg">
                  <p className="font-semibold">{booking.room?.title || 'Room'}</p>
                  <p className="text-sm">Booked by: {booking.user?.name} ({booking.user?.email})</p>
                  <p className="text-sm text-muted-foreground">
                    Check-in: {new Date(booking.checkIn).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className={`font-semibold ${
                      booking.status === 'confirmed' ? 'text-green-600' :
                      booking.status === 'pending' ? 'text-yellow-600' :
                      booking.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                    }`}>{booking.status}</span>
                  </p>
                </div>
              )) : (
                <p className="text-muted-foreground">No bookings yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddRoomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddRoom}
      />

      {selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateRoom}
        />
      )}
    </>
  );
};

export default AdminPage;