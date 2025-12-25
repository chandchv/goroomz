const { sequelize } = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runMigrations() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   DATABASE RESTRUCTURE MIGRATION TOOL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('This tool will migrate your database to the new structure:');
  console.log('  • Create properties table');
  console.log('  • Create rooms_new table');
  console.log('  • Create property_staff table');
  console.log('  • Migrate data from old rooms table');
  console.log('  • Update foreign keys');
  console.log('');
  console.log('⚠️  WARNING: This is a major database change!');
  console.log('');
  console.log('Before proceeding, ensure you have:');
  console.log('  ✓ Backed up your database');
  console.log('  ✓ Tested on a development/staging environment');
  console.log('  ✓ Reviewed the migration files');
  console.log('');

  const proceed = await question('Do you want to proceed? (yes/no): ');
  
  if (proceed.toLowerCase() !== 'yes') {
    console.log('');
    console.log('❌ Migration cancelled');
    rl.close();
    process.exit(0);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   PHASE 1: CREATE NEW TABLES');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    console.log('');

    // Run migrations
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Migration 1: Create properties table
    console.log('Running migration: 20251127000001-create-properties-table.js');
    await execPromise('npx sequelize-cli db:migrate --name 20251127000001-create-properties-table.js', {
      cwd: __dirname + '/..'
    });
    console.log('');

    // Migration 2: Create rooms_new table
    console.log('Running migration: 20251127000002-create-rooms-new-table.js');
    await execPromise('npx sequelize-cli db:migrate --name 20251127000002-create-rooms-new-table.js', {
      cwd: __dirname + '/..'
    });
    console.log('');

    // Migration 3: Create property_staff table
    console.log('Running migration: 20251127000003-create-property-staff-table.js');
    await execPromise('npx sequelize-cli db:migrate --name 20251127000003-create-property-staff-table.js', {
      cwd: __dirname + '/..'
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   PHASE 2: MIGRATE DATA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const proceedData = await question('Proceed with data migration? (yes/no): ');
    
    if (proceedData.toLowerCase() !== 'yes') {
      console.log('');
      console.log('⚠️  Data migration skipped');
      console.log('   New tables created but no data migrated');
      rl.close();
      process.exit(0);
    }

    console.log('');
    console.log('Running migration: 20251127000004-migrate-data-to-new-structure.js');
    await execPromise('npx sequelize-cli db:migrate --name 20251127000004-migrate-data-to-new-structure.js', {
      cwd: __dirname + '/..'
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   PHASE 3: VERIFY DATA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Verify data counts
    const [oldRoomCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM rooms WHERE property_id IS NULL'
    );
    const [propertyCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM properties'
    );
    const [oldRoomRoomCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM rooms WHERE property_id IS NOT NULL'
    );
    const [newRoomCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM rooms_new'
    );

    console.log('Data verification:');
    console.log(`  Old properties (rooms.property_id IS NULL): ${oldRoomCount[0].count}`);
    console.log(`  New properties: ${propertyCount[0].count}`);
    console.log(`  Old rooms (rooms.property_id IS NOT NULL): ${oldRoomRoomCount[0].count}`);
    console.log(`  New rooms: ${newRoomCount[0].count}`);
    console.log('');

    if (oldRoomCount[0].count !== propertyCount[0].count) {
      console.log('⚠️  WARNING: Property counts do not match!');
      console.log('   Please review the migration before proceeding.');
      console.log('');
    }

    if (oldRoomRoomCount[0].count !== newRoomCount[0].count) {
      console.log('⚠️  WARNING: Room counts do not match!');
      console.log('   Please review the migration before proceeding.');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   PHASE 4: FINALIZE SWITCH (OPTIONAL)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  This will:');
    console.log('   • Rename rooms → rooms_old (backup)');
    console.log('   • Rename rooms_new → rooms (active)');
    console.log('   • Update all foreign keys');
    console.log('');
    console.log('After this step, your application MUST use the new structure!');
    console.log('');

    const proceedSwitch = await question('Finalize the switch now? (yes/no): ');
    
    if (proceedSwitch.toLowerCase() !== 'yes') {
      console.log('');
      console.log('✅ Migration completed (switch not finalized)');
      console.log('');
      console.log('📝 Current state:');
      console.log('   • properties table: ✅ Created with data');
      console.log('   • rooms_new table: ✅ Created with data');
      console.log('   • property_staff table: ✅ Created (empty)');
      console.log('   • rooms table: Still active (old structure)');
      console.log('');
      console.log('To finalize later, run:');
      console.log('   npx sequelize-cli db:migrate --name 20251127000005-finalize-structure-switch.js');
      console.log('');
      rl.close();
      process.exit(0);
    }

    console.log('');
    console.log('Running migration: 20251127000005-finalize-structure-switch.js');
    await execPromise('npx sequelize-cli db:migrate --name 20251127000005-finalize-structure-switch.js', {
      cwd: __dirname + '/..'
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 Summary:');
    console.log('   • Properties migrated: ' + propertyCount[0].count);
    console.log('   • Rooms migrated: ' + newRoomCount[0].count);
    console.log('   • Old rooms table backed up as: rooms_old');
    console.log('');
    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Update your application code to use new models');
    console.log('   2. Update API endpoints to use new structure');
    console.log('   3. Test thoroughly in development/staging');
    console.log('   4. Deploy updated application code');
    console.log('   5. Keep rooms_old for 30 days as backup');
    console.log('   6. After verification, drop rooms_old:');
    console.log('      DROP TABLE rooms_old;');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('To rollback, run:');
    console.error('   npx sequelize-cli db:migrate:undo');
    console.error('');
    process.exit(1);
  }

  rl.close();
  process.exit(0);
}

// Run the migration
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
