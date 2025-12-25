const { sequelize } = require('../config/database');
const User = require('../models/User');
const Property = require('../models/Property');
const Room = require('../models/Room');

async function checkUserPropertyAccess() {
  try {
    console.log('🔍 Checking User Property Access...');
    
    // Find the user
    const user = await User.findOne({
      where: { email: 'amit.patel@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Internal Role: ${user.internalRole}`);
    console.log(`   Assigned Property ID: ${user.assignedPropertyId}`);
    
    // Find properties owned by this user
    const ownedProperties = await Property.findAll({
      where: { ownerId: user.id },
      attributes: ['id', 'name', 'ownerId']
    });
    
    console.log(`\n📋 Properties owned by user: ${ownedProperties.length}`);
    ownedProperties.forEach(prop => {
      console.log(`   - ${prop.name} (ID: ${prop.id})`);
    });
    
    // Find the specific room and its property
    const room = await Room.findOne({
      where: { roomNumber: '301' },
      attributes: ['id', 'roomNumber', 'propertyId']
    });
    
    if (room) {
      console.log(`\n📋 Room 301 Details:`);
      console.log(`   Room ID: ${room.id}`);
      console.log(`   Property ID: ${room.propertyId}`);
      
      const property = await Property.findByPk(room.propertyId);
      if (property) {
        console.log(`   Property Name: ${property.name}`);
        console.log(`   Property Owner ID: ${property.ownerId}`);
        console.log(`   Is user the owner? ${property.ownerId === user.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking user property access:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkUserPropertyAccess();