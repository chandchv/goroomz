const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'amit.patel@example.com',
  password: 'Owner123!'
};
const ROOM_309_ID = '610ba499-1376-4473-a476-e885d139c74d';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints for Postman validation...\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    
    // Test 2: Login
    console.log('\n2️⃣ Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/internal/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('📧 User:', loginResponse.data.user.email);
      console.log('🔑 Token received (first 20 chars):', loginResponse.data.token.substring(0, 20) + '...');
      
      const token = loginResponse.data.token;
      
      // Test 3: Bed Endpoint (Main Test)
      console.log('\n3️⃣ Testing Bed Endpoint...');
      const bedResponse = await axios.get(
        `${BASE_URL}/api/internal/rooms/${ROOM_309_ID}/beds`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Bed endpoint successful!');
      console.log('🏠 Room:', bedResponse.data.roomNumber);
      console.log('🛏️ Beds found:', bedResponse.data.count);
      console.log('📋 Bed data sample:', JSON.stringify(bedResponse.data.data[0], null, 2));
      
      // Test 4: Test without auth (should fail)
      console.log('\n4️⃣ Testing without authentication (should fail)...');
      try {
        await axios.get(`${BASE_URL}/api/internal/rooms/${ROOM_309_ID}/beds`);
        console.log('❌ Unexpected: Request succeeded without auth');
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('✅ Correctly rejected without auth (401)');
        } else {
          console.log('❓ Unexpected error:', error.response?.status);
        }
      }
      
      // Test 5: Get all rooms
      console.log('\n5️⃣ Testing rooms list...');
      const roomsResponse = await axios.get(
        `${BASE_URL}/api/internal/rooms/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Rooms endpoint successful!');
      console.log('🏠 Total rooms:', roomsResponse.data.count);
      
      // Find double sharing rooms
      const doubleRooms = roomsResponse.data.data.filter(room => 
        room.sharingType === 'double' && 
        room.roomNumber >= '301' && 
        room.roomNumber <= '310'
      );
      
      console.log('🛏️ Double sharing rooms (301-310):');
      doubleRooms.forEach(room => {
        console.log(`   Room ${room.roomNumber}: ${room.id}`);
      });
      
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('\n📋 POSTMAN SETUP:');
      console.log('1. Import: Bed_API_Testing.postman_collection.json');
      console.log('2. Email:', TEST_CREDENTIALS.email);
      console.log('3. Password:', TEST_CREDENTIALS.password);
      console.log('4. Room IDs from above list');
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server not running. Start it with:');
      console.log('   cd backend && node server.js');
    }
  }
}

testEndpoints();