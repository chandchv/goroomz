require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: console.log
  }
);

async function forceDropAnnouncements() {
  try {
    console.log('Force dropping announcements table and related ENUMs...');
    
    // Drop the table
    await sequelize.query(`DROP TABLE IF EXISTS "announcements" CASCADE;`);
    console.log('✓ Dropped announcements table');
    
    // Drop all related ENUM types (including array types)
    const enumsToDrop = [
      '_enum_announcements_delivery_method',
      'enum_announcements_delivery_method',
      '_enum_announcements_target_audience',
      'enum_announcements_target_audience',
      '_announcements',
      'announcements'
    ];
    
    for (const enumType of enumsToDrop) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
        console.log(`✓ Dropped type: ${enumType}`);
      } catch (err) {
        console.log(`  Skipped ${enumType}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

forceDropAnnouncements();
