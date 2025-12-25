/**
 * Test User Login
 * 
 * Tests if the seeded users can login successfully
 */

const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function testUserLogin() {
  try {
    console.log('🔐 Testing user login...\n');

    const testEmail = 'sarah.johnson@goroomz.com';
    const testPassword = 'Password123!';

    // Find user
    const user = await User.findOne({ where: { email: testEmail } });

    if (!user) {
      console.log('❌ User not found:', testEmail);
      process.exit(1);
    }

    console.log('✅ User found:', user.name);
    console.log('   Email:', user.email);
    console.log('   Internal Role:', user.internalRole);
    console.log('   Is Active:', user.isActive);
    console.log('   Password Hash:', user.password ? user.password.substring(0, 20) + '...' : 'NULL');

    // Test password comparison
    if (!user.password) {
      console.log('\n❌ User has no password set!');
      process.exit(1);
    }

    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('\n🔑 Password test:');
    console.log('   Input password:', testPassword);
    console.log('   Match result:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('   This means the password was not hashed correctly during seeding.');
      process.exit(1);
    }

    console.log('\n✅ Login test successful!');
    console.log('   User can login with the correct password.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing login:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testUserLogin();
