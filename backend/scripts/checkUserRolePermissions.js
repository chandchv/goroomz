const { User } = require('../models');

async function checkUserRolePermissions() {
  try {
    console.log('🔍 Checking User Role Permissions...\n');

    // Check the specific user from the error log
    const userId = '29517897-bcaf-4083-9ed3-15326427f898';
    
    const user = await User.findByPk(userId, {
      attributes: [
        'id',
        'name', 
        'email',
        'role',
        'internalRole',
        'internalPermissions',
        'isActive'
      ]
    });

    if (!user) {
      console.log('❌ User not found with ID:', userId);
      return;
    }

    console.log('👤 User Details:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Internal Role:', user.internalRole);
    console.log('   Is Active:', user.isActive);
    console.log('   Internal Permissions:', JSON.stringify(user.internalPermissions, null, 2));

    console.log('\n🔐 Role Management Permissions:');
    console.log('   Required for role updates: superuser');
    console.log('   Current user role:', user.internalRole);
    console.log('   Can update roles:', user.internalRole === 'superuser' ? '✅ YES' : '❌ NO');

    if (user.internalRole !== 'superuser') {
      console.log('\n💡 Solution:');
      console.log('   The user needs to be a superuser to update roles.');
      console.log('   Current role permissions:');
      console.log('   - platform_admin: Can view roles but cannot update them');
      console.log('   - superuser: Can create, update, and delete roles');
    }

    // Check if there are any superusers in the system
    console.log('\n👑 Superusers in the system:');
    const superusers = await User.findAll({
      where: { internalRole: 'superuser' },
      attributes: ['id', 'name', 'email', 'isActive']
    });

    if (superusers.length === 0) {
      console.log('   ❌ No superusers found in the system!');
      console.log('   💡 You need to promote a user to superuser role first.');
    } else {
      superusers.forEach(su => {
        console.log(`   ${su.isActive ? '✅' : '❌'} ${su.name} (${su.email}) - ${su.isActive ? 'Active' : 'Inactive'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking user permissions:', error);
  }
}

checkUserRolePermissions();