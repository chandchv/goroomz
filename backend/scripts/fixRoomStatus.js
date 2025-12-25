const { Room } = require('../models');

async function fixRoomStatus() {
  try {
    console.log('🔧 Fixing room 302 status...');
    
    const room = await Room.findByPk('f62b9dcf-117c-4311-bdec-5691338ea616');
    
    if (!room) {
      console.log('❌ Room not found');
      return;
    }
    
    console.log('📋 Current room status:', room.currentStatus);
    
    await room.update({
      currentStatus: 'vacant_clean'
    });
    
    console.log('✅ Room status updated to vacant_clean');
    
  } catch (error) {
    console.error('❌ Error fixing room status:', error);
  }
}

fixRoomStatus();