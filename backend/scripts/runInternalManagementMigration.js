const { sequelize } = require('../models');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running internal management fields migration...\n');
    
    // Import the migration
    const migration = require('../migrations/20251126000001-add-internal-management-fields-to-rooms.js');
    
    // Run the up migration
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('\n✅ Migration completed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
