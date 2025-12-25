/**
 * Check User Script
 * 
 * Usage:
 *   node scripts/checkUser.js <email>
 * 
 * Example:
 *   node scripts/checkUser.js chandchvgsr@gmail.com
 * 
 * This script checks a user's details and verifies their login credentials.
 */

const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function checkUser(email) {
  try {
    if (!email) {
      console.error('❌ Usage: node scripts/checkUser.js <email>');
      console.error('   Example: node scripts/checkUser.js admin@goroomz.com');
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
    
    console.log('✅ User found!\n');
    console.log('=== User Details ===');
    console.log(`ID:           ${user.id}`);
    console.log(`Name:         ${user.name}`);
    console.log(`Email:        ${user.email}`);
    console.log(`Phone:        ${user.phone || 'Not set'}`);
    console.log(`Role:         ${user.role}`);
    console.log(`Staff Role:   ${user.staffRole || 'Not set'}`);
    console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
    console.log(`Firebase UID: ${user.firebase_uid || 'Not set'}`);
    console.log(`Created:      ${user.createdAt}`);
    console.log(`Updated:      ${user.updatedAt}`);
    
    console.log('\n=== Permissions ===');
    if (user.permissions) {
      Object.entries(user.permissions).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('  No permissions set');
    }
    
    console.log('\n=== Internal Management Access ===');
    const hasInternalAccess = 
      user.role === 'admin' || 
      user.role === 'owner' || 
      user.role === 'category_owner' ||
      user.staffRole !== null;
    
    if (hasInternalAccess) {
      console.log('✅ User HAS access to internal management system');
    } else {
      console.log('❌ User DOES NOT have access to internal management system');
      console.log('   Reason: Not an admin, owner, or staff member');
    }
    
    // Check password
    if (!user.password) {
      console.log('\n⚠️  WARNING: User has no password set!');
      console.log('   This user cannot log in to the internal management system.');
      console.log('   They may be using Firebase/social login only.');
    } else {
      console.log('\n✅ User has a password set');
      
      // Test password comparison
      console.log('\n=== Password Test ===');
      console.log('Enter a password to test (or press Ctrl+C to skip):');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Test Password: ', async (testPassword) => {
        if (testPassword) {
          try {
            const isMatch = await user.comparePassword(testPassword);
            if (isMatch) {
              console.log('✅ Password MATCHES!');
              console.log('   You should be able to log in with this password.');
            } else {
              console.log('❌ Password DOES NOT match');
              console.log('   This is not the correct password for this account.');
            }
          } catch (error) {
            console.error('❌ Error comparing password:', error.message);
          }
        }
        
        rl.close();
        await sequelize.close();
        process.exit(0);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error checking user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get command line arguments
const [,, email] = process.argv;

// Run the script
checkUser(email);
