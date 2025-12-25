const axios = require('axios');

async function testBedFetching() {
  try {
    console.log('🧪 Testing bed fetching for double sharing rooms...');
    
    // First, login to get auth token
    const loginResponse = await axios.post('http://localhost:5001/api/internal/auth/login', {
      email: 'amit.patel@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Get rooms to find double sharing rooms
    const roomsResponse = await axios.get('http://localhost:5001/api/internal/rooms/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Total rooms found:', roomsResponse.data.count);
    
    // Find double sharing rooms (301-310)
    const doubleRooms = roomsResponse.data.data.filter(room => 
      room.roomNumber >= 301 && room.roomNumber <= 310 && room.sharingType === 'double_sharing'
    );
    
    console.log('🏠 Double sharing rooms found:', doubleRooms.length);
    
    if (doubleRooms.length === 0) {
      console.log('❌ No double sharing rooms found in range 301-310');
      return;
    }
    
    // Test bed fetching for the first double room
    const testRoom = doubleRooms[0];
    console.log(`🛏️ Testing bed fetching for room ${testRoom.roomNumber} (ID: ${testRoom.id})`);
    
    const bedsResponse = await axios.get(`http://localhost:5001/api/internal/rooms/${testRoom.id}/beds`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Beds API response:', {
      success: bedsResponse.data.success,
      roomId: bedsResponse.data.roomId,
      roomNumber: bedsResponse.data.roomNumber,
      sharingType: bedsResponse.data.sharingType,
      totalBeds: bedsResponse.data.totalBeds,
      count: bedsResponse.data.count,
      beds: bedsResponse.data.data.map(bed => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status
      }))
    });
    
    // Test a few more rooms
    for (let i = 1; i < Math.min(3, doubleRooms.length); i++) {
      const room = doubleRooms[i];
      console.log(`\n🛏️ Testing room ${room.roomNumber} (ID: ${room.id})`);
      
      try {
        const response = await axios.get(`http://localhost:5001/api/internal/rooms/${room.id}/beds`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Room ${room.roomNumber}: ${response.data.count} beds found`);
        console.log(`   Vacant beds: ${response.data.data.filter(bed => bed.status === 'vacant').length}`);
      } catch (error) {
        console.log(`❌ Room ${room.roomNumber}: ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBedFetching();