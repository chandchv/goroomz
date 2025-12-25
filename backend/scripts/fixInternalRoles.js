const { sequelize, User, InternalRole } = require('../models');

async function fixInternalRoles() {
  try {
    console.log('🔧 Starting internal roles fix...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get all users with internal roles
    const usersWithRoles = await User.findAll({
      where: {
        internalRole: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'email', 'internalRole']
    });
    
    console.log(`📋 Found ${usersWithRoles.length} users with internal roles`);
    
    // Get all existing internal roles
    const existingRoles = await InternalRole.findAll({
      attributes: ['name']
    });
    
    const validRoleNames = existingRoles.map(role => role.name);
    console.log('✅ Valid role names:', validRoleNames);
    
    // Find users with invalid roles
    const usersWithInvalidRoles = usersWithRoles.filter(user => 
      user.internalRole && !validRoleNames.includes(user.internalRole)
    );
    
    console.log(`⚠️ Found ${usersWithInvalidRoles.length} users with invalid roles:`);
    usersWithInvalidRoles.forEach(user => {
      console.log(`  - ${user.email}: ${user.internalRole}`);
    });
    
    if (usersWithInvalidRoles.length > 0) {
      console.log('🔧 Fixing invalid roles...');
      
      // Map invalid roles to valid ones (using only allowed values)
      const roleMapping = {
        'admin': 'platform_admin',
        'manager': 'operations_manager',
        'staff': 'agent',
        'property_manager': 'operations_manager',
        'receptionist': 'agent'
        // Don't map roles that are already valid
      };
      
      for (const user of usersWithInvalidRoles) {
        // Only update if the role is actually invalid
        if (!validRoleNames.includes(user.internalRole)) {
          const newRole = roleMapping[user.internalRole] || 'agent';
          
          await User.update(
            { internalRole: newRole },
            { where: { id: user.id } }
          );
          
          console.log(`✅ Updated ${user.email}: ${user.internalRole} → ${newRole}`);
        } else {
          console.log(`ℹ️ Skipped ${user.email}: ${user.internalRole} (already valid)`);
        }
      }
    }
    
    console.log('✅ Internal roles fix completed');
    
  } catch (error) {
    console.error('❌ Error fixing internal roles:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the fix
if (require.main === module) {
  fixInternalRoles()
    .then(() => {
      console.log('🎉 Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixInternalRoles;