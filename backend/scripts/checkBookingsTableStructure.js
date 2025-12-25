const { sequelize } = require('../config/database');

async function checkBookingsTableStructure() {
  try {
    console.log('🔍 Checking Bookings Table Structure...');
    
    // Get table columns
    const columns = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'bookings' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n📋 Bookings Table Columns:');
    columns.forEach(column => {
      console.log(`   ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable}) default: ${column.column_default || 'none'}`);
    });
    
    // Check specifically for room_id columns
    const roomIdColumns = columns.filter(col => col.column_name.includes('room_id'));
    console.log('\n📋 Room ID Related Columns:');
    roomIdColumns.forEach(column => {
      console.log(`   ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking bookings table structure:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkBookingsTableStructure();