/**
 * Cleanup and Migration Script
 * 
 * This script:
 * 1. Clears old bookings, rooms, and properties data
 * 2. Adds missing columns to the bookings table
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres'
});

async function cleanupAndMigrate() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      console.log('\n🗑️  Clearing old data...');

      // Helper function to safely delete from table
      const safeDelete = async (tableName) => {
        try {
          const [tableExists] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = '${tableName}'
            )
          `, { transaction });
          
          if (tableExists[0].exists) {
            await sequelize.query(`DELETE FROM ${tableName}`, { transaction });
            console.log(`  - Cleared ${tableName}`);
          } else {
            console.log(`  - Table ${tableName} does not exist, skipping`);
          }
        } catch (err) {
          console.log(`  - Warning clearing ${tableName}: ${err.message}`);
        }
      };

      // Clear in order of dependencies (child tables first)
      await safeDelete('booking_audit_logs');
      await safeDelete('guest_documents');
      await safeDelete('deposits');
      await safeDelete('payments');
      await safeDelete('housekeeping_tasks');
      await safeDelete('bookings');
      await safeDelete('guest_profiles');
      await safeDelete('rooms');
      await safeDelete('properties');

      console.log('✅ Old data cleared');

      console.log('\n🔧 Adding missing columns to bookings table...');

      // Check and add missing columns
      const columnsToAdd = [
        { name: 'property_id', type: 'UUID', references: 'properties(id)' },
        { name: 'bed_id', type: 'UUID' },
        { name: 'booking_number', type: 'VARCHAR(50)' },
        { name: 'booking_source', type: "VARCHAR(20) DEFAULT 'offline'" },
        { name: 'booking_type', type: "VARCHAR(20) DEFAULT 'daily'" },
        { name: 'actual_check_in_time', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'actual_check_out_time', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'paid_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'check_in_notes', type: 'TEXT' },
        { name: 'check_in_by', type: 'UUID' },
        { name: 'check_out_notes', type: 'TEXT' },
        { name: 'check_out_by', type: 'UUID' },
        { name: 'room_inspected', type: 'BOOLEAN DEFAULT false' },
        { name: 'guest_profile_id', type: 'UUID' }
      ];

      for (const col of columnsToAdd) {
        try {
          // Check if column exists
          const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = '${col.name}'
          `, { transaction });

          if (results.length === 0) {
            console.log(`  - Adding column: ${col.name}`);
            await sequelize.query(
              `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`,
              { transaction }
            );
          } else {
            console.log(`  - Column ${col.name} already exists`);
          }
        } catch (err) {
          console.log(`  - Warning for ${col.name}: ${err.message}`);
        }
      }

      // Add unique constraint on booking_number if not exists
      try {
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booking_number_key'
            ) THEN
              ALTER TABLE bookings ADD CONSTRAINT bookings_booking_number_key UNIQUE (booking_number);
            END IF;
          END $$;
        `, { transaction });
        console.log('  - Added unique constraint on booking_number');
      } catch (err) {
        console.log(`  - Unique constraint warning: ${err.message}`);
      }

      console.log('✅ Missing columns added');

      // Commit transaction
      await transaction.commit();
      console.log('\n✅ Migration completed successfully!');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanupAndMigrate();
