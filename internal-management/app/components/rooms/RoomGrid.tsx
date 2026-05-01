import React from 'react';
import RoomCard from './RoomCard';
import type { Room } from '../../services/roomService';

interface RoomGridProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
}

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, onRoomClick }) => {
  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No rooms found on this floor</p>
          <p className="text-sm">Add rooms to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onClick={onRoomClick} />
      ))}
    </div>
  );
};

export default RoomGrid;
