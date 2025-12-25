/**
 * Check Superuser Role Script
 * 
 * Usage:
 *   node scripts/checkSuperuserRole.js <email>
 * 
 * Example:
 *   node scripts/checkSuperuserRole.js sekhar.iw@gmail.com
 */

const { User, sequelize } = require('../models');

async function checkSuperuserRole(email) {
  try {
    // Validate arguments
    if (!email) {
      console.error('❌ Usage: node scripts/checkSuperuserRole.js <email>');
      console.error('   Example: node scripts/checkSuperuserRole.js sekhar.iw@gmail.com');
      process.exit(1);
    }
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log('='.repeat(60));
    console.log('USER INFORMATION');
    console.log('='.repeat(60));
    console.log(`Name:           ${user.name}`);
    console.log(`Email:          ${user.email}`);
    console.log(`ID:             ${user.id}`);
    console.log('\n' + '='.repeat(60));
    console.log('ROLES');
    console.log('='.repeat(60));
    console.log(`Role:           ${user.role || 'None'}`);
    console.log(`Staff Role:     ${user.staffRole || 'None'}`);
    console.log(`Internal Role:  ${user.internalRole || 'None'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('PERMISSIONS');
    console.log('='.repeat(60));
    
    if (user.permissions) {
      console.log('\nStaff Permissions:');
      Object.entries(user.permissions).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('\nStaff Permissions: None');
    }
    
    if (user.internalPermissions) {
      console.log('\nInternal Permissions:');
      Object.entries(user.internalPermissions).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('\nInternal Permissions: None');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('INTERNAL ROLE FIELDS');
    console.log('='.repeat(60));
    console.log(`Territory ID:    ${user.territoryId || 'None'}`);
    console.log(`Manager ID:      ${user.managerId || 'None'}`);
    console.log(`Commission Rate: ${user.commissionRate || 'None'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('STATUS');
    console.log('='.repeat(60));
    
    if (user.internalRole === 'superuser') {
      console.log('✅ User IS a Superuser');
      console.log('✅ Should have access to Superuser Dashboard');
    } else if (user.internalRole) {
      console.log(`⚠️  User has internal role: ${user.internalRole}`);
      console.log('⚠️  But is NOT a Superuser');
    } else {
      console.log('❌ User does NOT have an internal role');
      console.log('❌ Run: node scripts/setSuperuserRole.js ' + email);
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error checking user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get command line arguments
const [,, email] = process.argv;

// Run the script
checkSuperuserRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
