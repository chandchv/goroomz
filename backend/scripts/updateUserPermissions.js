/**
 * Update User Permissions Script
 * 
 * Usage:
 *   node scripts/updateUserPermissions.js <email>
 * 
 * Example:
 *   node scripts/updateUserPermissions.js chandchvgsr@gmail.com
 * 
 * This script updates a user to have full admin permissions.
 */

const { User, sequelize } = require('../models');

async function updateUserPermissions(email) {
  try {
    if (!email) {
      console.error('❌ Usage: node scripts/updateUserPermissions.js <email>');
      console.error('   Example: node scripts/updateUserPermissions.js admin@goroomz.com');
      process.exit(1);
    }
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      console.error(`❌ No user found with email: ${email}\n`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})\n`);
    
    // Update to admin with full permissions
    await user.update({
      role: 'admin',
      staffRole: 'manager',
      permissions: {
        canCheckIn: true,
        canCheckOut: true,
        canManageRooms: true,
        canRecordPayments: true,
        canViewReports: true,
        canManageStaff: true,
        canUpdateRoomStatus: true,
        canManageMaintenance: true
      }
    });
    
    console.log('✅ User updated successfully!\n');
    console.log('Updated Details:');
    console.log(`  Role:       ${user.role}`);
    console.log(`  Staff Role: ${user.staffRole}`);
    console.log('\nPermissions:');
    Object.entries(user.permissions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n✅ User now has full admin access to the internal management system.\n');
    
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
updateUserPermissions(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
