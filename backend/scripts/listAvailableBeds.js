const { BedAssignment, Room } = require('../models');

async function listAvailableBeds() {
  try {
    console.log('🛏️ Listing all available beds...\n');

    const beds = await BedAssignment.findAll({
      include: [{
        model: Room,
        as: 'room',
        attributes: ['id', 'roomNumber', 'floorNumber', 'title']
      }],
      attributes: ['id', 'bedNumber', 'status', 'roomId'],
      order: [['room', 'floorNumber'], ['room', 'roomNumber'], ['bedNumber']]
    });

    console.log(`Found ${beds.length} beds total\n`);

    const bedsByFloor = {};
    beds.forEach(bed => {
      const floor = bed.room?.floorNumber || 'Unknown';
      if (!bedsByFloor[floor]) bedsByFloor[floor] = [];
      bedsByFloor[floor].push(bed);
    });

    Object.keys(bedsByFloor).sort().forEach(floor => {
      console.log(`🏢 Floor ${floor}:`);
      bedsByFloor[floor].forEach(bed => {
        const roomInfo = bed.room ? `Room ${bed.room.roomNumber}` : 'Unknown Room';
        console.log(`  - ${roomInfo} Bed ${bed.bedNumber}: ${bed.id} (${bed.status})`);
      });
      console.log('');
    });

    const thirdFloorBeds = beds.filter(bed => bed.room?.floorNumber === 3);
    if (thirdFloorBeds.length > 0) {
      console.log('\n🎯 3rd Floor Beds (for booking):');
      thirdFloorBeds.forEach(bed => {
        console.log(`  Room ${bed.room.roomNumber} Bed ${bed.bedNumber}: ${bed.id}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAvailableBeds();
