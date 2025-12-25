const { User } = require('../models');

async function fixSuperuserPermissions() {
  try {
    console.log('🔧 Fixing Superuser Permissions...\n');

    // Get the correct superuser permissions structure
    const correctSuperuserPermissions = {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    };

    // Find all superusers
    const superusers = await User.findAll({
      where: { internalRole: 'superuser' },
      attributes: ['id', 'name', 'email', 'internalPermissions']
    });

    console.log(`Found ${superusers.length} superuser(s):`);

    for (const user of superusers) {
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log('   Current permissions:', JSON.stringify(user.internalPermissions, null, 2));
      
      // Update permissions
      user.internalPermissions = correctSuperuserPermissions;
      await user.save({ fields: ['internalPermissions'] });
      
      console.log('   ✅ Updated to correct superuser permissions');
    }

    console.log('\n🎉 Superuser permissions fixed!');
    console.log('\nCorrect superuser permissions structure:');
    console.log(JSON.stringify(correctSuperuserPermissions, null, 2));

  } catch (error) {
    console.error('❌ Error fixing superuser permissions:', error);
  }
}

fixSuperuserPermissions();