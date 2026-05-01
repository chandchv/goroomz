import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import api from '../services/api';
import BulkRoomCreationModal from '../components/BulkRoomCreationModal';
import RoomEditModal from '../components/RoomEditModal';
import { useRole } from '../hooks/useRole';

interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  sharingType: string;
  totalBeds: number;
  currentStatus: string;
  occupiedBeds: number;
  availableBeds: number;
  dailyRate?: number;
  monthlyRate?: number;
  description?: string;
}

interface Property {
  id: string;
  name: string;
  type: 'Hotel' | 'PG';
  address?: string;
  ownerId: string;
  title?: string;
  category?: string;
  location?: any;
  totalRooms: number;
  occupiedRooms: number;
  createdAt: string;
  updatedAt: string;
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { hasAdminAccess, hasManagerAccess, isAgent } = useRole();
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkRoomModal, setShowBulkRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterSharing, setFilterSharing] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Check if user has permission to add rooms
  // Agents, Regional Managers, Operations Managers, Platform Admins, and Superusers can add rooms
  const canAddRooms = isAgent() || hasManagerAccess() || hasAdminAccess();

  useEffect(() => {
    loadPropertyDetails();
  }, [propertyId]);

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load property details from the internal properties endpoint
      const propertyResponse = await api.get(`/api/internal/properties/${propertyId}`);
      
      if (!propertyResponse.data.success) {
        setError('Property not found or you don\'t have access to it.');
        setProperty(null);
        setRooms([]);
        return;
      }

      const propertyData = propertyResponse.data.data;
      
      // Get rooms for this property
      const roomsData = propertyData.rooms || [];

      // Calculate occupancy statistics
      const totalRooms = roomsData.length;
      const occupiedRooms = roomsData.filter((r: any) => r.currentStatus === 'occupied').length;

      setProperty({
        id: propertyData.id,
        name: propertyData.name || 'Unnamed Property',
        type: propertyData.type === 'hotel' ? 'Hotel' : 'PG',
        address: propertyData.location?.address,
        ownerId: propertyData.ownerId || '',
        title: propertyData.name,
        category: propertyData.category?.name,
        location: propertyData.location,
        totalRooms,
        occupiedRooms,
        createdAt: propertyData.createdAt || new Date().toISOString(),
        updatedAt: propertyData.updatedAt || new Date().toISOString()
      });

      // Map rooms data to the Room interface (handle both camelCase and snake_case)
      const mappedRooms = roomsData.map((room: any) => {
        // Parse property_details JSON if it exists
        let propertyDetails = {};
        try {
          if (room.property_details && typeof room.property_details === 'string') {
            propertyDetails = JSON.parse(room.property_details);
          } else if (room.property_details && typeof room.property_details === 'object') {
            propertyDetails = room.property_details;
          }
        } catch (e) {
          console.warn('Failed to parse property_details for room:', room.id);
        }

        return {
          id: room.id,
          roomNumber: room.roomNumber || room.room_number || room.title || 'N/A',
          floorNumber: Number(room.floorNumber || room.floor_number || (propertyDetails as any).floorNumber) || 0,
          sharingType: room.sharingType || room.sharing_type || 'single',
          totalBeds: Number(room.totalBeds || room.total_beds) || 1,
          currentStatus: room.currentStatus || room.current_status || 'vacant_clean',
          occupiedBeds: room.occupiedBeds || room.occupied_beds || 0,
          availableBeds: room.availableBeds || room.available_beds || (Number(room.totalBeds || room.total_beds) || 1),
          dailyRate: (propertyDetails as any).dailyRate || room.price || 0,
          monthlyRate: (propertyDetails as any).monthlyRate || 0,
          description: room.description || ''
        };
      });

      setRooms(mappedRooms);
    } catch (err: any) {
      setError(err.message || 'Failed to load property details');
      console.error('Error loading property:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRoomSuccess = () => {
    setShowBulkRoomModal(false);
    loadPropertyDetails();
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setShowEditRoomModal(true);
  };

  const handleEditRoomSuccess = () => {
    setShowEditRoomModal(false);
    setSelectedRoom(null);
    loadPropertyDetails();
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/internal/rooms/${roomId}`);
      if (response.data.success) {
        alert('Room deleted successfully');
        loadPropertyDetails();
      } else {
        alert('Failed to delete room: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (filterFloor) {
      const roomNum = room.roomNumber || '';
      let roomFloorKey;
      if (roomNum.startsWith('G')) {
        roomFloorKey = `G${room.floorNumber}`;
      } else if (roomNum.startsWith('B')) {
        roomFloorKey = `B${room.floorNumber}`;
      } else {
        roomFloorKey = room.floorNumber?.toString();
      }
      if (roomFloorKey !== filterFloor) return false;
    }
    if (filterSharing && room.sharingType !== filterSharing) return false;
    if (filterStatus && room.currentStatus !== filterStatus) return false;
    return true;
  });

  // Group rooms by floor and sort rooms within each floor
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floorNumber || 0;
    const roomNum = room.roomNumber || '';
    
    // Determine floor display key based on room number format
    let floorKey;
    if (roomNum.startsWith('G')) {
      floorKey = `G${floor}`;
    } else if (roomNum.startsWith('B')) {
      floorKey = `B${floor}`;
    } else {
      floorKey = floor.toString();
    }
    
    if (!acc[floorKey]) acc[floorKey] = [];
    acc[floorKey].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  // Sort rooms within each floor by room number
  Object.keys(roomsByFloor).forEach(floorKey => {
    roomsByFloor[floorKey].sort((a, b) => {
      const aNum = parseInt(a.roomNumber.replace(/[GB]/g, '')) || 0;
      const bNum = parseInt(b.roomNumber.replace(/[GB]/g, '')) || 0;
      return aNum - bNum;
    });
  });

  // Sort floors: regular floors first (1, 2, 3...), then ground (G1, G2...), then basement (B1, B2...)
  const floors = Object.keys(roomsByFloor).sort((a, b) => {
    if (a.startsWith('B') && b.startsWith('B')) {
      return parseInt(a.substring(1)) - parseInt(b.substring(1));
    }
    if (a.startsWith('G') && b.startsWith('G')) {
      return parseInt(a.substring(1)) - parseInt(b.substring(1));
    }
    if (!isNaN(Number(a)) && !isNaN(Number(b))) {
      return Number(a) - Number(b);
    }
    // Mixed types: regular floors first, then ground, then basement
    if (!isNaN(Number(a)) && (b.startsWith('G') || b.startsWith('B'))) return -1;
    if ((a.startsWith('G') || a.startsWith('B')) && !isNaN(Number(b))) return 1;
    if (a.startsWith('G') && b.startsWith('B')) return -1;
    if (a.startsWith('B') && b.startsWith('G')) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-2 text-lg font-semibold">{error}</p>
          <p className="text-gray-500 text-sm">The property you're looking for could not be found or you don't have access to it.</p>
        </div>
        <button
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">Property not found</p>
        <button
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/properties')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name || property.title}</h1>
            <p className="text-gray-600">
              {property.location?.city}, {property.location?.state} • {property.type || property.category}
            </p>
          </div>
          {canAddRooms && (
            <button
              onClick={() => setShowBulkRoomModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rooms
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Rooms</div>
          <div className="text-3xl font-bold text-gray-900">{property.totalRooms}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupied</div>
          <div className="text-3xl font-bold text-gray-900">{property.occupiedRooms}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Available</div>
          <div className="text-3xl font-bold text-gray-900">
            {property.totalRooms - property.occupiedRooms}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupancy Rate</div>
          <div className="text-3xl font-bold text-gray-900">
            {property.totalRooms > 0 
              ? Math.round((property.occupiedRooms / property.totalRooms) * 100) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Floors</option>
            {floors.map(floorKey => {
              const floorDisplayName = floorKey.startsWith('G') 
                ? `Ground ${floorKey.substring(1)}` 
                : floorKey.startsWith('B') 
                  ? `Basement ${floorKey.substring(1)}`
                  : `Floor ${floorKey}`;
              return (
                <option key={floorKey} value={floorKey}>{floorDisplayName}</option>
              );
            })}
          </select>
          <select
            value={filterSharing}
            onChange={(e) => setFilterSharing(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Sharing Types</option>
            <option value="single">Single</option>
            <option value="double">2-Sharing</option>
            <option value="triple">3-Sharing</option>
            <option value="quad">4-Sharing</option>
            <option value="dormitory">Dormitory</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant_clean">Vacant Clean</option>
            <option value="vacant_dirty">Vacant Dirty</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Rooms by Floor */}
      {floors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-600 mb-4">No rooms added yet</p>
          {canAddRooms && (
            <button
              onClick={() => setShowBulkRoomModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Your First Rooms
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map(floorKey => {
            const floorDisplayName = floorKey.startsWith('G') 
              ? `Ground ${floorKey.substring(1)}` 
              : floorKey.startsWith('B') 
                ? `Basement ${floorKey.substring(1)}`
                : `Floor ${floorKey}`;
                
            return (
            <div key={floorKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {floorDisplayName} ({roomsByFloor[floorKey].length} rooms)
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roomsByFloor[floorKey].map(room => {
                    const occupancyPercentage = room.totalBeds > 0 
                      ? Math.round((room.occupiedBeds / room.totalBeds) * 100) 
                      : 0;
                    
                    return (
                      <div
                        key={room.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Room {room.roomNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {room.sharingType?.replace('_', '-') || 'N/A'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              room.currentStatus === 'occupied'
                                ? 'bg-red-100 text-red-800'
                                : room.currentStatus === 'vacant_clean'
                                ? 'bg-green-100 text-green-800'
                                : room.currentStatus === 'vacant_dirty'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {room.currentStatus?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-2">
                          <div className="flex justify-between">
                            <span>Total Beds:</span>
                            <span className="font-medium text-gray-900">{room.totalBeds || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Occupied:</span>
                            <span className="font-medium text-red-600">{room.occupiedBeds || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vacant:</span>
                            <span className="font-medium text-green-600">{room.availableBeds || 0}</span>
                          </div>
                          {room.dailyRate && room.dailyRate > 0 && (
                            <div className="flex justify-between">
                              <span>Daily Rate:</span>
                              <span className="font-medium text-blue-600">₹{room.dailyRate}</span>
                            </div>
                          )}
                          {room.monthlyRate && room.monthlyRate > 0 && (
                            <div className="flex justify-between">
                              <span>Monthly Rate:</span>
                              <span className="font-medium text-blue-600">₹{room.monthlyRate}</span>
                            </div>
                          )}
                        </div>
                        {/* Occupancy bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Occupancy</span>
                            <span className="font-medium">{occupancyPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                occupancyPercentage === 100 ? 'bg-red-500' :
                                occupancyPercentage >= 75 ? 'bg-orange-500' :
                                occupancyPercentage >= 50 ? 'bg-yellow-500' :
                                occupancyPercentage > 0 ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${occupancyPercentage}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          className="mt-2 w-full px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 mb-2"
                        >
                          View Details
                        </button>
                        {canAddRooms && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRoom(room)}
                              className="flex-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="flex-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Bulk Room Creation Modal */}
      {showBulkRoomModal && property && (
        <BulkRoomCreationModal
          isOpen={showBulkRoomModal}
          onClose={() => setShowBulkRoomModal(false)}
          property={property}
          onSuccess={handleBulkRoomSuccess}
        />
      )}

      {/* Room Edit Modal */}
      {showEditRoomModal && selectedRoom && (
        <RoomEditModal
          isOpen={showEditRoomModal}
          onClose={() => setShowEditRoomModal(false)}
          room={selectedRoom}
          onSuccess={handleEditRoomSuccess}
        />
      )}
    </div>
  );
}
