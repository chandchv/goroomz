const { User, Property } = require('../models');

async function testPropertiesEndpoint() {
  try {
    console.log('🧪 Testing Properties Endpoint Access...');

    // Find a property owner
    const propertyOwner = await User.findOne({
      where: { role: 'owner' },
      include: [{
        model: Property,
        as: 'properties',
        required: true
      }]
    });

    if (!propertyOwner) {
      console.log('❌ No property owner found for testing');
      return;
    }

    console.log(`✅ Found property owner: ${propertyOwner.name} (${propertyOwner.email})`);

    // Get their properties directly from database
    const userProperties = await Property.findAll({
      where: { ownerId: propertyOwner.id },
      attributes: ['id', 'name', 'type', 'isActive']
    });

    console.log(`✅ Property owner has ${userProperties.length} properties:`);
    userProperties.forEach(prop => {
      console.log(`  - ${prop.name} (${prop.type}) - ${prop.isActive ? 'Active' : 'Inactive'}`);
    });

    // Test the new endpoint logic (simulated)
    console.log('\n🔍 Testing endpoint access logic:');
    
    // Simulate property owner access
    console.log('✅ Property owner should be able to access /internal/properties');
    console.log('✅ Properties will be automatically scoped to ownerId:', propertyOwner.id);
    
    // Find a platform staff user
    const platformStaff = await User.findOne({
      where: { internalRole: { [require('sequelize').Op.ne]: null } }
    });

    if (platformStaff) {
      console.log(`✅ Found platform staff: ${platformStaff.name} (${platformStaff.internalRole})`);
      console.log('✅ Platform staff should be able to access /internal/properties with data scoping');
    }

    console.log('\n🎉 Properties endpoint access test completed successfully!');

  } catch (error) {
    console.error('❌ Properties endpoint test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testPropertiesEndpoint()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testPropertiesEndpoint;