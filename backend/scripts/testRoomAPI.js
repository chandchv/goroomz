const { sequelize } = require('../config/database');
const Room = require('../models/Room');

async function testRoomAPI() {
  try {
    console.log('Testing Room API data retrieval...');
    
    // Test direct Room model query
    const rooms = await Room.findAll({
      where: {
        propertyId: '4c9b4a2b-67e2-47f9-9eb9-3028245a768f',
        isActive: true
      },
      attributes: [
        'id', 
        'roomNumber', 
        'floorNumber', 
        'currentStatus', 
        'sharingType', 
        'totalBeds', 
        'price',
        'isActive', 
        'propertyId'
      ],
      order: [
        ['floorNumber', 'ASC'],
        ['roomNumber', 'ASC']
      ],
      limit: 5
    });
    
    console.log(`Found ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`- Room ${room.roomNumber} | Floor ${room.floorNumber} | Status: ${room.currentStatus} | Beds: ${room.totalBeds}`);
    });
    
    // Test the data format that would be returned by API
    const apiResponse = {
      success: true,
      count: rooms.length,
      data: rooms.map(room => ({
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        currentStatus: room.currentStatus,
        sharingType: room.sharingType,
        totalBeds: room.totalBeds,
        price: room.price,
        isActive: room.isActive,
        propertyId: room.propertyId
      }))
    };
    
    console.log('\nAPI Response format:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

testRoomAPI();