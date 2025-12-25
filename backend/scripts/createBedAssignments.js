const { Room, BedAssignment } = require('../models');

async function createBedAssignments() {
  try {
    console.log('🛏️ Starting bed assignment creation for existing rooms...');

    // Get all rooms that don't have bed assignments
    const rooms = await Room.findAll({
      include: [
        {
          model: BedAssignment,
          as: 'beds',
          required: false
        }
      ]
    });

    console.log(`📊 Found ${rooms.length} rooms to process`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const room of rooms) {
      const existingBeds = room.beds || [];
      const totalBeds = room.totalBeds || 1;
      
      console.log(`🏠 Processing room ${room.roomNumber} (${room.id})`);
      console.log(`   - Total beds expected: ${totalBeds}`);
      console.log(`   - Existing beds: ${existingBeds.length}`);
      console.log(`   - Sharing type: ${room.sharingType}`);

      // Skip if bed assignments already exist
      if (existingBeds.length >= totalBeds) {
        console.log(`   ✅ Room ${room.roomNumber} already has ${existingBeds.length} bed assignments`);
        skippedCount++;
        continue;
      }

      // Create missing bed assignments
      const bedsToCreate = totalBeds - existingBeds.length;
      const startBedNumber = existingBeds.length + 1;

      console.log(`   🔨 Creating ${bedsToCreate} bed assignments starting from bed ${startBedNumber}`);

      for (let bedNumber = startBedNumber; bedNumber <= totalBeds; bedNumber++) {
        try {
          const bed = await BedAssignment.create({
            roomId: room.id,
            bedNumber: bedNumber,
            status: 'vacant'
          });

          console.log(`     ✅ Created bed ${bedNumber} (${bed.id})`);
          createdCount++;
        } catch (error) {
          console.error(`     ❌ Failed to create bed ${bedNumber}:`, error.message);
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   - Rooms processed: ${rooms.length}`);
    console.log(`   - Rooms skipped (already had beds): ${skippedCount}`);
    console.log(`   - Bed assignments created: ${createdCount}`);
    console.log('✅ Bed assignment creation completed!');

  } catch (error) {
    console.error('❌ Error creating bed assignments:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createBedAssignments()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createBedAssignments };