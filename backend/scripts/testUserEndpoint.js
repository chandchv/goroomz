const axios = require('axios');

async function testUserEndpoint() {
  try {
    console.log('🧪 Testing User API Endpoints...\n');

    // Test 1: Get all users
    console.log('Test 1: GET /api/internal/users');
    try {
      const response = await axios.get('http://localhost:5000/api/internal/users');
      console.log('✅ Status:', response.status);
      console.log('✅ Users count:', response.data.count);
      
      if (response.data.data && response.data.data.length > 0) {
        const firstUser = response.data.data[0];
        console.log('✅ First user:', {
          id: firstUser.id,
          name: firstUser.name,
          email: firstUser.email,
          internalRole: firstUser.internalRole
        });

        // Test 2: Get specific user by ID
        console.log('\nTest 2: GET /api/internal/users/:id');
        try {
          const userResponse = await axios.get(`http://localhost:5000/api/internal/users/${firstUser.id}`);
          console.log('✅ Status:', userResponse.status);
          console.log('✅ User data:', {
            id: userResponse.data.data.id,
            name: userResponse.data.data.name,
            email: userResponse.data.data.email,
            phone: userResponse.data.data.phone,
            internalRole: userResponse.data.data.internalRole,
            internalPermissions: userResponse.data.data.internalPermissions ? 'Present' : 'Missing'
          });
        } catch (error) {
          console.log('❌ Error getting user by ID:', error.response?.data || error.message);
        }
      } else {
        console.log('⚠️  No users found to test individual user endpoint');
      }
    } catch (error) {
      console.log('❌ Error getting users:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserEndpoint();