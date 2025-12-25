const axios = require('axios');

async function testBedRoute() {
  try {
    console.log('🧪 Testing if bed route exists...');
    
    // Test the bed endpoint without auth to see if route exists
    const roomId = '610ba499-1376-4473-a476-e885d139c74d'; // Room 309 ID
    
    try {
      const response = await axios.get(`http://localhost:5000/api/internal/rooms/${roomId}/beds`);
      console.log('✅ Route exists and responded:', response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Route exists! Got 401 (authentication required)');
        console.log('📋 Response:', error.response.data);
      } else if (error.response?.status === 404) {
        console.log('❌ Route not found (404)');
        console.log('📋 Response:', error.response.data);
      } else {
        console.log('❓ Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Also test the old bed route to confirm it's removed
    console.log('\n🧪 Testing old bed route (should be 404)...');
    try {
      const response = await axios.get(`http://localhost:5000/api/internal/beds/rooms/${roomId}/beds`);
      console.log('❌ Old route still exists:', response.status);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Old route properly removed (404)');
      } else {
        console.log('❓ Unexpected response for old route:', error.response?.status, error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBedRoute();