const { User } = require('../models');

async function fixSuperuserRole() {
  try {
    console.log('🔧 Fixing superuser role for sekhar.iw@gmail.com...');
    
    // Find the user
    const user = await User.findOne({
      where: { email: 'sekhar.iw@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User sekhar.iw@gmail.com not found');
      return;
    }
    
    console.log('\n📋 Current user details:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Staff Role:', user.staffRole);
    console.log('  Internal Role:', user.internalRole);
    
    // Update the user to be a pure platform superuser
    // Set role to 'user' (default for platform staff) and set correct internal role
    await user.update({
      role: 'user', // Set to default user role (platform staff don't need property owner roles)
      staffRole: null, // Remove staff role as it's not needed for platform staff
      internalRole: 'superuser' // Set correct platform role
    });
    
    console.log('\n✅ Updated user role:');
    console.log('  Role: admin → user (changed to default user role for platform staff)');
    console.log('  Staff Role: manager → null (removed as not needed for platform staff)');
    console.log('  Internal Role: agent → superuser');
    
    // Verify the update
    const updatedUser = await User.findOne({
      where: { email: 'sekhar.iw@gmail.com' },
      attributes: ['name', 'email', 'role', 'staffRole', 'internalRole']
    });
    
    console.log('\n🔍 Verification - Updated user details:');
    console.log('  Name:', updatedUser.name);
    console.log('  Email:', updatedUser.email);
    console.log('  Role:', updatedUser.role);
    console.log('  Staff Role:', updatedUser.staffRole);
    console.log('  Internal Role:', updatedUser.internalRole);
    
    // Also check if there are other users that might need similar fixes
    console.log('\n🔍 Checking for other potential platform managers...');
    
    const potentialManagers = await User.findAll({
      where: {
        role: 'admin',
        internalRole: 'agent' // These might need to be upgraded
      },
      attributes: ['name', 'email', 'role', 'staffRole', 'internalRole']
    });
    
    if (potentialManagers.length > 1) { // More than just sekhar
      console.log('\n⚠️  Other admin users with agent role found:');
      potentialManagers.forEach(user => {
        if (user.email !== 'sekhar.iw@gmail.com') {
          console.log(`  - ${user.name} (${user.email}): role=${user.role}, internalRole=${user.internalRole}`);
        }
      });
      console.log('\n💡 Consider reviewing these users to determine if they should be platform_admin or operations_manager instead of agent');
    }
    
  } catch (error) {
    console.error('❌ Error fixing superuser role:', error);
    throw error;
  }
}

// Run the fix
fixSuperuserRole()
  .then(() => {
    console.log('\n✅ Superuser role fix completed successfully');
    console.log('🔄 Please restart the frontend to see the changes take effect');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });