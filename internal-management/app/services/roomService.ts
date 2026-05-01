import { api } from './api';
import { optimisticApiRequest } from '../utils/optimisticApiWrapper';
import type { OptimisticApiOptions } from '../utils/optimisticApiWrapper';

export interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  currentStatus: 'occupied' | 'vacant_clean' | 'vacant_dirty';
  customCategoryId?: string;
  sharingType?: 'single' | 'double' | 'triple' | 'quad' | 'dormitory' | '2_sharing' | '3_sharing';
  totalBeds?: number;
  amenities?: string[];
  price?: number;
  categoryName?: string;
  occupiedBeds?: number;
  lastCleanedAt?: string;
  lastMaintenanceAt?: string;
  roomType?: string;
  category?: string;
  pricingType?: string;
  isActive?: boolean;
  propertyId?: string;
  
  // Support for snake_case fields from backend
  room_number?: string;
  floor_number?: number;
  current_status?: 'occupied' | 'vacant_clean' | 'vacant_dirty';
  sharing_type?: 'single' | 'double' | 'triple' | 'quad' | 'dormitory' | '2_sharing' | '3_sharing';
  total_beds?: number;
  property_id?: string;
}

export interface RoomStatus {
  id: string;
  roomId: string;
  status: 'occupied' | 'vacant_clean' | 'vacant_dirty';
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface BookingHistory {
  id: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  bookingSource: 'online' | 'offline';
}

export interface MaintenanceHistory {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedDate: string;
  completedDate?: string;
}

const roomService = {
  // Get all rooms with current status
  getAllRooms: async (): Promise<Room[]> => {
    const response = await api.get('/api/internal/rooms/status');
    return response.data.data.rooms || []; // Extract the rooms array from the nested data structure
  },

  // Get rooms by floor
  getRoomsByFloor: async (floorNumber: number): Promise<Room[]> => {
    const response = await api.get(`/api/internal/rooms/floor/${floorNumber}`);
    return response.data.data || []; // Extract the actual room array from the API response
  },

  // Get rooms by property ID
  getRoomsByProperty: async (propertyId: string): Promise<Room[]> => {
    const response = await api.get('/api/internal/rooms/status', {
      params: { propertyId }
    });
    return response.data.data.rooms || []; // Extract the rooms array from the nested data structure
  },

  // Get property overview with room statistics
  getPropertyOverview: async (propertyId?: string): Promise<{
    rooms: Room[];
    stats: {
      totalRooms: number;
      totalBeds: number;
      occupiedRooms: number;
      occupiedBeds: number;
      occupancyRate: number;
      bedOccupancyRate: number;
    };
    floors: Array<{
      floorNumber: number;
      roomCount: number;
      statusCounts: {
        occupied: number;
        vacant_clean: number;
        vacant_dirty: number;
      };
    }>;
  }> => {
    const rooms = propertyId 
      ? await roomService.getRoomsByProperty(propertyId)
      : await roomService.getAllRooms();

    // Calculate statistics
    let totalBeds = 0;
    let occupiedBeds = 0;
    let occupiedRooms = 0;
    const floorMap = new Map<number, { rooms: Room[]; statusCounts: { occupied: number; vacant_clean: number; vacant_dirty: number } }>();

    rooms.forEach(room => {
      const beds = room.totalBeds || room.total_beds || 1;
      totalBeds += beds;
      
      const status = room.currentStatus || room.current_status || 'vacant_clean';
      if (status === 'occupied') {
        occupiedRooms++;
        occupiedBeds += room.occupiedBeds || beds;
      }

      // Group by floor
      const floorNum = room.floorNumber || room.floor_number || 0;
      if (!floorMap.has(floorNum)) {
        floorMap.set(floorNum, {
          rooms: [],
          statusCounts: { occupied: 0, vacant_clean: 0, vacant_dirty: 0 }
        });
      }
      
      const floorData = floorMap.get(floorNum)!;
      floorData.rooms.push(room);
      if (status in floorData.statusCounts) {
        floorData.statusCounts[status as keyof typeof floorData.statusCounts]++;
      }
    });

    const stats = {
      totalRooms: rooms.length,
      totalBeds,
      occupiedRooms,
      occupiedBeds,
      occupancyRate: rooms.length > 0 ? (occupiedRooms / rooms.length) * 100 : 0,
      bedOccupancyRate: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0
    };

    const floors = Array.from(floorMap.entries())
      .map(([floorNumber, data]) => ({
        floorNumber,
        roomCount: data.rooms.length,
        statusCounts: data.statusCounts
      }))
      .sort((a, b) => a.floorNumber - b.floorNumber);

    return { rooms, stats, floors };
  },

  // Get room details
  getRoomDetails: async (roomId: string): Promise<Room> => {
    const response = await api.get(`/api/internal/rooms/${roomId}`);
    return response.data;
  },

  // Update room status
  updateRoomStatus: async (
    roomId: string,
    status: 'occupied' | 'vacant_clean' | 'vacant_dirty',
    notes?: string
  ): Promise<RoomStatus> => {
    const response = await api.put(`/api/internal/rooms/${roomId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // Update room status with optimistic update support
  updateRoomStatusOptimistic: async (
    roomId: string,
    status: 'occupied' | 'vacant_clean' | 'vacant_dirty',
    notes?: string,
    options?: OptimisticApiOptions<RoomStatus>
  ): Promise<RoomStatus | null> => {
    return optimisticApiRequest<RoomStatus>(
      {
        method: 'PUT',
        url: `/api/internal/rooms/${roomId}/status`,
        data: { status, notes },
      },
      options
    );
  },

  // Get room booking history
  getRoomBookingHistory: async (roomId: string): Promise<BookingHistory[]> => {
    const response = await api.get(`/api/internal/rooms/${roomId}/bookings`);
    return response.data.data || response.data || [];
  },

  // Get room maintenance history
  getRoomMaintenanceHistory: async (roomId: string): Promise<MaintenanceHistory[]> => {
    const response = await api.get(`/api/internal/maintenance/requests/${roomId}/history`);
    return response.data.data || response.data || [];
  },

  // Update room details
  updateRoom: async (roomId: string, data: Partial<Room>): Promise<Room> => {
    const response = await api.put(`/api/internal/rooms/${roomId}`, data);
    return response.data;
  },

  // Update room details with optimistic update support
  updateRoomOptimistic: async (
    roomId: string,
    data: Partial<Room>,
    options?: OptimisticApiOptions<Room>
  ): Promise<Room | null> => {
    return optimisticApiRequest<Room>(
      {
        method: 'PUT',
        url: `/api/internal/rooms/${roomId}`,
        data,
      },
      options
    );
  },

  // Get unique floor numbers
  getFloors: async (): Promise<number[]> => {
    const rooms = await roomService.getAllRooms();
    const floors = Array.from(new Set(rooms.map(room => room.floorNumber)));
    return floors.sort((a, b) => a - b);
  },

  // Get room status history
  getRoomStatusHistory: async (roomId: string): Promise<RoomStatus[]> => {
    const response = await api.get(`/api/internal/rooms/${roomId}/status-history`);
    return response.data.data || response.data || [];
  },
};

export default roomService;
