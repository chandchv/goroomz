const { sequelize } = require('../models');

(async () => {
  try {
    console.log('🔧 Making category_id nullable in properties table...\n');
    
    await sequelize.query(`
      ALTER TABLE properties
      ALTER COLUMN category_id DROP NOT NULL;
    `);
    
    console.log('✅ Successfully made category_id nullable!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
