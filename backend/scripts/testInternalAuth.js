const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testInternalAuth() {
  try {
    console.log('🔐 Testing Internal Management Authentication...\n');

    // Step 1: Login
    console.log('Step 1: Logging in as sekhar.iw@gmail.com...');
    const loginResponse = await axios.post(`${API_URL}/api/internal/auth/login`, {
      email: 'sekhar.iw@gmail.com',
      password: 'Sekhar@123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    
    const user = loginResponse.data.user || loginResponse.data.data?.user;
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    
    console.log('User:', user?.name);
    console.log('Role:', user?.role);
    console.log('Internal Role:', user?.internalRole);
    console.log('Token:', token?.substring(0, 20) + '...\n');

    // Step 2: Test /api/internal/roles endpoint
    console.log('Step 2: Testing /api/internal/roles endpoint...');
    try {
      const rolesResponse = await axios.get(`${API_URL}/api/internal/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Roles endpoint successful!');
      console.log(`Found ${rolesResponse.data.count} roles\n`);
    } catch (error) {
      console.error('❌ Roles endpoint failed:', error.response?.status, error.response?.data?.message);
      console.error('Full error:', error.response?.data);
    }

    // Step 3: Test /api/internal/analytics/platform endpoint
    console.log('Step 3: Testing /api/internal/analytics/platform endpoint...');
    try {
      const analyticsResponse = await axios.get(`${API_URL}/api/internal/analytics/platform`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Analytics endpoint successful!');
      console.log('Platform stats:', JSON.stringify(analyticsResponse.data.data, null, 2).substring(0, 200) + '...\n');
    } catch (error) {
      console.error('❌ Analytics endpoint failed:', error.response?.status, error.response?.data?.message);
      console.error('Full error:', error.response?.data);
    }

    // Step 4: Test /api/internal/audit endpoint
    console.log('Step 4: Testing /api/internal/audit endpoint...');
    try {
      const auditResponse = await axios.get(`${API_URL}/api/internal/audit?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Audit endpoint successful!');
      console.log(`Found ${auditResponse.data.pagination.total} audit logs\n`);
    } catch (error) {
      console.error('❌ Audit endpoint failed:', error.response?.status, error.response?.data?.message);
      console.error('Full error:', error.response?.data);
    }

    // Step 5: Test /internal/superuser/property-owners endpoint
    console.log('Step 5: Testing /internal/superuser/property-owners endpoint...');
    try {
      const ownersResponse = await axios.get(`${API_URL}/api/internal/superuser/property-owners`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Property owners endpoint successful!');
      console.log(`Found ${ownersResponse.data.data.propertyOwners.length} property owners\n`);
    } catch (error) {
      console.error('❌ Property owners endpoint failed:', error.response?.status, error.response?.data?.message);
      console.error('Full error:', error.response?.data);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testInternalAuth();
