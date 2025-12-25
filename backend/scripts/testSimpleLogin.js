const axios = require('axios');

async function testSimpleLogin() {
  try {
    console.log('🧪 Testing simple login...');
    
    // Try different common credentials
    const credentials = [
      { email: 'admin@goroomz.com', password: 'admin123' },
      { email: 'superuser@goroomz.com', password: 'superuser123' },
      { email: 'amit.patel@example.com', password: 'password123' },
      { email: 'test@example.com', password: 'password' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`🔑 Trying login with ${cred.email}...`);
        
        const response = await axios.post('http://localhost:5001/api/internal/auth/login', {
          email: cred.email,
          password: cred.password
        });
        
        console.log('✅ Login successful!');
        console.log('User:', response.data.user);
        console.log('Token received:', !!response.data.token);
        
        // Test rooms endpoint
        const roomsResponse = await axios.get('http://localhost:5001/api/internal/rooms/status', {
          headers: { Authorization: `Bearer ${response.data.token}` }
        });
        
        console.log('📋 Rooms response:', {
          success: roomsResponse.data.success,
          count: roomsResponse.data.count
        });
        
        return response.data.token; // Return token for further testing
        
      } catch (error) {
        console.log(`❌ Login failed for ${cred.email}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('❌ No valid credentials found');
    return null;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

testSimpleLogin();