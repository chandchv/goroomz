import React, { useState, useEffect } from 'react';
import roomService, { type Room } from '../../services/roomService';
import { bookingService, type Booking } from '../../services/bookingService';

interface RoomChangeModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onRoomChanged: (newRoom: Room) => void;
}

interface FloorData {
  floorNumber: number;
  rooms: Room[];
}

const RoomChangeModal: React.FC<RoomChangeModalProps> = ({
  booking,
  isOpen,
  onClose,
  onRoomChanged,
}) => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState('');
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all');
  const [filterSharingType, setFilterSharingType] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadAvailableRooms();
    }
  }, [isOpen, booking]);

  const loadAvailableRooms = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all rooms for the same property
      const allRooms = await roomService.getRoomsByProperty(booking.room?.propertyId || '');
      
      // Filter for available rooms (vacant_clean status)
      const available = allRooms.filter(room => {
        const status = room.currentStatus || room.current_status;
        return status === 'vacant_clean' && room.id !== booking.roomId;
      });

      setAvailableRooms(available);

      // Group by floors
      const floorMap = new Map<number, Room[]>();
      available.forEach(room => {
        const floorNum = room.floorNumber || room.floor_number || 0;
        if (!floorMap.has(floorNum)) {
          floorMap.set(floorNum, []);
        }
        floorMap.get(floorNum)!.push(room);
      });

      const floorData = Array.from(floorMap.entries())
        .map(([floorNumber, rooms]) => ({
          floorNumber,
          rooms: rooms.sort((a, b) => {
            const roomA = a.roomNumber || a.room_number || '';
            const roomB = b.roomNumber || b.room_number || '';
            return roomA.localeCompare(roomB, undefined, { numeric: true });
          })
        }))
        .sort((a, b) => a.floorNumber - b.floorNumber);

      setFloors(floorData);
    } catch (err: any) {
      setError(err.message || 'Failed to load available rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChange = async () => {
    if (!selectedRoom || !reason.trim()) {
      setError('Please select a room and provide a reason for the change');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Update the booking with new room
      await bookingService.changeRoom(booking.id, {
        newRoomId: selectedRoom.id,
        newBedId: selectedRoom.beds?.[0]?.id, // If room has beds, assign first available
        reason: reason.trim(),
        changedBy: 'current_user' // This should be the actual user ID
      });

      // Call the callback to update the parent component
      onRoomChanged(selectedRoom);
      
      // Close the modal
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change room');
    } finally {
      setProcessing(false);
    }
  };

  const getFilteredRooms = () => {
    return floors.filter(floor => {
      if (filterFloor !== 'all' && floor.floorNumber !== filterFloor) {
        return false;
      }
      return true;
    }).map(floor => ({
      ...floor,
      rooms: floor.rooms.filter(room => {
        if (filterSharingType !== 'all') {
          const sharingType = room.sharingType || room.sharing_type;
          return sharingType === filterSharingType;
        }
        return true;
      })
    })).filter(floor => floor.rooms.length > 0);
  };

  const getRoomStatusColor = (room: Room) => {
    const status = room.currentStatus || room.current_status;
    switch (status) {
      case 'vacant_clean':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'occupied':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'vacant_dirty':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const uniqueFloors = [...new Set(availableRooms.map(room => room.floorNumber || room.floor_number || 0))].sort();
  const uniqueSharingTypes = [...new Set(availableRooms.map(room => room.sharingType || room.sharing_type).filter(Boolean))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Change Room Assignment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Current: Room {booking.room?.roomNumber} (Floor {booking.room?.floorNumber})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading available rooms...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
              {error}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Filter Available Rooms</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                    <select
                      value={filterFloor}
                      onChange={(e) => setFilterFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="all">All Floors</option>
                      {uniqueFloors.map(floor => (
                        <option key={floor} value={floor}>Floor {floor}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sharing Type</label>
                    <select
                      value={filterSharingType}
                      onChange={(e) => setFilterSharingType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="all">All Types</option>
                      {uniqueSharingTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Available Rooms */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Available Rooms ({availableRooms.length} total)
                  </h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Available</span>
                    </div>
                  </div>
                </div>

                {getFilteredRooms().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No available rooms match your filters
                  </div>
                ) : (
                  getFilteredRooms().map((floor) => (
                    <div key={floor.floorNumber} className="border border-gray-200 rounded-lg">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h4 className="font-medium text-gray-900">
                          Floor {floor.floorNumber} ({floor.rooms.length} rooms)
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {floor.rooms.map((room) => {
                            const roomNumber = room.roomNumber || room.room_number || 'N/A';
                            const totalBeds = room.totalBeds || room.total_beds || 1;
                            const sharingType = room.sharingType || room.sharing_type || 'single';
                            const isSelected = selectedRoom?.id === room.id;

                            return (
                              <div
                                key={room.id}
                                onClick={() => setSelectedRoom(room)}
                                className={`
                                  p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                                  hover:shadow-lg hover:scale-105
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-green-500 bg-green-50 hover:border-green-600'
                                  }
                                `}
                              >
                                <div className="text-center">
                                  <div className="font-bold text-lg text-gray-900">{roomNumber}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {sharingType} • {totalBeds} bed{totalBeds > 1 ? 's' : ''}
                                  </div>
                                  {room.price && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      ₹{room.price}/month
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="text-xs text-blue-600 font-medium mt-1">
                                      ✓ Selected
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reason for Change */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Room Change *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for changing the room (e.g., original room occupied, guest preference, maintenance issue)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Selected Room Summary */}
              {selectedRoom && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Selected Room Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Room Number:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {selectedRoom.roomNumber || selectedRoom.room_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Floor:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {selectedRoom.floorNumber || selectedRoom.floor_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Sharing Type:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {selectedRoom.sharingType || selectedRoom.sharing_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Beds:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {selectedRoom.totalBeds || selectedRoom.total_beds}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRoomChange}
            disabled={!selectedRoom || !reason.trim() || processing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Changing Room...' : 'Change Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomChangeModal;