const axios = require('axios');

async function testBedEndpoint() {
  try {
    console.log('🧪 Testing bed endpoint...');
    
    // First, test login to get auth token
    console.log('1. Testing login...');
    const loginResponse = await axios.post('http://localhost:5000/api/internal/auth/login', {
      email: 'amit.patel@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.token;
      
      // Test bed endpoint for room 309 (double sharing room)
      console.log('2. Testing bed endpoint for room 309...');
      const roomId = '610ba499-1376-4473-a476-e885d139c74d'; // Room 309 ID from context
      
      const bedResponse = await axios.get(`http://localhost:5000/api/internal/rooms/${roomId}/beds`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Bed endpoint response:', bedResponse.status);
      console.log('📋 Bed data:', JSON.stringify(bedResponse.data, null, 2));
      
    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testBedEndpoint();