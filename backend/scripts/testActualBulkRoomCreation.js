const axios = require('axios');

async function testBulkRoomCreation() {
  try {
    console.log('Testing actual bulk room creation endpoint...');
    
    // Test data
    const testData = {
      propertyId: '4c9b4a2b-67e2-47f9-9eb9-3028245a768f', // Use the property from the error
      floorNumber: 1,
      startRoom: 101,
      endRoom: 103,
      sharingType: 'single',
      price: 5000
    };
    
    console.log('Test data:', testData);
    
    // Make request to bulk room creation endpoint
    const response = await axios.post('http://localhost:5000/api/internal/superuser/bulk-create-rooms', testData, {
      headers: {
        'Content-Type': 'application/json',
        // You might need to add authentication headers here
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testBulkRoomCreation();