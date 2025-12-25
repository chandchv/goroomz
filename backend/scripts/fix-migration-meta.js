const { sequelize } = require('../models');
require('dotenv').config();

(async () => {
  try {
    console.log('🔄 Fixing SequelizeMeta table...');
    
    // Remove the reference to the deleted empty migration
    const [results] = await sequelize.query(`
      DELETE FROM "SequelizeMeta"
      WHERE "name" = '20251120105626-add-my-feature.js'
    `);
    
    console.log('✅ Removed reference to deleted migration from SequelizeMeta');
    
    // Show remaining migrations
    const [remaining] = await sequelize.query(`
      SELECT "name" FROM "SequelizeMeta" ORDER BY "name" ASC
    `);
    
    console.log('\n📋 Remaining migrations in SequelizeMeta:');
    remaining.forEach(row => {
      console.log(`  - ${row.name}`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
})();

