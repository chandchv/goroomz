const { sequelize } = require('../config/database');

async function checkBookingConstraints() {
  try {
    console.log('🔍 Checking Booking Table Constraints...');
    
    // Check table constraints
    const constraints = await sequelize.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE 
        tc.table_name = 'bookings' 
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n📋 Booking Table Constraints:');
    constraints.forEach(constraint => {
      console.log(`   ${constraint.constraint_type}: ${constraint.constraint_name}`);
      console.log(`     Column: ${constraint.column_name}`);
      if (constraint.foreign_table_name) {
        console.log(`     References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      }
      console.log('');
    });
    
    // Check indexes
    const indexes = await sequelize.query(`
      SELECT 
        indexname,
        indexdef
      FROM 
        pg_indexes 
      WHERE 
        tablename = 'bookings'
        AND schemaname = 'public'
      ORDER BY indexname;
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n📋 Booking Table Indexes:');
    indexes.forEach(index => {
      console.log(`   ${index.indexname}:`);
      console.log(`     ${index.indexdef}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking booking constraints:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkBookingConstraints();