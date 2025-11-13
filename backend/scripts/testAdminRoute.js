const axios = require('axios');

async function testAdminRoute() {
  try {
    console.log('🧪 Testing admin route...');
    
    // Test if the route exists
    const response = await axios.get('http://localhost:5000/api/admin/import-csv', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('✅ Admin route is accessible');
  } catch (error) {
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📝 Message: ${error.response.data?.message || 'No message'}`);
      
      if (error.response.status === 401) {
        console.log('🔐 Authentication required - this is expected');
      } else if (error.response.status === 404) {
        console.log('❌ Route not found - admin routes not registered');
      } else {
        console.log('⚠️ Other error:', error.response.data);
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testAdminRoute();
