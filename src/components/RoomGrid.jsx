import React from 'react';
import { motion } from 'framer-motion';
import RoomCard from '@/components/RoomCard';

const RoomGrid = ({ rooms, onRoomClick }) => {
  if (rooms.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <span className="text-6xl">🏠</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">No rooms found</h3>
        <p className="text-muted-foreground">Try adjusting your search filters</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room, index) => (
        <RoomCard 
          key={room.id} 
          room={room} 
          onClick={() => onRoomClick(room)}
          index={index}
        />
      ))}
    </div>
  );
};

export default RoomGrid;