const { Room, BedAssignment } = require('../models');

async function testBedsAPI() {
  try {
    console.log('🧪 Testing beds API for Room 301...\n');

    // Find Room 301
    const room301 = await Room.findOne({
      where: {
        roomNumber: '301',
        floorNumber: 3
      }
    });

    if (!room301) {
      console.log('❌ Room 301 not found');
      return;
    }

    console.log(`Found Room 301: ${room301.id}`);
    console.log(`  - Status: ${room301.currentStatus}`);
    console.log(`  - Sharing Type: ${room301.sharingType}`);
    console.log(`  - Total Beds: ${room301.totalBeds}\n`);

    // Get beds for this room (simulate the API call)
    const beds = await BedAssignment.findAll({
      where: { roomId: room301.id },
      attributes: ['id', 'bedNumber', 'status', 'bookingId'],
      order: [['bedNumber', 'ASC']]
    });

    console.log(`Found ${beds.length} beds for Room 301:`);
    beds.forEach(bed => {
      console.log(`  - Bed ${bed.bedNumber}: ${bed.id} (${bed.status})`);
    });

    // Filter to only vacant beds (like the frontend does)
    const vacantBeds = beds.filter(bed => bed.status === 'vacant');
    console.log(`\nVacant beds: ${vacantBeds.length}`);
    vacantBeds.forEach(bed => {
      console.log(`  - Bed ${bed.bedNumber}: ${bed.id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBedsAPI();