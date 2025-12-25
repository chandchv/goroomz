const axios = require('axios');

async function testRoleUpdateEndpoint() {
  try {
    console.log('🧪 Testing Role Update Endpoint...\n');

    // First, let's get a valid auth token by simulating login
    // We'll need to check what token the user is using
    console.log('Note: This test requires a valid auth token from the frontend.');
    console.log('The 403 error suggests the user is authenticated but not authorized.');
    console.log('Since we fixed the permissions, the issue might be elsewhere.\n');

    // Let's check if the role exists first
    const roleId = '9e6d22ac-933f-4ee1-8cab-05ae78783cbb';
    
    console.log('Checking if role exists in database...');
    const { InternalRole } = require('../models');
    
    const role = await InternalRole.findByPk(roleId);
    if (!role) {
      console.log('❌ Role not found with ID:', roleId);
      return;
    }
    
    console.log('✅ Role found:');
    console.log('   ID:', role.id);
    console.log('   Name:', role.name);
    console.log('   Display Name:', role.displayName);
    console.log('   Is Custom:', role.isCustom);
    console.log('   Created By:', role.createdBy);
    
    // Check if this is a predefined role
    if (!role.isCustom) {
      console.log('\n⚠️  This is a predefined role.');
      console.log('   According to the backend logic, predefined roles can only have their permissions updated,');
      console.log('   not their displayName or description.');
      console.log('   Make sure the frontend is only sending permission updates for predefined roles.');
    }
    
    console.log('\n💡 Possible issues:');
    console.log('1. Frontend might be sending displayName/description for a predefined role');
    console.log('2. User session might need to be refreshed after permission update');
    console.log('3. Frontend auth token might be stale');
    
    console.log('\n🔧 Solutions:');
    console.log('1. Check what data the frontend is sending in the PUT request');
    console.log('2. Have the user log out and log back in to refresh their session');
    console.log('3. Check browser dev tools for the exact request payload');

  } catch (error) {
    console.error('❌ Error testing role update endpoint:', error);
  }
}

testRoleUpdateEndpoint();