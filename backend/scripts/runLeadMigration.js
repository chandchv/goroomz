require('dotenv').config();
const { sequelize } = require('../config/database');
const migration = require('../migrations/add-lead-fields');

async function runMigration() {
  try {
    console.log('🔄 Running Lead fields migration...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
