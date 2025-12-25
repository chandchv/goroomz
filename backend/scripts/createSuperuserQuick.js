/**
 * Quick Create Superuser Script (Non-interactive)
 * 
 * Usage:
 *   node scripts/createSuperuserQuick.js <email> <password> <name>
 * 
 * Example:
 *   node scripts/createSuperuserQuick.js admin@goroomz.com Admin123! "Admin User"
 * 
 * This creates an admin account with full permissions quickly without prompts.
 */

const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function createSuperuserQuick(email, password, name) {
  try {
    // Validate arguments
    if (!email || !password || !name) {
      console.error('❌ Usage: node scripts/createSuperuserQuick.js <email> <password> <name>');
      console.error('   Example: node scripts/createSuperuserQuick.js admin@goroomz.com Admin123! "Admin User"');
      process.exit(1);
    }
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Check if user exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      console.error(`❌ A user with email ${email} already exists`);
      process.exit(1);
    }
    
    // Validate password length
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create superuser
    const superuser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
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
    
    console.log('\n✅ Superuser created successfully!');
    console.log('\nAccount Details:');
    console.log(`  Name:  ${superuser.name}`);
    console.log(`  Email: ${superuser.email}`);
    console.log(`  Role:  ${superuser.role}`);
    console.log(`  ID:    ${superuser.id}`);
    console.log('\nYou can now log in to the internal management system.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating superuser:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get command line arguments
const [,, email, password, name] = process.argv;

// Run the script
createSuperuserQuick(email, password, name)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
