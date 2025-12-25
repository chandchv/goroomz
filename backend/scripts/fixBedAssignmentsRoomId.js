const { sequelize } = require('../config/database');

async function fixBedAssignmentsRoomId() {
  try {
    console.log('🔧 Fixing bed_assignments table room_id columns...\n');

    // Step 1: Copy any data from room_id_old to room_id if room_id is null
    console.log('Step 1: Copying data from room_id_old to room_id where needed...');
    const [result] = await sequelize.query(`
      UPDATE bed_assignments 
      SET room_id = room_id_old 
      WHERE room_id IS NULL AND room_id_old IS NOT NULL;
    `);
    console.log(`✅ Updated ${result.rowCount || 0} rows`);

    // Step 2: Make room_id_old nullable
    console.log('\nStep 2: Making room_id_old nullable...');
    await sequelize.query(`
      ALTER TABLE bed_assignments 
      ALTER COLUMN room_id_old DROP NOT NULL;
    `);
    console.log('✅ room_id_old is now nullable');

    // Step 3: Make room_id NOT NULL
    console.log('\nStep 3: Making room_id NOT NULL...');
    await sequelize.query(`
      ALTER TABLE bed_assignments 
      ALTER COLUMN room_id SET NOT NULL;
    `);
    console.log('✅ room_id is now NOT NULL');

    // Step 4: Drop room_id_old column
    console.log('\nStep 4: Dropping room_id_old column...');
    await sequelize.query(`
      ALTER TABLE bed_assignments 
      DROP COLUMN IF EXISTS room_id_old;
    `);
    console.log('✅ room_id_old column dropped');

    console.log('\n🎉 Successfully fixed bed_assignments table!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixBedAssignmentsRoomId();
