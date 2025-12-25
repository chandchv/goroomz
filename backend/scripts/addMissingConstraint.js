const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔧 Adding missing unique constraint to rooms_new...\n');
    
    // Check if constraint already exists
    const [existing] = await sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'rooms_new'
      AND constraint_name = 'rooms_new_unique_room_number_per_property';
    `);
    
    if (existing.length > 0) {
      console.log('✅ Constraint already exists!');
      process.exit(0);
    }
    
    // Add the constraint
    await sequelize.query(`
      ALTER TABLE rooms_new
      ADD CONSTRAINT rooms_new_unique_room_number_per_property
      UNIQUE (property_id, room_number);
    `);
    
    console.log('✅ Successfully added unique constraint!');
    
    // Mark migration as complete
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name)
      VALUES ('20251127000002-create-rooms-new-table.js')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Migration marked as complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
