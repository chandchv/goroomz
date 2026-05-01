/**
 * Script to fix notification enum types in the database
 * Run with: node scripts/fixNotificationEnums.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function fixNotificationEnums() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check what enum values currently exist for notifications status
    const [statusEnumValues] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_notifications_status'
      )
    `);
    console.log('Current enum_notifications_status values:', statusEnumValues.map(e => e.enumlabel));

    // Add missing status values if they don't exist
    const requiredStatusValues = ['pending', 'sent', 'read', 'dismissed', 'failed'];
    const existingStatusValues = statusEnumValues.map(e => e.enumlabel);

    for (const value of requiredStatusValues) {
      if (!existingStatusValues.includes(value)) {
        try {
          await sequelize.query(`ALTER TYPE enum_notifications_status ADD VALUE IF NOT EXISTS '${value}'`);
          console.log(`✅ Added '${value}' to enum_notifications_status`);
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log(`ℹ️  '${value}' already exists in enum_notifications_status`);
          } else {
            console.error(`❌ Error adding '${value}':`, err.message);
          }
        }
      } else {
        console.log(`ℹ️  '${value}' already exists in enum_notifications_status`);
      }
    }

    // Check notification_preferences table exists
    const [prefTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notification_preferences'
      )
    `);
    
    if (!prefTableExists[0].exists) {
      console.log('\n⚠️  notification_preferences table does not exist. Creating...');
      
      // Create digest_mode enum if not exists
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE digest_mode AS ENUM ('immediate', 'daily', 'weekly');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create notification_language enum if not exists
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE notification_language AS ENUM ('en', 'hi');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create the notification_preferences table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          notification_type VARCHAR(50) NOT NULL,
          email_enabled BOOLEAN NOT NULL DEFAULT true,
          sms_enabled BOOLEAN NOT NULL DEFAULT true,
          in_app_enabled BOOLEAN NOT NULL DEFAULT true,
          push_enabled BOOLEAN NOT NULL DEFAULT true,
          digest_mode VARCHAR(20) NOT NULL DEFAULT 'immediate',
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          language VARCHAR(10) NOT NULL DEFAULT 'en',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, notification_type)
        );
      `);
      console.log('✅ notification_preferences table created');

      // Create index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx 
        ON notification_preferences(user_id);
      `);
      console.log('✅ notification_preferences index created');
    } else {
      console.log('✅ notification_preferences table already exists');
    }

    console.log('\n🎉 Notification enum fix complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixNotificationEnums();
