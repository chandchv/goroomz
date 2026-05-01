/**
 * Script to create the notifications and notification_preferences tables
 * Run with: node scripts/createNotificationTables.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function createNotificationTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create notification type enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'property_claim_submitted',
          'property_claim_approved',
          'property_claim_rejected',
          'booking_created',
          'booking_confirmed',
          'booking_cancelled',
          'booking_modified',
          'check_in_completed',
          'check_out_completed',
          'payment_reminder_7_day',
          'payment_reminder_3_day',
          'payment_reminder_1_day',
          'payment_overdue',
          'payment_received',
          'checkout_reminder',
          'lead_assigned',
          'approval_required',
          'ticket_created',
          'zero_occupancy_alert',
          'payment_failure_alert',
          'daily_summary_owner',
          'daily_summary_manager',
          'booking_request_received',
          'booking_rejected',
          'checkin_reminder',
          'stay_completed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ notification_type enum created');

    // Create notification priority enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ notification_priority enum created');

    // Create notification status enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'read', 'dismissed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ notification_status enum created');

    // Create digest mode enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE digest_mode AS ENUM ('immediate', 'daily', 'weekly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ digest_mode enum created');

    // Create language enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE notification_language AS ENUM ('en', 'hi');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ notification_language enum created');

    // Create the notifications table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority notification_priority NOT NULL DEFAULT 'medium',
        status notification_status NOT NULL DEFAULT 'pending',
        channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
        metadata JSONB NOT NULL DEFAULT '{}',
        scheduled_for TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        delivery_status JSONB NOT NULL DEFAULT '{}',
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ notifications table created');

    // Create indexes for notifications table
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
      CREATE INDEX IF NOT EXISTS notifications_status_idx ON notifications(status);
      CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS notifications_user_status_idx ON notifications(user_id, status);
      CREATE INDEX IF NOT EXISTS notifications_scheduled_for_idx ON notifications(scheduled_for);
      CREATE INDEX IF NOT EXISTS notifications_priority_idx ON notifications(priority);
    `);
    console.log('✅ notifications indexes created');

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
        digest_mode digest_mode NOT NULL DEFAULT 'immediate',
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        language notification_language NOT NULL DEFAULT 'en',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, notification_type)
      );
    `);
    console.log('✅ notification_preferences table created');

    // Create indexes for notification_preferences table
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx ON notification_preferences(user_id);
    `);
    console.log('✅ notification_preferences indexes created');

    // Create trigger for updated_at on notifications
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await sequelize.query(`
      DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
      CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ notifications updated_at trigger created');

    await sequelize.query(`
      DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
      CREATE TRIGGER update_notification_preferences_updated_at
        BEFORE UPDATE ON notification_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ notification_preferences updated_at trigger created');

    console.log('\n🎉 Notification tables setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createNotificationTables();
