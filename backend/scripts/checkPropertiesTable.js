const { sequelize, Property, Room } = require('../models');

async function checkPropertiesTable() {
  try {
    console.log('Checking properties table...\n');
    
    // Check properties table
    const propertiesCount = await Property.count();
    console.log(`Properties table count: ${propertiesCount}`);
    
    if (propertiesCount > 0) {
      const sampleProperties = await Property.findAll({ limit: 3 });
      console.log('\nSample properties:');
      sampleProperties.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`);
      });
    }
    
    // Check rooms table for items without property_id (these are properties)
    const roomsAsProperties = await Room.count({
      where: {
        propertyId: null
      }
    });
    console.log(`\nRooms table - entries without property_id (old properties): ${roomsAsProperties}`);
    
    // Check rooms table for items WITH property_id (these are actual rooms)
    const actualRooms = await Room.count({
      where: {
        propertyId: { [sequelize.Sequelize.Op.ne]: null }
      }
    });
    console.log(`Rooms table - entries with property_id (actual rooms): ${actualRooms}`);
    
    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPropertiesTable();
