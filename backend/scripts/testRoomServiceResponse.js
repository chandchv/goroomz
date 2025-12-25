const { Room } = require('../models');

async function testRoomServiceResponse() {
  try {
    console.log('🧪 Testing room service response (simulating frontend call)...\n');

    // Simulate what roomService.getAllRooms() returns
    const roomsData = await Room.findAll({
      attributes: [
        'id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 
        'sharingType', 'totalBeds', 'price'
      ],
      order: [['floorNumber'], ['roomNumber']]
    });

    console.log(`Found ${roomsData.length} total rooms\n`);

    // Filter to only show available rooms (like frontend does)
    const availableRooms = roomsData.filter(
      room => room.currentStatus === 'vacant_clean'
    );

    console.log(`Available rooms: ${availableRooms.length}\n`);

    // Show 3rd floor rooms specifically
    const thirdFloorRooms = availableRooms.filter(room => room.floorNumber === 3);
    console.log(`3rd floor available rooms: ${thirdFloorRooms.length}\n`);

    thirdFloorRooms.forEach(room => {
      console.log(`Room ${room.roomNumber}:`);
      console.log(`  - ID: ${room.id}`);
      console.log(`  - Sharing Type: ${room.sharingType} (truthy: ${!!room.sharingType})`);
      console.log(`  - Total Beds: ${room.totalBeds}`);
      console.log(`  - Status: ${room.currentStatus}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testRoomServiceResponse();