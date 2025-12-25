const { sequelize } = require('../config/database');

async function dropDuplicateIndex() {
  try {
    console.log('Checking for duplicate index...');
    
    // Drop the index if it exists
    await sequelize.query(`
      DROP INDEX IF EXISTS unique_room_number_per_property;
    `);
    
    console.log('✅ Index dropped successfully (if it existed)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping index:', error);
    process.exit(1);
  }
}

dropDuplicateIndex();
