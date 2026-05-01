import React from 'react';
import type { Room } from '../../services/roomService';

interface FloorData {
  floorNumber: number;
  rooms: Room[];
  statusCounts: {
    occupied: number;
    vacant_clean: number;
    vacant_dirty: number;
  };
}

interface RoomOverviewGridProps {
  floors: FloorData[];
  onRoomClick: (room: Room) => void;
  showFloorHeaders?: boolean;
  compact?: boolean;
}

const RoomOverviewGrid: React.FC<RoomOverviewGridProps> = ({ 
  floors, 
  onRoomClick, 
  showFloorHeaders = true,
  compact = false 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return 'bg-green-500 hover:bg-green-600';
      case 'occupied':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'vacant_dirty':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return 'Clean';
      case 'occupied':
        return 'Occupied';
      case 'vacant_dirty':
        return 'Dirty';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return '✓';
      case 'occupied':
        return '●';
      case 'vacant_dirty':
        return '!';
      default:
        return '';
    }
  };

  const gridCols = compact 
    ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  const roomSize = compact ? 'p-2' : 'p-3';

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <div key={floor.floorNumber} className="bg-white rounded-lg shadow border">
          {showFloorHeaders && (
            <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Floor {floor.floorNumber}
                </h3>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="font-medium">{floor.statusCounts.vacant_clean}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="font-medium">{floor.statusCounts.occupied}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="font-medium">{floor.statusCounts.vacant_dirty}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4">
            <div className={`grid ${gridCols} gap-2`}>
              {floor.rooms.map((room) => {
                const status = room.currentStatus || room.current_status || 'vacant_clean';
                const roomNumber = room.roomNumber || room.room_number || 'N/A';
                const totalBeds = room.totalBeds || room.total_beds || 1;
                const occupiedBeds = room.occupiedBeds || 0;
                
                return (
                  <div
                    key={room.id}
                    onClick={() => onRoomClick(room)}
                    className={`
                      relative ${roomSize} rounded-lg cursor-pointer
                      transition-all duration-200 hover:shadow-lg hover:scale-105
                      ${getStatusColor(status)} text-white
                      flex flex-col items-center justify-center
                      min-h-[60px] ${compact ? 'text-xs' : 'text-sm'}
                    `}
                    title={`Room ${roomNumber} - ${getStatusLabel(status)}${
                      status === 'occupied' ? ` (${occupiedBeds}/${totalBeds} beds)` : ''
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="text-lg mb-1">
                      {getStatusIcon(status)}
                    </div>
                    
                    {/* Room Number */}
                    <div className="font-bold text-center">
                      {roomNumber}
                    </div>
                    
                    {/* Bed Info for Occupied Rooms */}
                    {status === 'occupied' && !compact && (
                      <div className="text-xs opacity-75 mt-1">
                        {occupiedBeds}/{totalBeds}
                      </div>
                    )}
                    
                    {/* Compact Status Indicator */}
                    {compact && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white opacity-75"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoomOverviewGrid;