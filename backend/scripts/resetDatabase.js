const { sequelize } = require('../config/database');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables and recreate
    await sequelize.sync({ force: true });
    
    console.log('✅ Database reset completed successfully!');
    console.log('📝 You can now run: npm run seed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
};

resetDatabase();
