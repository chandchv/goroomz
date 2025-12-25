const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Migration script to add Internal Management System fields to existing tables
 * This script adds new columns to Room, Booking, and User models
 */

async function migrateInternalManagementFields() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔄 Starting migration for Internal Management System fields...');

    // Helper function to add column if it doesn't exist
    const addColumnIfMissing = async (tableName, columnName, definition) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        
        if (!tableDescription[columnName]) {
          await queryInterface.addColumn(tableName, columnName, definition);
          console.log(`✅ Added ${columnName} to ${tableName}`);
        } else {
          console.log(`ℹ️  Column ${columnName} already exists in ${tableName}, skipping`);
        }
      } catch (error) {
        if (error?.original?.code === '42701') {
          console.log(`ℹ️  Column ${columnName} already exists in ${tableName}, skipping`);
        } else {
          throw error;
        }
      }
    };

    // Migrate Room table
    console.log('\n📋 Migrating Room table...');
    await addColumnIfMissing('rooms', 'floor_number', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing('rooms', 'room_number', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing('rooms', 'custom_category_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'room_categories',
        key: 'id'
      }
    });

    await addColumnIfMissing('rooms', 'sharing_type', {
      type: DataTypes.ENUM('single', '2_sharing', '3_sharing'),
      allowNull: true
    });

    await addColumnIfMissing('rooms', 'total_beds', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing('rooms', 'current_status', {
      type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
      allowNull: true,
      defaultValue: 'vacant_clean'
    });

    await addColumnIfMissing('rooms', 'last_cleaned_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing('rooms', 'last_maintenance_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    // Migrate Booking table
    console.log('\n📋 Migrating Booking table...');
    await addColumnIfMissing('bookings', 'booking_source', {
      type: DataTypes.ENUM('online', 'offline'),
      allowNull: true,
      defaultValue: 'online'
    });

    await addColumnIfMissing('bookings', 'bed_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'bed_assignments',
        key: 'id'
      }
    });

    await addColumnIfMissing('bookings', 'actual_check_in_time', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing('bookings', 'actual_check_out_time', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing('bookings', 'security_deposit_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'security_deposits',
        key: 'id'
      }
    });

    await addColumnIfMissing('bookings', 'checked_in_by', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await addColumnIfMissing('bookings', 'checked_out_by', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Migrate User table
    console.log('\n📋 Migrating User table...');
    await addColumnIfMissing('users', 'staff_role', {
      type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
      allowNull: true
    });

    await addColumnIfMissing('users', 'permissions', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        canCheckIn: false,
        canCheckOut: false,
        canManageRooms: false,
        canRecordPayments: false,
        canViewReports: false,
        canManageStaff: false,
        canUpdateRoomStatus: false,
        canManageMaintenance: false
      }
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Summary:');
    console.log('   - Room table: 8 new columns');
    console.log('   - Booking table: 7 new columns');
    console.log('   - User table: 2 new columns');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInternalManagementFields()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateInternalManagementFields };
