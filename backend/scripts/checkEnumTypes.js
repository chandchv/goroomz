const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔍 Checking enum types...\n');
    
    const [enums] = await sequelize.query(`
      SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typname LIKE '%properties%'
      GROUP BY t.typname
      ORDER BY t.typname;
    `);
    
    console.log('📋 Properties-related enum types:');
    enums.forEach(e => {
      console.log(`\n   ${e.enum_name}:`);
      console.log(`   Values: ${Array.isArray(e.enum_values) ? e.enum_values.join(', ') : e.enum_values}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
