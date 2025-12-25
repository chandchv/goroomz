const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔍 Checking constraint status...\n');
    
    // Check if rooms_new table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rooms_new';
    `);
    
    console.log('📋 rooms_new table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Check constraints on rooms_new
      const [constraints] = await sequelize.query(`
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms_new';
      `);
      
      console.log('\n🔗 Constraints on rooms_new:');
      constraints.forEach(c => {
        console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
      });
      
      // Check columns
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'rooms_new'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Columns in rooms_new:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
