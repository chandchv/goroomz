#!/usr/bin/env node

/**
 * Test script to verify email dot preservation fix
 * 
 * This script tests that emails with dots are preserved correctly
 * during validation and database lookup.
 */

const { User } = require('../models');

async function testEmailDotFix() {
  console.log('🧪 Testing Email Dot Preservation Fix\n');
  console.log('=' .repeat(50));

  const testEmail = 'chandchv.gsr@gmail.com';
  
  try {
    // Test 1: Check if user exists with dotted email
    console.log('\n📧 Test 1: Looking up user with dotted email');
    console.log(`   Email: ${testEmail}`);
    
    const user = await User.findOne({ 
      where: { email: testEmail.toLowerCase() }
    });

    if (user) {
      console.log('   ✅ User found!');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email in DB: ${user.email}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Staff Role: ${user.staffRole || 'None'}`);
    } else {
      console.log('   ❌ User not found');
      console.log('\n   Trying without dot...');
      
      const userWithoutDot = await User.findOne({ 
        where: { email: testEmail.replace(/\./g, '').toLowerCase() }
      });
      
      if (userWithoutDot) {
        console.log('   ⚠️  User found WITHOUT dot!');
        console.log(`   Email in DB: ${userWithoutDot.email}`);
        console.log('\n   This means the database has the email without dots.');
        console.log('   You may need to update the email in the database to include dots.');
      } else {
        console.log('   ❌ User not found with or without dots');
      }
    }

    // Test 2: Show all users with similar emails
    console.log('\n📋 Test 2: Finding all users with similar emails');
    const similarUsers = await User.findAll({
      where: {
        email: {
          [require('sequelize').Op.like]: '%chandchv%gmail.com'
        }
      }
    });

    if (similarUsers.length > 0) {
      console.log(`   Found ${similarUsers.length} user(s):`);
      similarUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.name})`);
      });
    } else {
      console.log('   No users found with similar emails');
    }

    // Test 3: Verify the fix is in place
    console.log('\n🔧 Test 3: Verifying validation middleware fix');
    const validationPath = require('path').join(__dirname, '../middleware/validation.js');
    const fs = require('fs');
    const validationContent = fs.readFileSync(validationPath, 'utf8');
    
    if (validationContent.includes('gmail_remove_dots: false')) {
      console.log('   ✅ Fix is in place: gmail_remove_dots: false found');
    } else if (validationContent.includes('normalizeEmail()')) {
      console.log('   ⚠️  Warning: normalizeEmail() without configuration found');
      console.log('   This may still remove dots from Gmail addresses');
    } else {
      console.log('   ℹ️  No email normalization found');
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Test complete!\n');
    
    if (user) {
      console.log('💡 Next steps:');
      console.log('   1. Restart your backend server');
      console.log('   2. Try logging in with: ' + testEmail);
      console.log('   3. Check backend logs for the SQL query');
    } else {
      console.log('⚠️  User not found. You may need to:');
      console.log('   1. Create a superuser with this email');
      console.log('   2. Or update the existing user\'s email in the database');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testEmailDotFix();
