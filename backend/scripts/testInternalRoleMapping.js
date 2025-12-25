/**
 * Test Internal Role Field Mapping
 * 
 * This script tests if the internalRole field is properly mapped between
 * camelCase (model) and snake_case (database) after adding underscored: true
 */

const { User } = require('../models');

async function testRoleMapping() {
  try {
    console.log('🔍 Testing internal role field mapping...\n');

    // Find a user with internal role
    const users = await User.findAll({
      where: {
        internalRole: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
      },
      limit: 5
    });

    if (users.length === 0) {
      console.log('⚠️  No users with internal roles found in database');
      console.log('   Run: node backend/scripts/seedSampleInternalUsers.js');
      process.exit(0);
    }

    console.log(`✅ Found ${users.length} users with internal roles:\n`);

    users.forEach(user => {
      console.log(`📋 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Internal Role: ${user.internalRole || 'NULL'}`);
      console.log(`   Is Active: ${user.isActive}`);
      console.log(`   Has Internal Permissions: ${user.internalPermissions ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('✨ Field mapping is working correctly!');
    console.log('   The internalRole field is properly mapped from internal_role in database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing role mapping:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testRoleMapping();
