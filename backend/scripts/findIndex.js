const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔍 Searching for index or constraint with "unique_room_number_per_property"...\n');
    
    // Check for indexes
    const [indexes] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%unique_room_number_per_property%';
    `);
    
    if (indexes.length > 0) {
      console.log('✅ Found index:');
      indexes.forEach(idx => {
        console.log(`   Table: ${idx.tablename}`);
        console.log(`   Index: ${idx.indexname}`);
        console.log(`   Definition: ${idx.indexdef}\n`);
      });
    } else {
      console.log('❌ No index found with that name');
    }
    
    // Check all constraints on rooms_new
    console.log('\n📋 All unique constraints in database:');
    const [allUnique] = await sequelize.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_schema = 'public'
      AND tc.constraint_type = 'UNIQUE';
    `);
    
    allUnique.forEach(c => {
      console.log(`   ${c.table_name}.${c.constraint_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
