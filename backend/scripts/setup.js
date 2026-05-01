const { syncDatabase } = require('../models');
require('dotenv').config();

const setup = async () => {
  try {
    console.log('🚀 Setting up GoRoomz database...');
    
    // Sync database (create tables)
    await syncDatabase(true); // Force sync to recreate tables
    
    console.log('✅ Database setup completed successfully!');
    console.log('📝 You can now run: npm run seed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

setup();
