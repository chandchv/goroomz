/**
 * Check User Role Script
 * 
 * Usage:
 *   node scripts/checkUserRole.js <email>
 * 
 * Example:
 *   node scripts/checkUserRole.js user@example.com
 */

const { User, sequelize } = require('../models');

async function checkUserRole(email) {
  try {
    // Validate arguments
    if (!email) {
      console.error('❌ Usage: node scripts/checkUserRole.js <email>');
      console.error('   Example: node scripts/checkUserRole.js user@example.com');
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
    
    console.log('User Information:');
    console.log('================');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role || 'None'}`);
    console.log(`Staff Role: ${user.staffRole || 'None'}`);
    console.log(`Internal Role: ${user.internalRole || 'None'}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Is Verified: ${user.isVerified}`);
    
    // Check superuser access
    const hasSuperuserAccess = user.role === 'admin' || user.internalRole === 'superuser';
    console.log('\nSuperuser Access:');
    console.log('==================');
    if (hasSuperuserAccess) {
      console.log('✅ User HAS superuser access');
      if (user.role === 'admin') {
        console.log('   Reason: role === "admin"');
      }
      if (user.internalRole === 'superuser') {
        console.log('   Reason: internalRole === "superuser"');
      }
    } else {
      console.log('❌ User DOES NOT have superuser access');
      console.log('\nTo grant superuser access, run:');
      console.log(`   node scripts/setSuperuserRole.js ${user.email}`);
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
checkUserRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


