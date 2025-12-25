const { User } = require('../models');

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles...');
    
    // Check the specific user
    const sekharUser = await User.findOne({
      where: { email: 'sekhar.iw@gmail.com' },
      attributes: ['id', 'name', 'email', 'role', 'staffRole', 'internalRole', 'internalPermissions']
    });
    
    if (sekharUser) {
      console.log('\n👤 Sekhar User Details:');
      console.log('  ID:', sekharUser.id);
      console.log('  Name:', sekharUser.name);
      console.log('  Email:', sekharUser.email);
      console.log('  Role:', sekharUser.role);
      console.log('  Staff Role:', sekharUser.staffRole);
      console.log('  Internal Role:', sekharUser.internalRole);
      console.log('  Internal Permissions:', JSON.stringify(sekharUser.internalPermissions, null, 2));
    } else {
      console.log('❌ User sekhar.iw@gmail.com not found');
    }
    
    // Check all users with internal roles
    console.log('\n🏢 All users with internal roles:');
    const internalUsers = await User.findAll({
      where: {
        internalRole: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'name', 'email', 'role', 'staffRole', 'internalRole'],
      order: [['internalRole', 'ASC'], ['name', 'ASC']]
    });
    
    if (internalUsers.length === 0) {
      console.log('  No users with internal roles found');
    } else {
      internalUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}): ${user.internalRole}`);
      });
    }
    
    // Check all users with platform manager-like roles
    console.log('\n👥 All users with admin/owner roles:');
    const adminUsers = await User.findAll({
      where: {
        role: ['admin', 'owner', 'category_owner']
      },
      attributes: ['id', 'name', 'email', 'role', 'staffRole', 'internalRole'],
      order: [['role', 'ASC'], ['name', 'ASC']]
    });
    
    if (adminUsers.length === 0) {
      console.log('  No admin/owner users found');
    } else {
      adminUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}): role=${user.role}, internalRole=${user.internalRole || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  }
}

// Run the check
checkUserRoles()
  .then(() => {
    console.log('\n✅ User role check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });