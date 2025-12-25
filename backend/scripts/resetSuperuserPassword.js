/**
 * Reset Superuser Password Script
 * 
 * Usage:
 *   node scripts/resetSuperuserPassword.js <email> <new-password>
 * 
 * Example:
 *   node scripts/resetSuperuserPassword.js sekhar.iw@gmail.com NewPassword123!
 */

const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function resetPassword(email, newPassword) {
  try {
    // Validate arguments
    if (!email || !newPassword) {
      console.error('❌ Usage: node scripts/resetSuperuserPassword.js <email> <new-password>');
      console.error('   Example: node scripts/resetSuperuserPassword.js sekhar.iw@gmail.com NewPassword123!');
      process.exit(1);
    }
    
    // Validate password length
    if (newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
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
    console.log(`Role: ${user.role}`);
    console.log(`Staff Role: ${user.staffRole || 'None'}`);
    console.log(`Internal Role: ${user.internalRole || 'None'}`);
    
    // Hash new password with same salt rounds as the model (12)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly to bypass the beforeUpdate hook (which would double-hash)
    await user.sequelize.query(
      'UPDATE users SET password = :password, updated_at = NOW() WHERE id = :id',
      {
        replacements: { password: hashedPassword, id: user.id },
        type: user.sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log('\nYou can now log in with:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${newPassword}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error resetting password:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get command line arguments
const [,, email, newPassword] = process.argv;

// Run the script
resetPassword(email, newPassword)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
