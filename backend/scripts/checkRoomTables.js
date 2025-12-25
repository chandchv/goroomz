const { sequelize } = require('../config/database');

async function checkRoomTables() {
  try {
    console.log('Checking room-related tables...');
    
    // Get all room-related tables
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'room%' 
      ORDER BY table_name;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Room-related tables:');
    tables.forEach(table => console.log('- ' + table.table_name));
    
    // Check foreign key constraints for room_statuses
    const constraints = await sequelize.query(`
      SELECT 
        kcu.constraint_name,
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu 
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = 'room_statuses'
      AND kcu.constraint_name LIKE '%fkey%';
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\nroom_statuses foreign key constraints:');
    constraints.forEach(c => {
      console.log(`- ${c.constraint_name}: ${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name}`);
    });
    
    // Check if the room ID exists in any room table
    const roomId = 'f62b9dcf-117c-4311-bdec-5691338ea616';
    console.log(`\nChecking for room ID: ${roomId}`);
    
    for (const table of tables) {
      try {
        const count = await sequelize.query(`
          SELECT COUNT(*) as count 
          FROM ${table.table_name} 
          WHERE id = :roomId
        `, { 
          replacements: { roomId },
          type: sequelize.QueryTypes.SELECT 
        });
        
        if (count[0].count > 0) {
          console.log(`✅ Found room in table: ${table.table_name}`);
        } else {
          console.log(`❌ Not found in table: ${table.table_name}`);
        }
      } catch (err) {
        console.log(`⚠️  Error checking ${table.table_name}: ${err.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRoomTables();