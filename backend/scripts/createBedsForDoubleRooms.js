const { Room, BedAssignment } = require('../models');

async function createBedsForDoubleRooms() {
  try {
    console.log('🛏️ Creating beds for 3rd floor double sharing rooms (301-310)...\n');

    // Find rooms 301-310 (3rd floor double sharing rooms)
    const doubleRooms = await Room.findAll({
      where: {
        floorNumber: 3,
        roomNumber: ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310']
      },
      attributes: ['id', 'roomNumber', 'floorNumber', 'sharingType']
    });

    console.log(`Found ${doubleRooms.length} double sharing rooms on 3rd floor`);

    let totalBedsCreated = 0;

    for (const room of doubleRooms) {
      console.log(`\n📍 Processing Room ${room.roomNumber}:`);
      
      // Check if beds already exist
      const existingBeds = await BedAssignment.findAll({
        where: { roomId: room.id }
      });

      if (existingBeds.length > 0) {
        console.log(`  ⚠️  Room ${room.roomNumber} already has ${existingBeds.length} beds, skipping`);
        continue;
      }

      // Create 2 beds for each double sharing room
      const bed1 = await BedAssignment.create({
        roomId: room.id,
        bedNumber: 1,
        status: 'vacant'
      });

      const bed2 = await BedAssignment.create({
        roomId: room.id,
        bedNumber: 2,
        status: 'vacant'
      });

      console.log(`  ✅ Created 2 beds:`);
      console.log(`     - Bed 1: ${bed1.id}`);
      console.log(`     - Bed 2: ${bed2.id}`);
      
      totalBedsCreated += 2;

      // Update room sharing type if not set
      if (!room.sharingType) {
        await room.update({ 
          sharingType: '2_sharing',
          totalBeds: 2
        });
        console.log(`  📝 Updated room sharing type to '2_sharing'`);
      }
    }

    console.log(`\n🎉 Successfully created ${totalBedsCreated} beds for ${doubleRooms.length} double sharing rooms!`);
    
    // Show summary of all beds created
    console.log('\n📋 Bed Summary:');
    for (const room of doubleRooms) {
      const beds = await BedAssignment.findAll({
        where: { roomId: room.id },
        attributes: ['id', 'bedNumber', 'status']
      });
      
      console.log(`  Room ${room.roomNumber}:`);
      beds.forEach(bed => {
        console.log(`    - Bed ${bed.bedNumber}: ${bed.id} (${bed.status})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating beds:', error.message);
    process.exit(1);
  }
}

createBedsForDoubleRooms();