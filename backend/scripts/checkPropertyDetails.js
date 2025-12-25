const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const Room = require('../models/Room');

async function checkPropertyDetails() {
  try {
    console.log('🔍 Checking Property Details...');
    
    // Find the specific property that the room belongs to
    const room = await Room.findOne({
      where: { roomNumber: '301' },
      attributes: ['id', 'roomNumber', 'propertyId']
    });
    
    if (!room) {
      console.log('❌ Room 301 not found');
      return;
    }
    
    console.log(`✅ Found room: ${room.roomNumber} (ID: ${room.id})`);
    console.log(`   Property ID: ${room.propertyId}`);
    
    // Find the property
    const property = await Property.findByPk(room.propertyId);
    
    if (!property) {
      console.log('❌ Property not found');
      return;
    }
    
    console.log(`\n📋 Property Details:`);
    console.log(`   ID: ${property.id}`);
    console.log(`   Name: ${property.name}`);
    console.log(`   Owner ID: ${property.ownerId}`);
    console.log(`   Owner ID type: ${typeof property.ownerId}`);
    console.log(`   Owner ID is null: ${property.ownerId === null}`);
    console.log(`   Owner ID is undefined: ${property.ownerId === undefined}`);
    console.log(`   Owner ID is empty string: ${property.ownerId === ''}`);
    
    // Check raw data
    const rawProperty = await sequelize.query(
      'SELECT id, name, owner_id FROM properties WHERE id = :propertyId',
      {
        replacements: { propertyId: room.propertyId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log(`\n📋 Raw Database Data:`);
    console.log(JSON.stringify(rawProperty[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error checking property details:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkPropertyDetails();