const { sequelize } = require('../config/database');
const Sequelize = require('sequelize');

async function runMigration() {
  try {
    console.log('🚀 Running essential room fields migration...\n');

    // Load the migration file
    const migration = require('../migrations/20251127100000-add-essential-room-fields.js');
    const queryInterface = sequelize.getQueryInterface();

    // Run the up migration
    await migration.up(queryInterface, Sequelize);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nThe following fields have been added to the rooms table:');
    console.log('  - title (room display name)');
    console.log('  - description (room description)');
    console.log('  - price (room price)');
    console.log('  - max_guests (maximum guests)');
    console.log('  - category (room category)');
    console.log('  - room_type (type of room)');
    console.log('  - pricing_type (daily/monthly)');
    console.log('  - location (JSONB)');
    console.log('  - amenities (array)');
    console.log('  - rules (array)');
    console.log('  - images (JSONB)');
    console.log('  - approval_status (pending/approved/rejected)');
    console.log('  - approved_at (timestamp)');
    console.log('  - approved_by (user reference)');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
