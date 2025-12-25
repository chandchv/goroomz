const axios = require('axios');

async function testBedEndpoint() {
  try {
    console.log('🧪 Testing bed endpoint with known working credentials...');
    
    // The user mentioned they can login successfully, so let's use their session
    // First, let's try to find the server port
    const ports = [5000, 5001, 3000];
    let serverUrl = null;
    
    for (const port of ports) {
      try {
        const healthResponse = await axios.get(`http://localhost:${port}/api/health`);
        if (healthResponse.status === 200) {
          serverUrl = `http://localhost:${port}`;
          console.log(`✅ Found server running on port ${port}`);
          break;
        }
      } catch (error) {
        // Port not available, try next
      }
    }
    
    if (!serverUrl) {
      console.log('❌ No server found on common ports');
      return;
    }
    
    // Try to login with the user's credentials
    // Based on the logs, the user is amit.patel@example.com
    const loginResponse = await axios.post(`${serverUrl}/api/internal/auth/login`, {
      email: 'amit.patel@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get rooms to find the specific room that's failing
    const roomsResponse = await axios.get(`${serverUrl}/api/internal/rooms/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Total rooms:', roomsResponse.data.count);
    
    // Find room 309 specifically
    const room309 = roomsResponse.data.data.find(room => room.roomNumber === 309);
    
    if (!room309) {
      console.log('❌ Room 309 not found');
      return;
    }
    
    console.log('🏠 Found room 309:', {
      id: room309.id,
      roomNumber: room309.roomNumber,
      sharingType: room309.sharingType,
      totalBeds: room309.totalBeds
    });
    
    // Now try to fetch beds for this room
    console.log(`🛏️ Fetching beds for room ${room309.id}...`);
    
    const bedsResponse = await axios.get(`${serverUrl}/api/internal/rooms/${room309.id}/beds`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Beds fetched successfully:', {
      success: bedsResponse.data.success,
      count: bedsResponse.data.count,
      beds: bedsResponse.data.data.map(bed => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status
      }))
    });
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testBedEndpoint();