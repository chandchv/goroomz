const { User, Property, Room } = require('../models');
const { sequelize } = require('../config/database');

async function testDashboardAlerts() {
  try {
    console.log('🧪 Testing Dashboard Alerts Query...');

    // Find a property owner
    const propertyOwner = await User.findOne({
      where: { role: 'owner' },
      include: [{
        model: Property,
        as: 'ownedProperties',
        required: true
      }]
    });

    if (!propertyOwner) {
      console.log('❌ No property owner found for testing');
      return;
    }

    console.log(`✅ Found property owner: ${propertyOwner.name} (${propertyOwner.email})`);

    // Get their properties
    const userProperties = await Property.findAll({
      where: { ownerId: propertyOwner.id },
      attributes: ['id', 'name']
    });

    console.log(`✅ Found ${userProperties.length} properties for owner`);

    if (userProperties.length === 0) {
      console.log('❌ No properties found for owner');
      return;
    }

    const propertyIds = userProperties.map(p => p.id);

    // Test the room query that was failing
    const dirtyRooms = await Room.findAll({
      where: {
        propertyId: { [sequelize.Sequelize.Op.in]: propertyIds },
        isActive: true,
        currentStatus: 'vacant_dirty'
      },
      attributes: ['id'],
      order: [['created_at', 'ASC']], // This was the failing query
      limit: 10
    });

    console.log(`✅ Successfully queried dirty rooms: ${dirtyRooms.length} found`);

    // Test room count query
    const totalRooms = await Room.count({
      where: {
        propertyId: { [sequelize.Sequelize.Op.in]: propertyIds },
        isActive: true
      }
    });

    console.log(`✅ Total active rooms for owner: ${totalRooms}`);

    console.log('🎉 All dashboard alert queries working correctly!');

  } catch (error) {
    console.error('❌ Dashboard alerts test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testDashboardAlerts()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testDashboardAlerts;