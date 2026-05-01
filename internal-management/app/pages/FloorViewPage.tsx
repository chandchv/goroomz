import React, { useState, useEffect } from 'react';
import RoomGrid from '../components/rooms/RoomGrid';
import RoomDetailModal from '../components/rooms/RoomDetailModal';
import RoomStatusUpdateModal from '../components/rooms/RoomStatusUpdateModal';
import InstantCheckInModal from '../components/checkin/InstantCheckInModal';
import BedSelectionModal from '../components/checkin/BedSelectionModal';
import PropertyIndicator from '../components/PropertyIndicator';
import roomService, { type Room } from '../services/roomService';
import { useSelectedProperty } from '../hooks/useSelectedProperty';

const FloorViewPage: React.FC = () => {
  const { selectedProperty, hasMultipleProperties } = useSelectedProperty();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<number[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [statusUpdateRoom, setStatusUpdateRoom] = useState<Room | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Instant check-in state
  const [instantCheckInRoom, setInstantCheckInRoom] = useState<Room | null>(null);
  const [bedSelectionRoom, setBedSelectionRoom] = useState<Room | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | undefined>(undefined);

  // Load rooms and floors when component mounts or property changes
  useEffect(() => {
    console.log('FloorViewPage useEffect - selectedProperty:', selectedProperty?.id, 'hasMultipleProperties:', hasMultipleProperties);
    if (selectedProperty?.id) {
      loadRooms();
    } else if (!hasMultipleProperties) {
      // Single property user - wait for property to be loaded
      console.log('Waiting for property to be loaded...');
    }
  }, [selectedProperty?.id, hasMultipleProperties]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading rooms for property:', selectedProperty?.id);
      
      // Use property-specific room loading
      const allRooms = selectedProperty?.id 
        ? await roomService.getRoomsByProperty(selectedProperty.id)
        : await roomService.getAllRooms();
      
      console.log('Loaded rooms:', allRooms?.length || 0);
      
      // Ensure allRooms is an array
      const roomsArray = Array.isArray(allRooms) ? allRooms : [];
      setRooms(roomsArray);

      // Extract unique floors and sort them
      const uniqueFloors = [...new Set(roomsArray.map(room => 
        room.floorNumber || room.floor_number || 0
      ))].filter(floor => floor !== undefined);
      setFloors(uniqueFloors.sort((a, b) => a - b));
      setLastUpdated(new Date());
      
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
      console.error('Error loading rooms:', err);
      setRooms([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Filter rooms by selected floor
  const filteredRooms = Array.isArray(rooms) 
    ? (selectedFloor === 'all'
        ? rooms
        : rooms.filter(room => room.floorNumber === selectedFloor))
    : [];

  // Handle room click - detect vacant rooms for instant check-in
  const handleRoomClick = (room: Room) => {
    const status = room.currentStatus || room.current_status;
    const isVacant = status === 'vacant_clean' || status === 'vacant_dirty';
    const isSharedRoom = room.sharingType && room.sharingType !== 'single' && room.totalBeds && room.totalBeds > 1;
    
    if (isVacant) {
      // For vacant rooms, check if it's a shared room
      if (isSharedRoom) {
        // Show bed selection first for shared rooms
        setBedSelectionRoom(room);
      } else {
        // Open instant check-in directly for single rooms
        setInstantCheckInRoom(room);
        setSelectedBedId(undefined);
      }
    } else {
      // For occupied or other status rooms, show detail modal
      setSelectedRoom(room);
    }
  };

  // Handle bed selection for shared rooms
  const handleBedSelected = (bedId: string) => {
    if (bedSelectionRoom) {
      setSelectedBedId(bedId);
      setInstantCheckInRoom(bedSelectionRoom);
      setBedSelectionRoom(null);
    }
  };

  // Handle instant check-in success
  const handleInstantCheckInSuccess = () => {
    setInstantCheckInRoom(null);
    setSelectedBedId(undefined);
    loadRooms(); // Refresh room list
    alert('Check-in completed successfully!');
  };

  // Handle instant check-in close
  const handleInstantCheckInClose = () => {
    setInstantCheckInRoom(null);
    setSelectedBedId(undefined);
  };

  // Handle bed selection close
  const handleBedSelectionClose = () => {
    setBedSelectionRoom(null);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setSelectedRoom(null);
  };

  // Handle status update
  const handleStatusUpdate = () => {
    if (selectedRoom) {
      setStatusUpdateRoom(selectedRoom);
    }
  };

  // Handle status update success
  const handleStatusUpdateSuccess = () => {
    loadRooms();
    setStatusUpdateRoom(null);
  };

  // Handle edit room
  const handleEditRoom = (room: Room) => {
    // TODO: Will be implemented later
    console.log('Edit room clicked:', room);
  };

  // Handle room booking
  const handleBookRoom = (room: Room) => {
    // Navigate to booking creation with room pre-selected
    window.location.href = `/bookings/create?roomId=${room.id}`;
  };

  // Handle room check-in
  const handleCheckIn = (room: Room) => {
    // Navigate to check-in page with room pre-selected
    window.location.href = `/check-in?roomId=${room.id}`;
  };

  // Handle room check-out
  const handleCheckOut = (room: Room) => {
    // Navigate to check-out page with room pre-selected
    window.location.href = `/check-out?roomId=${room.id}`;
  };

  // Get status summary
  const getStatusSummary = () => {
    const summary = {
      occupied: 0,
      vacant_clean: 0,
      vacant_dirty: 0,
    };

    filteredRooms.forEach(room => {
      if (room.currentStatus in summary) {
        summary[room.currentStatus as keyof typeof summary]++;
      }
    });

    return summary;
  };

  const statusSummary = getStatusSummary();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  // Show property selection message if user has multiple properties but none selected
  if (hasMultipleProperties && !selectedProperty) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Property</h2>
          <p className="text-gray-600 mb-4">
            Please select a property from the header to view its floor plan and room status.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadRooms}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Floor View</h1>
            <p className="text-gray-600">Manage rooms and view status by floor</p>
          </div>
          {hasMultipleProperties && (
            <div className="text-right">
              <PropertyIndicator size="md" className="mb-2" />
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-yellow-800 text-sm font-medium mb-1">Occupied</div>
              <div className="text-3xl font-bold text-yellow-900">{statusSummary.occupied}</div>
            </div>
            <div className="text-yellow-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-800 text-sm font-medium mb-1">Vacant/Clean</div>
              <div className="text-3xl font-bold text-green-900">{statusSummary.vacant_clean}</div>
            </div>
            <div className="text-green-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-800 text-sm font-medium mb-1">Vacant/Dirty</div>
              <div className="text-3xl font-bold text-red-900">{statusSummary.vacant_dirty}</div>
            </div>
            <div className="text-red-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Selector Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                ${selectedFloor === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              All Floors ({rooms.length})
            </button>
            {floors.map(floor => {
              const floorRoomCount = rooms.filter(r => r.floorNumber === floor).length;
              return (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`
                    whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                    ${selectedFloor === floor
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  Floor {floor} ({floorRoomCount})
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length > 0 ? (
        <RoomGrid rooms={filteredRooms} onRoomClick={handleRoomClick} />
      ) : (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Found</h3>
          <p className="text-gray-600 mb-4">
            {selectedFloor === 'all' 
              ? 'No rooms are available for this property.'
              : `No rooms found on floor ${selectedFloor}.`
            }
          </p>
          <button
            onClick={loadRooms}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={loadRooms}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={handleCloseModal}
          onStatusUpdate={handleStatusUpdate}
          onEdit={handleEditRoom}
          onBookRoom={handleBookRoom}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      )}

      {/* Room Status Update Modal */}
      {statusUpdateRoom && (
        <RoomStatusUpdateModal
          room={statusUpdateRoom}
          onClose={() => setStatusUpdateRoom(null)}
          onSuccess={handleStatusUpdateSuccess}
        />
      )}

      {/* Bed Selection Modal for Shared Rooms */}
      {bedSelectionRoom && (
        <BedSelectionModal
          room={bedSelectionRoom}
          onClose={handleBedSelectionClose}
          onBedSelected={handleBedSelected}
        />
      )}

      {/* Instant Check-In Modal */}
      {instantCheckInRoom && selectedProperty && (
        <InstantCheckInModal
          room={instantCheckInRoom}
          selectedBedId={selectedBedId}
          propertyId={selectedProperty.id}
          ownerId={selectedProperty.ownerId || selectedProperty.owner_id || ''}
          onClose={handleInstantCheckInClose}
          onSuccess={handleInstantCheckInSuccess}
        />
      )}
    </div>
  );
};

export default FloorViewPage;
