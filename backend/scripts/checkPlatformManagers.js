const { User } = require('../models');
const { Op } = require('sequelize');

async function checkPlatformManagers() {
  try {
    console.log('🔍 Checking for platform managers with role conflicts...');
    
    // Find users who might be platform managers but have conflicting roles
    const conflictedUsers = await User.findAll({
      where: {
        [Op.or]: [
          // Users with admin role and agent internal role (like sekhar was)
          {
            role: 'admin',
            internalRole: 'agent'
          },
          // Users with admin role and any internal role
          {
            role: 'admin',
            internalRole: {
              [Op.ne]: null
            }
          },
          // Users with owner role and any internal role
          {
            role: 'owner',
            internalRole: {
              [Op.ne]: null
            }
          }
        ]
      },
      attributes: ['id', 'name', 'email', 'role', 'staffRole', 'internalRole', 'internalPermissions']
    });
    
    if (conflictedUsers.length === 0) {
      console.log('✅ No users with role conflicts found');
    } else {
      console.log(`\n⚠️  Found ${conflictedUsers.length} users with potential role conflicts:`);
      
      conflictedUsers.forEach(user => {
        console.log(`\n👤 ${user.name} (${user.email}):`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Staff Role: ${user.staffRole || 'null'}`);
        console.log(`   Internal Role: ${user.internalRole || 'null'}`);
        
        // Check if they have superuser-like permissions
        if (user.internalPermissions) {
          const permissions = user.internalPermissions;
          const superuserPermissions = [
            'canManageRoles',
            'canManageAPIKeys', 
            'canConfigurePlatform',
            'canAccessAllProperties',
            'canManageInternalUsers'
          ];
          
          const hasSuperuserPerms = superuserPermissions.some(perm => permissions[perm]);
          if (hasSuperuserPerms) {
            console.log(`   🔑 Has superuser-like permissions`);
          }
        }
        
        // Suggest fix
        if (user.role === 'admin' && user.internalRole) {
          console.log(`   💡 Suggested fix: Change role to 'user', keep internalRole as '${user.internalRole}'`);
        }
      });
      
      console.log('\n📝 To fix these conflicts, you can:');
      console.log('1. For platform staff: Change role to "user" and keep internalRole');
      console.log('2. For property owners: Remove internalRole and keep property role');
    }
    
    // Also check for users who should be platform managers
    console.log('\n🔍 Checking for users who might need platform manager roles...');
    
    const potentialManagers = await User.findAll({
      where: {
        [Op.or]: [
          // Users with extensive internal permissions but low internal role
          {
            internalRole: 'agent',
            internalPermissions: {
              [Op.and]: [
                { canAccessAllProperties: true },
                { canManageInternalUsers: true }
              ]
            }
          }
        ]
      },
      attributes: ['id', 'name', 'email', 'role', 'staffRole', 'internalRole', 'internalPermissions']
    });
    
    if (potentialManagers.length === 0) {
      console.log('✅ No users found who might need role upgrades');
    } else {
      console.log(`\n📈 Found ${potentialManagers.length} users who might need role upgrades:`);
      
      potentialManagers.forEach(user => {
        console.log(`\n👤 ${user.name} (${user.email}):`);
        console.log(`   Current Internal Role: ${user.internalRole}`);
        console.log(`   Has extensive permissions - consider upgrading to 'platform_admin' or 'operations_manager'`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking platform managers:', error);
  }
}

// Run the check
checkPlatformManagers()
  .then(() => {
    console.log('\n✅ Platform manager check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });