import React, { useState, useEffect } from 'react';
import RoomGrid from '../components/rooms/RoomGrid';
import RoomDetailModal from '../components/rooms/RoomDetailModal';
import RoomStatusUpdateModal from '../components/rooms/RoomStatusUpdateModal';
import InstantCheckInModal from '../components/checkin/InstantCheckInModal';
import BedSelectionModal from '../components/checkin/BedSelectionModal';
import WalkInModal from '../components/bookings/WalkInModal';
import PropertyIndicator from '../components/PropertyIndicator';
import roomService, { type Room } from '../services/roomService';
import { useSelectedProperty } from '../hooks/useSelectedProperty';
import { api } from '../services/api';

const SHARING_TYPES = [
  { value: 'single', label: 'Single', beds: 1, icon: '🛏️' },
  { value: 'double', label: 'Double', beds: 2, icon: '🛏️🛏️' },
  { value: 'triple', label: 'Triple', beds: 3, icon: '🛏️🛏️🛏️' },
  { value: 'four', label: 'Four', beds: 4, icon: '🛏️🛏️🛏️🛏️' },
];

const ROOM_AMENITIES = [
  'AC', 'Attached Bathroom', 'Balcony', 'WiFi', 'Wardrobe',
  'Study Table', 'Geyser', 'Power Backup', 'TV', 'Cooler'
];

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

  // Walk-in modal state
  const [walkInRoom, setWalkInRoom] = useState<Room | null>(null);

  // Room create/edit modal state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floorNumber: '1',
    sharingType: 'double',
    totalBeds: 2,
    monthlyRent: '',
    dailyRate: '',
    securityDeposit: '',
    amenities: [] as string[],
  });

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

  // Handle room click — open walk-in for vacant rooms, detail modal for occupied
  const handleRoomClick = (room: Room) => {
    const status = room.currentStatus || (room as any).current_status || '';
    const isVacant = status === 'vacant_clean' || status === 'vacant_dirty';
    const isSharing = !!(room.sharingType && room.sharingType !== 'single');
    const hasAvailableBeds = isSharing && ((room.totalBeds || 1) - (room.occupiedBeds || 0)) > 0;

    if (isVacant || hasAvailableBeds) {
      // Open quick walk-in check-in
      setWalkInRoom(room);
    } else {
      // Occupied single room — show detail modal
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
    setEditingRoom(room);
    const r = room as any;
    setRoomForm({
      roomNumber: r.roomNumber || '',
      floorNumber: String(r.floorNumber || 1),
      sharingType: r.sharingType || r.pgOptions?.sharingType || 'double',
      totalBeds: r.totalBeds || r.maxGuests || 2,
      monthlyRent: String(r.pgOptions?.monthlyRent || r.monthlyRate || r.price || ''),
      dailyRate: String(r.pgOptions?.dailyRate || r.dailyRate || ''),
      securityDeposit: String(r.pgOptions?.securityDeposit || ''),
      amenities: r.amenities || [],
    });
    setShowRoomModal(true);
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      roomNumber: '',
      floorNumber: selectedFloor === 'all' ? '1' : String(selectedFloor),
      sharingType: 'double',
      totalBeds: 2,
      monthlyRent: '',
      dailyRate: '',
      securityDeposit: '',
      amenities: [],
    });
    setShowRoomModal(true);
  };

  const handleSharingChange = (type: string) => {
    const config = SHARING_TYPES.find(s => s.value === type);
    setRoomForm(prev => ({ ...prev, sharingType: type, totalBeds: config?.beds || prev.totalBeds }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setRoomForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleRoomSave = async () => {
    if (!roomForm.roomNumber || !roomForm.monthlyRent || !selectedProperty) return;

    // Check for duplicate room number within the same property (only for new rooms)
    if (!editingRoom) {
      const duplicate = rooms.find(r => r.roomNumber === roomForm.roomNumber);
      if (duplicate) {
        alert(`Room number ${roomForm.roomNumber} already exists in this property. Please use a different number.`);
        return;
      }
    }

    const sharingLabel = SHARING_TYPES.find(s => s.value === roomForm.sharingType)?.label || 'Double';
    const title = `${sharingLabel} Sharing Room - ${roomForm.roomNumber}`;
    const description = `${sharingLabel} sharing PG room (Room ${roomForm.roomNumber}) on floor ${roomForm.floorNumber} with ${roomForm.totalBeds} bed(s). Monthly rent ₹${roomForm.monthlyRent} per bed.`;

    const payload = {
      title,
      roomNumber: roomForm.roomNumber,
      description,
      price: Number(roomForm.monthlyRent),
      roomType: 'PG',
      category: 'PG',
      maxGuests: Number(roomForm.totalBeds),
      amenities: roomForm.amenities,
      pricingType: 'monthly',
      approvalStatus: 'approved',
      isActive: true,
      currentStatus: 'vacant_clean',
      location: { city: 'Bangalore', state: 'Karnataka', area: selectedProperty.location || '' },
      propertyDetails: {
        propertyId: selectedProperty.id,
        floorNumber: Number(roomForm.floorNumber),
        totalBeds: Number(roomForm.totalBeds),
        dailyRate: Number(roomForm.dailyRate) || 0,
        monthlyRate: Number(roomForm.monthlyRent),
      },
      pgOptions: {
        sharingType: roomForm.sharingType,
        monthlyRent: Number(roomForm.monthlyRent),
        dailyRate: Number(roomForm.dailyRate) || 0,
        securityDeposit: Number(roomForm.securityDeposit) || 0,
        noticePeriod: 30,
        foodIncluded: false,
      },
    };

    try {
      setRoomSaving(true);
      if (editingRoom) {
        await api.put(`/api/rooms/${editingRoom.id}`, payload);
      } else {
        await api.post('/api/rooms', payload);
      }
      setShowRoomModal(false);
      setEditingRoom(null);
      loadRooms();
    } catch (err: any) {
      alert('Failed to save room: ' + (err.response?.data?.message || err.message));
    } finally {
      setRoomSaving(false);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Delete Room ${room.roomNumber || (room as any).title}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/rooms/${room.id}`);
      loadRooms();
    } catch (err: any) {
      alert('Failed to delete room: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusChange = async (room: Room, newStatus: string) => {
    try {
      await api.put(`/api/internal/rooms/${room.id}/status`, { status: newStatus });
      // Update local state immediately for responsiveness
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, currentStatus: newStatus as any } : r));
    } catch (err: any) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
      loadRooms(); // Reload on error to get correct state
    }
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Open walk-in with no pre-selected room — user picks from available
                // Find first vacant room and open walk-in, or show a message
                const firstVacant = rooms.find(r => r.currentStatus === 'vacant_clean' || r.currentStatus === 'vacant_dirty');
                if (firstVacant) {
                  setWalkInRoom(firstVacant);
                } else {
                  alert('No vacant rooms available. Please select a room from the floor view.');
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
            >
              🚶 Walk-in Check-in
            </button>
            <button
              onClick={handleAddRoom}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Room
            </button>
            {hasMultipleProperties && (
              <div className="text-right">
                <PropertyIndicator size="md" className="mb-2" />
              </div>
            )}
          </div>
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
        <RoomGrid rooms={filteredRooms} onRoomClick={handleRoomClick} onEditRoom={handleEditRoom} onDeleteRoom={handleDeleteRoom} onStatusChange={handleStatusChange} />
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

      {/* Walk-In Modal — quick check-in from floor view */}
      {walkInRoom && selectedProperty && (
        <WalkInModal
          room={walkInRoom}
          propertyId={selectedProperty.id}
          ownerId={selectedProperty.ownerId || (selectedProperty as any).owner_id || ''}
          onClose={() => setWalkInRoom(null)}
          onSuccess={() => {
            setWalkInRoom(null);
            loadRooms();
            alert('Walk-in check-in registered successfully!');
          }}
        />
      )}

      {/* Room Create/Edit Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRoomModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRoom ? `Edit Room ${editingRoom.roomNumber || ''}` : 'Add New Room'}
              </h3>
              <button onClick={() => setShowRoomModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Room Number & Floor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="e.g. 101, G102"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor Number</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={roomForm.floorNumber}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, floorNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sharing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sharing Type *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SHARING_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleSharingChange(type.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        roomForm.sharingType === type.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{type.icon}</div>
                      <p className="text-xs font-medium">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Beds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Beds</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={roomForm.totalBeds}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, totalBeds: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent/Bed (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={roomForm.monthlyRent}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    placeholder="8000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate/Bed (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={roomForm.dailyRate}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, dailyRate: e.target.value }))}
                    placeholder="500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={roomForm.securityDeposit}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, securityDeposit: e.target.value }))}
                    placeholder="10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_AMENITIES.map(amenity => (
                    <label
                      key={amenity}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        roomForm.amenities.includes(amenity)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={roomForm.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {editingRoom && (
                  <button
                    onClick={() => { setShowRoomModal(false); handleDeleteRoom(editingRoom); }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={handleRoomSave}
                  disabled={roomSaving || !roomForm.roomNumber || !roomForm.monthlyRent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {roomSaving ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorViewPage;
