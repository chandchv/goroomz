import React, { useState } from 'react';
import Icon from '@mdi/react';
import { mdiBed } from '@mdi/js';
import type { Room } from '../../services/roomService';
import { useLongPress } from '../../hooks/useLongPress';

interface RoomCardProps {
  room: Room;
  onClick: (room: Room) => void;
  onEdit?: (room: Room) => void;
  onDelete?: (room: Room) => void;
  onStatusChange?: (room: Room, status: string) => void;
  onLongPress?: (room: Room) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, onEdit, onDelete, onStatusChange, onLongPress }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (onLongPress) {
        onLongPress(room);
        setShowContextMenu(true);
        // Auto-hide context menu after 3 seconds
        setTimeout(() => setShowContextMenu(false), 3000);
      }
    },
    onClick: () => onClick(room),
    delay: 500,
  });

  // Check if room is vacant (available for instant check-in)
  const isVacant = room.currentStatus === 'vacant_clean' || room.currentStatus === 'vacant_dirty';
  const isSharedRoom = room.sharingType && room.sharingType !== 'single' && room.totalBeds && room.totalBeds > 1;

  // Color-coded status indicators
  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return 'Vacant/Clean';
      case 'occupied':
        return 'Occupied';
      case 'vacant_dirty':
        return 'Vacant/Dirty';
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

  return (
    <div
      {...longPressHandlers}
      className={`
        relative p-3 sm:p-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-100
        touch-manipulation select-none
        ${getStatusColor(room.currentStatus)}
      `}
    >
      {/* Context menu indicator */}
      {showContextMenu && (
        <div className="absolute top-0 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg z-10">
          Long press detected
        </div>
      )}

      {/* Instant Check-In indicator for vacant rooms */}
      {isVacant && (
        <div className="absolute top-0 left-0 bg-primary-600 text-white text-xs px-2 py-1 rounded-br-lg rounded-tl-lg z-10">
          {isSharedRoom ? '🛏️ Select Bed' : '⚡ Quick Check-In'}
        </div>
      )}

      {/* Room Number */}
      <div className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
        {room.roomNumber}
      </div>

      {/* Category */}
      {room.categoryName && (
        <div className="text-xs sm:text-sm font-medium mb-1">
          {room.categoryName}
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
        <span className="text-base sm:text-lg">{getStatusIcon(room.currentStatus)}</span>
        <span className="text-xs font-semibold uppercase">
          {getStatusLabel(room.currentStatus)}
        </span>
      </div>

      {/* PG Sharing Info with Bed Icons */}
      {room.sharingType && room.totalBeds && (
        <div className="text-xs mt-2 pt-2 border-t border-current/20">
          <div className="flex justify-between mb-1">
            <span>{room.sharingType.replace('_', ' ')} sharing</span>
            <span className="font-semibold">
              {room.occupiedBeds || 0}/{room.totalBeds}
            </span>
          </div>
          {/* Bed Icons - Red=Occupied, Green=Vacant */}
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from({ length: room.totalBeds }).map((_, i) => (
              <Icon
                key={i}
                path={mdiBed}
                size={0.9}
                color={i < (room.occupiedBeds || 0) ? '#ef4444' : '#22c55e'}
                title={i < (room.occupiedBeds || 0) ? 'Occupied' : 'Vacant'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit/Delete Buttons */}
      {(onEdit || onDelete || onStatusChange) && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-current/20">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(room); }}
              className="flex-1 text-xs px-2 py-1 bg-white/80 hover:bg-white text-blue-700 rounded border border-blue-200 font-medium transition-colors"
            >
              ✏️ Edit
            </button>
          )}
          {onStatusChange && (
            <div className="relative flex-1">
              <button
                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                className="w-full text-xs px-2 py-1 bg-white/80 hover:bg-white text-gray-700 rounded border border-gray-200 font-medium transition-colors"
              >
                🔄 Status
              </button>
              {showStatusMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                  {[
                    { value: 'vacant_clean', label: 'Vacant/Clean', color: 'text-green-700 hover:bg-green-50' },
                    { value: 'vacant_dirty', label: 'Vacant/Dirty', color: 'text-yellow-700 hover:bg-yellow-50' },
                    { value: 'occupied', label: 'Occupied', color: 'text-red-700 hover:bg-red-50' },
                    { value: 'maintenance', label: 'Maintenance', color: 'text-gray-700 hover:bg-gray-50' },
                  ].map(s => (
                    <button
                      key={s.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(room, s.value);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium ${s.color} ${room.currentStatus === s.value ? 'bg-blue-50 font-bold' : ''}`}
                    >
                      {room.currentStatus === s.value ? '✓ ' : ''}{s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(room); }}
              className="text-xs px-2 py-1 bg-white/80 hover:bg-white text-red-600 rounded border border-red-200 font-medium transition-colors"
            >
              🗑️
            </button>
          )}
        </div>
      )}

      {/* Floor indicator (small badge) */}
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 text-xs opacity-50">
        Floor {room.floorNumber}
      </div>
    </div>
  );
};

export default RoomCard;
