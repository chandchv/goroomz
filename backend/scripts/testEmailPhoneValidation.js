const { validateUserCreation, checkEmailExists, checkPhoneExists } = require('../utils/userValidation');
const { User } = require('../models');

async function testEmailPhoneValidation() {
  console.log('🧪 Testing Email and Phone Validation...\n');

  try {
    // Test 1: Check if existing email is detected
    console.log('Test 1: Checking existing email detection...');
    const existingUser = await User.findOne({ limit: 1 });
    if (existingUser) {
      const emailExists = await checkEmailExists(existingUser.email);
      console.log(`✅ Email exists check: ${emailExists ? 'PASS' : 'FAIL'} (${existingUser.email})`);
    } else {
      console.log('⚠️  No existing users found to test email detection');
    }

    // Test 2: Check if non-existing email is handled correctly
    console.log('\nTest 2: Checking non-existing email...');
    const nonExistingEmail = 'nonexistent@test.com';
    const emailNotExists = await checkEmailExists(nonExistingEmail);
    console.log(`✅ Non-existing email check: ${!emailNotExists ? 'PASS' : 'FAIL'} (${nonExistingEmail})`);

    // Test 3: Test phone validation
    console.log('\nTest 3: Checking phone validation...');
    const testPhone = '+1234567890';
    const phoneExists = await checkPhoneExists(testPhone);
    console.log(`✅ Phone exists check: ${!phoneExists ? 'PASS' : 'FAIL'} (${testPhone})`);

    // Test 4: Test comprehensive user validation
    console.log('\nTest 4: Testing comprehensive user validation...');
    
    // Test with valid new user data
    const validUserData = {
      name: 'Test User',
      email: 'newuser@test.com',
      phone: '+9876543210'
    };
    
    const validationResult = await validateUserCreation(validUserData);
    console.log(`✅ Valid user data validation: ${validationResult.isValid ? 'PASS' : 'FAIL'}`);
    if (!validationResult.isValid) {
      console.log('   Errors:', validationResult.errors);
    }

    // Test 5: Test with existing email
    if (existingUser) {
      console.log('\nTest 5: Testing validation with existing email...');
      const duplicateEmailData = {
        name: 'Duplicate User',
        email: existingUser.email,
        phone: '+1111111111'
      };
      
      const duplicateValidation = await validateUserCreation(duplicateEmailData);
      console.log(`✅ Duplicate email validation: ${!duplicateValidation.isValid ? 'PASS' : 'FAIL'}`);
      if (!duplicateValidation.isValid) {
        console.log('   Expected errors:', duplicateValidation.errors);
      }
    }

    // Test 6: Test invalid email format
    console.log('\nTest 6: Testing invalid email format...');
    const invalidEmailData = {
      name: 'Invalid Email User',
      email: 'invalid-email',
      phone: '+2222222222'
    };
    
    const invalidEmailValidation = await validateUserCreation(invalidEmailData);
    console.log(`✅ Invalid email format validation: ${!invalidEmailValidation.isValid ? 'PASS' : 'FAIL'}`);
    if (!invalidEmailValidation.isValid) {
      console.log('   Expected errors:', invalidEmailValidation.errors);
    }

    // Test 7: Test invalid phone format
    console.log('\nTest 7: Testing invalid phone format...');
    const invalidPhoneData = {
      name: 'Invalid Phone User',
      email: 'validphone@test.com',
      phone: '123' // Too short
    };
    
    const invalidPhoneValidation = await validateUserCreation(invalidPhoneData);
    console.log(`✅ Invalid phone format validation: ${!invalidPhoneValidation.isValid ? 'PASS' : 'FAIL'}`);
    if (!invalidPhoneValidation.isValid) {
      console.log('   Expected errors:', invalidPhoneValidation.errors);
    }

    console.log('\n🎉 Email and Phone Validation Tests Completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testEmailPhoneValidation();