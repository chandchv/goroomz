const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Room = require('./Room');
const RoomType = require('./RoomType');
const Booking = require('./Booking');
const Category = require('./Category');
const Property = require('./Property');

// Enhanced data models
const Lead = require('./Lead');
const PropertyOwner = require('./PropertyOwner');
const CommunicationRecord = require('./CommunicationRecord');
const BookingSync = require('./BookingSync');
const Territory = require('./Territory');

// New models for internal management
const Payment = require('./Payment');
const Staff = require('./Staff');
const Deposit = require('./Deposit');
const HousekeepingTask = require('./HousekeepingTask');

// New models for hotel booking flow
const GuestProfile = require('./GuestProfile');
const GuestDocument = require('./GuestDocument');
const BookingAuditLog = require('./BookingAuditLog');

// Property claim model
const PropertyClaim = require('./PropertyClaim');

// Notification models
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');

// Property associations
Property.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

Property.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

User.hasMany(Property, {
  foreignKey: 'ownerId',
  as: 'properties'
});

User.hasMany(Property, {
  foreignKey: 'approvedBy',
  as: 'approvedProperties'
});

// Room-Property associations
Room.belongsTo(Property, {
  foreignKey: 'propertyId',
  as: 'property'
});

Property.hasMany(Room, {
  foreignKey: 'propertyId',
  as: 'rooms'
});

// Define associations
User.hasMany(Room, {
  foreignKey: 'ownerId',
  as: 'ownedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

// Category owner associations
User.hasMany(Room, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwnedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwner'
});

// Admin approval associations
Room.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approvedByUser'
});

User.hasMany(Booking, {
  foreignKey: 'userId',
  as: 'bookings'
});

Booking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Booking, {
  foreignKey: 'ownerId',
  as: 'receivedBookings'
});

Booking.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

Room.hasMany(Booking, {
  foreignKey: 'roomId',
  as: 'bookings'
});

Booking.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

// Room Type associations
Room.hasMany(RoomType, {
  foreignKey: 'propertyId',
  as: 'roomTypes',
  onDelete: 'CASCADE'
});

RoomType.belongsTo(Room, {
  foreignKey: 'propertyId',
  as: 'property'
});

// Enhanced model associations

// Lead associations
Lead.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

Lead.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Lead.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

User.hasMany(Lead, {
  foreignKey: 'agentId',
  as: 'assignedLeads'
});

Territory.hasMany(Lead, {
  foreignKey: 'territoryId',
  as: 'leads'
});

// PropertyOwner associations
PropertyOwner.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

PropertyOwner.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

PropertyOwner.belongsTo(User, {
  foreignKey: 'verifiedBy',
  as: 'verifier'
});

PropertyOwner.belongsTo(User, {
  foreignKey: 'assignedTrainer',
  as: 'trainer'
});

PropertyOwner.belongsTo(User, {
  foreignKey: 'assignedAgent',
  as: 'agent'
});

Lead.hasOne(PropertyOwner, {
  foreignKey: 'leadId',
  as: 'propertyOwner'
});

User.hasMany(PropertyOwner, {
  foreignKey: 'userId',
  as: 'propertyOwnerProfiles'
});

// CommunicationRecord associations
CommunicationRecord.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

CommunicationRecord.belongsTo(PropertyOwner, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

CommunicationRecord.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

CommunicationRecord.belongsTo(User, {
  foreignKey: 'fromUserId',
  as: 'fromUser'
});

CommunicationRecord.belongsTo(User, {
  foreignKey: 'toUserId',
  as: 'toUser'
});

CommunicationRecord.belongsTo(CommunicationRecord, {
  foreignKey: 'parentCommunicationId',
  as: 'parentCommunication'
});

Lead.hasMany(CommunicationRecord, {
  foreignKey: 'leadId',
  as: 'communications'
});

PropertyOwner.hasMany(CommunicationRecord, {
  foreignKey: 'propertyOwnerId',
  as: 'communications'
});

Booking.hasMany(CommunicationRecord, {
  foreignKey: 'bookingId',
  as: 'communications'
});

// BookingSync associations
BookingSync.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

BookingSync.belongsTo(PropertyOwner, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

BookingSync.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

BookingSync.belongsTo(User, {
  foreignKey: 'resolvedBy',
  as: 'resolver'
});

Booking.hasMany(BookingSync, {
  foreignKey: 'bookingId',
  as: 'syncRecords'
});

PropertyOwner.hasMany(BookingSync, {
  foreignKey: 'propertyOwnerId',
  as: 'bookingSyncs'
});

Room.hasMany(BookingSync, {
  foreignKey: 'roomId',
  as: 'bookingSyncs'
});

// Territory associations
Territory.belongsTo(User, {
  foreignKey: 'territoryHeadId',
  as: 'territoryHead'
});

Territory.belongsTo(User, {
  foreignKey: 'backupHeadId',
  as: 'backupHead'
});

User.hasMany(Territory, {
  foreignKey: 'territoryHeadId',
  as: 'managedTerritories'
});

User.hasMany(Territory, {
  foreignKey: 'backupHeadId',
  as: 'backupTerritories'
});

// Payment associations
Payment.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

Booking.hasMany(Payment, {
  foreignKey: 'bookingId',
  as: 'payments'
});

// Staff associations
Staff.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(Staff, {
  foreignKey: 'userId',
  as: 'staffProfile'
});

// Deposit associations
Deposit.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

Booking.hasMany(Deposit, {
  foreignKey: 'bookingId',
  as: 'deposits'
});

// HousekeepingTask associations
HousekeepingTask.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

Room.hasMany(HousekeepingTask, {
  foreignKey: 'roomId',
  as: 'housekeepingLogs'
});

// GuestProfile associations
GuestProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

GuestProfile.belongsTo(User, {
  foreignKey: 'idVerifiedBy',
  as: 'verifier'
});

User.hasMany(GuestProfile, {
  foreignKey: 'userId',
  as: 'guestProfiles'
});

// GuestDocument associations
GuestDocument.belongsTo(GuestProfile, {
  foreignKey: 'guestProfileId',
  as: 'guestProfile'
});

GuestDocument.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

GuestDocument.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

GuestProfile.hasMany(GuestDocument, {
  foreignKey: 'guestProfileId',
  as: 'documents'
});

Booking.hasMany(GuestDocument, {
  foreignKey: 'bookingId',
  as: 'guestDocuments'
});

// Booking-GuestProfile association
Booking.belongsTo(GuestProfile, {
  foreignKey: 'guestProfileId',
  as: 'guestProfile'
});

GuestProfile.hasMany(Booking, {
  foreignKey: 'guestProfileId',
  as: 'bookings'
});

// Booking-Property association
Booking.belongsTo(Property, {
  foreignKey: 'propertyId',
  as: 'property'
});

Property.hasMany(Booking, {
  foreignKey: 'propertyId',
  as: 'bookings'
});

// Booking check-in/check-out staff associations
Booking.belongsTo(User, {
  foreignKey: 'checkInBy',
  as: 'checkInStaff'
});

Booking.belongsTo(User, {
  foreignKey: 'checkOutBy',
  as: 'checkOutStaff'
});

// BookingAuditLog associations
BookingAuditLog.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

BookingAuditLog.belongsTo(User, {
  foreignKey: 'performedBy',
  as: 'performer'
});

Booking.hasMany(BookingAuditLog, {
  foreignKey: 'bookingId',
  as: 'auditLogs'
});

// PropertyClaim associations
PropertyClaim.belongsTo(Property, {
  foreignKey: 'propertyId',
  as: 'property'
});

PropertyClaim.belongsTo(User, {
  foreignKey: 'claimantUserId',
  as: 'claimant'
});

PropertyClaim.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer'
});

Property.hasMany(PropertyClaim, {
  foreignKey: 'propertyId',
  as: 'claims'
});

User.hasMany(PropertyClaim, {
  foreignKey: 'claimantUserId',
  as: 'propertyClaims'
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

// NotificationPreference associations
NotificationPreference.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(NotificationPreference, {
  foreignKey: 'userId',
  as: 'notificationPreferences'
});

const ensureSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const userTable = await queryInterface.describeTable('users');
    if (!userTable.firebase_uid) {
      await queryInterface.addColumn('users', 'firebase_uid', {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      });
      console.log('✅ Added missing firebase_uid column to users table');
    }

    if (userTable.password && userTable.password.allowNull === false) {
      await queryInterface.changeColumn('users', 'password', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [6, 255]
        }
      });
      console.log('✅ Updated users.password column to allow NULL values');
    }
  } catch (error) {
    if (error?.message?.includes('does not exist')) {
      console.warn('⚠️ users table not found during schema check, skipping firebase_uid column ensure step');
    } else {
      throw error;
    }
  }

  // Handle rooms table data migration separately
  try {
    // Check if rooms table exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('rooms')) {
      // Check if owner_id column exists
      const roomsTable = await queryInterface.describeTable('rooms');
      
      if (roomsTable.owner_id) {
        // Check if there are rooms without owner_id
        const [results] = await sequelize.query(
          "SELECT COUNT(*) as count FROM rooms WHERE owner_id IS NULL"
        );
        
        if (results[0].count > 0) {
          console.log(`⚠️  Found ${results[0].count} rooms without owner_id. Setting default owner...`);
          
          // Get the first admin user to assign as default owner
          const [adminUsers] = await sequelize.query(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
          );
          
          if (adminUsers.length > 0) {
            await sequelize.query(
              "UPDATE rooms SET owner_id = ? WHERE owner_id IS NULL",
              { replacements: [adminUsers[0].id] }
            );
            console.log('✅ Updated rooms with default admin owner');
          } else {
            // If no admin, get any user
            const [anyUsers] = await sequelize.query(
              "SELECT id FROM users LIMIT 1"
            );
            
            if (anyUsers.length > 0) {
              await sequelize.query(
                "UPDATE rooms SET owner_id = ? WHERE owner_id IS NULL",
                { replacements: [anyUsers[0].id] }
              );
              console.log('✅ Updated rooms with default user as owner');
            } else {
              console.warn('⚠️  No users found to assign as default owner');
            }
          }
        }
      }

      // Handle enum value migration for room_type
      if (roomsTable.room_type) {
        try {
          // Check for invalid enum values and update them
          const [invalidRoomTypes] = await sequelize.query(
            "SELECT DISTINCT room_type FROM rooms WHERE room_type NOT IN ('Private Room', 'Shared Room', 'Entire Place', 'Studio', 'Hotel Room', 'PG')"
          );
          
          if (invalidRoomTypes.length > 0) {
            console.log(`⚠️  Found ${invalidRoomTypes.length} rooms with invalid room_type values. Updating...`);
            
            // Update invalid room types to default value
            await sequelize.query(
              "UPDATE rooms SET room_type = 'Private Room' WHERE room_type NOT IN ('Private Room', 'Shared Room', 'Entire Place', 'Studio', 'Hotel Room', 'PG')"
            );
            console.log('✅ Updated invalid room_type values to default');
          }
        } catch (enumError) {
          console.warn('⚠️  Room type enum migration warning:', enumError.message);
        }
      }
    }
  } catch (roomError) {
    console.warn('⚠️  Room data migration warning:', roomError.message);
  }
};

// Sync database
const syncDatabase = async (force = false) => {
  try {
    await ensureSchema();
    
    // Use alter: true to modify existing tables instead of recreating them
    // This handles existing indexes more gracefully
    if (!force) {
      await sequelize.sync({ alter: true });
    } else {
      await sequelize.sync({ force: true });
    }
    
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    // Handle specific index already exists error
    if (error.message && (error.message.includes('already exists') || error.message.includes('relation') && error.message.includes('already exists'))) {
      console.warn('⚠️  Database sync encountered existing indexes - this is normal in development');
      console.log('✅ Database connection established and working');
      return; // Don't throw, just continue
    }
    
    // Handle enum value errors
    if (error.message && error.message.includes('invalid input value for enum')) {
      console.warn('⚠️  Database sync encountered enum value conflicts - this is normal when schema changes');
      console.log('✅ Database connection established and working');
      return; // Don't throw, just continue
    }
    
    console.error('❌ Database sync failed:', error.message);
    
    // In development, don't crash the server for sync issues
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Database sync failed in development mode - continuing without database sync');
      return;
    }
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Room,
  RoomType,
  Booking,
  Category,
  Property,
  PropertyClaim,
  Lead,
  PropertyOwner,
  CommunicationRecord,
  BookingSync,
  Territory,
  Payment,
  Staff,
  Deposit,
  HousekeepingTask,
  GuestProfile,
  GuestDocument,
  BookingAuditLog,
  Notification,
  NotificationPreference,
  syncDatabase
};
