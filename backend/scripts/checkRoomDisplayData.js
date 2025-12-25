const { sequelize } = require('../config/database');

async function checkRoomDisplayData() {
  try {
    console.log('Checking room data for display issues...');
    
    const [rooms] = await sequelize.query(`
      SELECT 
        id, room_number, floor_number, title, 
        sharing_type, current_status, total_beds,
        property_id, created_at
      FROM rooms 
      WHERE property_id = '4c9b4a2b-67e2-47f9-9eb9-3028245a768f'
      ORDER BY floor_number, room_number
      LIMIT 10
    `);
    
    console.log(`Found ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`- Room ${room.room_number} | Floor ${room.floor_number} | Status: ${room.current_status} | Beds: ${room.total_beds}`);
    });
    
    // Check if there are any NULL values
    const [nullCheck] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(room_number) as rooms_with_number,
        COUNT(floor_number) as rooms_with_floor,
        COUNT(title) as rooms_with_title
      FROM rooms 
      WHERE property_id = '4c9b4a2b-67e2-47f9-9eb9-3028245a768f'
    `);
    
    console.log('\nData completeness check:');
    console.log(`Total rooms: ${nullCheck[0].total_rooms}`);
    console.log(`Rooms with room_number: ${nullCheck[0].rooms_with_number}`);
    console.log(`Rooms with floor_number: ${nullCheck[0].rooms_with_floor}`);
    console.log(`Rooms with title: ${nullCheck[0].rooms_with_title}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkRoomDisplayData();