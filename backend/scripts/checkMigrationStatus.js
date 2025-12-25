const { sequelize } = require('../config/database');

async function checkMigrationStatus() {
  try {
    console.log('Checking migration status...\n');
    
    // Check if properties table exists and has data
    const [propertiesResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM properties;
    `);
    console.log(`Properties table count: ${propertiesResult[0].count}`);
    
    // Check rooms table for properties (property_id IS NULL)
    const [roomsAsPropertiesResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM rooms WHERE property_id IS NULL;
    `);
    console.log(`Rooms table (property_id IS NULL): ${roomsAsPropertiesResult[0].count}`);
    
    // Check rooms table for actual rooms (property_id IS NOT NULL)
    const [actualRoomsResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM rooms WHERE property_id IS NOT NULL;
    `);
    console.log(`Rooms table (property_id IS NOT NULL): ${actualRoomsResult[0].count}`);
    
    if (propertiesResult[0].count === '0' && roomsAsPropertiesResult[0].count > '0') {
      console.log('\n⚠️  Migration needed: Data is still in rooms table, not migrated to properties table');
      console.log('Run: node backend/scripts/runDatabaseRestructure.js');
    } else if (propertiesResult[0].count > '0') {
      console.log('\n✅ Migration complete: Properties table is populated');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMigrationStatus();
