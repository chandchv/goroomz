require('dotenv').config();
const { sequelize } = require('../config/database');

async function fixAnnouncementDeliveryMethod() {
  try {
    console.log('🔄 Fixing announcements delivery_method column...');
    
    // Drop the column and recreate it
    await sequelize.query(`
      ALTER TABLE announcements 
      DROP COLUMN IF EXISTS delivery_method CASCADE;
    `);
    console.log('✅ Dropped delivery_method column');
    
    // Create the ENUM type if it doesn't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_announcements_delivery_method AS ENUM('email', 'in_app', 'sms');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Created ENUM type');
    
    // Add the column back as an array of ENUMs
    await sequelize.query(`
      ALTER TABLE announcements 
      ADD COLUMN delivery_method enum_announcements_delivery_method[] 
      NOT NULL 
      DEFAULT ARRAY['email', 'in_app']::enum_announcements_delivery_method[];
    `);
    console.log('✅ Added delivery_method column as ENUM array');
    
    console.log('\n✅ announcements delivery_method column fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixAnnouncementDeliveryMethod();
