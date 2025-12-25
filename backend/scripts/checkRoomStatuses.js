const { Room } = require('../models');

async function checkRoomStatuses() {
  try {
    console.log('🔍 Checking room statuses for 3rd floor rooms...\n');

    const rooms = await Room.findAll({
      where: {
        floorNumber: 3,
        roomNumber: ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310']
      },
      attributes: ['id', 'roomNumber', 'floorNumber', 'currentStatus', 'sharingType', 'totalBeds'],
      order: [['roomNumber', 'ASC']]
    });

    console.log(`Found ${rooms.length} rooms on 3rd floor:\n`);

    rooms.forEach(room => {
      console.log(`Room ${room.roomNumber}:`);
      console.log(`  - ID: ${room.id}`);
      console.log(`  - Status: ${room.currentStatus}`);
      console.log(`  - Sharing Type: ${room.sharingType}`);
      console.log(`  - Total Beds: ${room.totalBeds}`);
      console.log('');
    });

    // Check all possible room statuses
    const allRooms = await Room.findAll({
      attributes: ['currentStatus'],
      group: ['currentStatus']
    });

    console.log('All room statuses in database:');
    allRooms.forEach(room => {
      console.log(`  - ${room.currentStatus}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRoomStatuses();