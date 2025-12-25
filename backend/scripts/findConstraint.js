const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔍 Searching for constraint "unique_room_number_per_property"...\n');
    
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_schema = 'public'
      AND tc.constraint_name = 'unique_room_number_per_property';
    `);
    
    if (constraints.length > 0) {
      console.log('✅ Found constraint:');
      constraints.forEach(c => {
        console.log(`   Table: ${c.table_name}`);
        console.log(`   Name: ${c.constraint_name}`);
        console.log(`   Type: ${c.constraint_type}`);
      });
    } else {
      console.log('❌ Constraint not found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
