const { sequelize } = require('../config/database');

async function checkFloors() {
  try {
    const [floors] = await sequelize.query(`
      SELECT DISTINCT floor_number 
      FROM rooms 
      WHERE property_id = '4c9b4a2b-67e2-47f9-9eb9-3028245a768f' 
      ORDER BY floor_number
    `);
    
    console.log('Floors with rooms:');
    floors.forEach(f => console.log('- Floor ' + f.floor_number));
    
    const [roomCounts] = await sequelize.query(`
      SELECT floor_number, COUNT(*) as room_count 
      FROM rooms 
      WHERE property_id = '4c9b4a2b-67e2-47f9-9eb9-3028245a768f' 
      GROUP BY floor_number 
      ORDER BY floor_number
    `);
    
    console.log('\nRoom counts by floor:');
    roomCounts.forEach(f => console.log(`- Floor ${f.floor_number}: ${f.room_count} rooms`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkFloors();