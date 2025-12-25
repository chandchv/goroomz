const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const User = require('../models/User');

async function fixPropertyOwnerIds() {
  try {
    console.log('🔧 Fixing Property Owner IDs...');
    
    // Find the user amit.patel@example.com
    const owner = await User.findOne({
      where: { email: 'amit.patel@example.com' }
    });
    
    if (!owner) {
      console.log('❌ Owner user not found');
      return;
    }
    
    console.log(`✅ Found owner: ${owner.email} (ID: ${owner.id})`);
    
    // Find properties without owner IDs
    const propertiesWithoutOwner = await Property.findAll({
      where: {
        ownerId: null
      }
    });
    
    console.log(`📋 Found ${propertiesWithoutOwner.length} properties without owner IDs`);
    
    if (propertiesWithoutOwner.length > 0) {
      // Update all properties to have the correct owner ID
      const updateResult = await Property.update(
        { ownerId: owner.id },
        { 
          where: { ownerId: null },
          returning: true
        }
      );
      
      console.log(`✅ Updated ${updateResult[0]} properties with owner ID: ${owner.id}`);
      
      // Verify the update
      const updatedProperties = await Property.findAll({
        where: { ownerId: owner.id },
        attributes: ['id', 'name', 'ownerId']
      });
      
      console.log('\n📋 Updated Properties:');
      updatedProperties.forEach(prop => {
        console.log(`   - ${prop.name} (ID: ${prop.id}) -> Owner: ${prop.ownerId}`);
      });
    }
    
    console.log('\n🎉 Property owner IDs fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing property owner IDs:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixPropertyOwnerIds();