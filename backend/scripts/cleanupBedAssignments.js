const { sequelize } = require('../config/database');

async function cleanupBedAssignments() {
  try {
    console.log('🧹 Cleaning up bed_assignments table...\n');

    // Step 1: Delete all existing bed assignments (they're orphaned)
    console.log('Step 1: Deleting all existing bed assignments...');
    const [deleteResult] = await sequelize.query(`
      DELETE FROM bed_assignments;
    `);
    console.log(`✅ Deleted all bed assignments`);

    // Step 2: Drop room_id_old column
    console.log('\nStep 2: Dropping room_id_old column...');
    await sequelize.query(`
      ALTER TABLE bed_assignments 
      DROP COLUMN IF EXISTS room_id_old CASCADE;
    `);
    console.log('✅ room_id_old column dropped');

    // Step 3: Make room_id NOT NULL
    console.log('\nStep 3: Making room_id NOT NULL...');
    await sequelize.query(`
      ALTER TABLE bed_assignments 
      ALTER COLUMN room_id SET NOT NULL;
    `);
    console.log('✅ room_id is now NOT NULL');

    console.log('\n🎉 Successfully cleaned up bed_assignments table!');
    console.log('\n📝 Next step: Run createBedsForDoubleRooms.js to create beds for rooms 301-310');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanupBedAssignments();
