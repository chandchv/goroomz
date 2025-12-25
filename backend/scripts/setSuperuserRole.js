/**
 * Set Superuser Internal Role Script
 * 
 * Usage:
 *   node scripts/setSuperuserRole.js <email>
 * 
 * Example:
 *   node scripts/setSuperuserRole.js sekhar.iw@gmail.com
 */

const { User, sequelize } = require('../models');

async function setSuperuserRole(email) {
  try {
    // Validate arguments
    if (!email) {
      console.error('❌ Usage: node scripts/setSuperuserRole.js <email>');
      console.error('   Example: node scripts/setSuperuserRole.js sekhar.iw@gmail.com');
      process.exit(1);
    }
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(`\nFound user: ${user.name} (${user.email})`);
    console.log(`Current Role: ${user.role}`);
    console.log(`Current Staff Role: ${user.staffRole || 'None'}`);
    console.log(`Current Internal Role: ${user.internalRole || 'None'}`);
    
    // Update to superuser with full permissions
    await user.sequelize.query(
      `UPDATE users SET 
        internal_role = 'superuser',
        internal_permissions = $1,
        updated_at = NOW() 
      WHERE id = $2`,
      {
        bind: [
          JSON.stringify({
            canManageInternalUsers: true,
            canManageRoles: true,
            canViewAuditLogs: true,
            canManageSubscriptions: true,
            canConfigurePlatform: true,
            canAccessAllProperties: true,
            canManageCommissions: true,
            canManageTerritories: true,
            canManageTickets: true,
            canBroadcastAnnouncements: true,
            canViewAnalytics: true,
            canManageAPIKeys: true
          }),
          user.id
        ],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('\n✅ User updated to Superuser successfully!');
    console.log('\nNew Settings:');
    console.log('  Internal Role: superuser');
    console.log('  Permissions: Full platform access');
    console.log('\nPlease log out and log back in to see the Superuser Dashboard.\n');
    
  } catch (error) {
    console.error('\n❌ Error updating user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get command line arguments
const [,, email] = process.argv;

// Run the script
setSuperuserRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
