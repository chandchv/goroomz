const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Room = require('./Room');
const RoomType = require('./RoomType');
const Booking = require('./Booking');
const Category = require('./Category');
const RoomStatus = require('./RoomStatus');
const BedAssignment = require('./BedAssignment');
const Payment = require('./Payment');
const PaymentSchedule = require('./PaymentSchedule');
const SecurityDeposit = require('./SecurityDeposit');
const MaintenanceRequest = require('./MaintenanceRequest');
const HousekeepingLog = require('./HousekeepingLog');
const RoomCategory = require('./RoomCategory');

// Internal User Role Management models
const InternalRole = require('./InternalRole');
const Lead = require('./Lead');
const LeadCommunication = require('./LeadCommunication');
const Commission = require('./Commission');
const Territory = require('./Territory');
const AgentTarget = require('./AgentTarget');
const SupportTicket = require('./SupportTicket');
const TicketResponse = require('./TicketResponse');
const PropertyDocument = require('./PropertyDocument');
const AuditLog = require('./AuditLog');
const Announcement = require('./Announcement');
const Notification = require('./Notification');
const Alert = require('./Alert');
const Subscription = require('./Subscription');
const Discount = require('./Discount');
const BillingHistory = require('./BillingHistory');
const APIKey = require('./APIKey');
const APIKeyUsage = require('./APIKeyUsage');
const PropertyAssignment = require('./PropertyAssignment');
const Property = require('./Property');

// Define associations
// TODO: Room ownership is now handled through Property ownership
// User.hasMany(Room, {
//   foreignKey: 'ownerId',
//   as: 'ownedRooms'
// });

// TODO: Room ownership is now handled through Property ownership
// Room.belongsTo(User, {
//   foreignKey: 'ownerId',
//   as: 'owner'
// });

// TODO: Category ownership associations - disabled until schema is clarified
// User.hasMany(Room, {
//   foreignKey: 'categoryOwnerId',
//   as: 'categoryOwnedRooms'
// });

// Room.belongsTo(User, {
//   foreignKey: 'categoryOwnerId',
//   as: 'categoryOwner'
// });

// Admin approval associations
Room.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approvedByUser'
});

// Property associations
User.hasMany(Property, {
  foreignKey: 'ownerId',
  as: 'properties'
});

Property.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

Property.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approvedByUser'
});

Property.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

Category.hasMany(Property, {
  foreignKey: 'categoryId',
  as: 'properties'
});

// Property-Room relationship (Room.propertyId references Property.id)
Property.hasMany(Room, {
  foreignKey: 'propertyId',
  as: 'rooms'
});

Room.belongsTo(Property, {
  foreignKey: 'propertyId',
  as: 'property'
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

// Check-in/Check-out staff associations
User.hasMany(Booking, {
  foreignKey: 'checkedInBy',
  as: 'checkedInBookings'
});

Booking.belongsTo(User, {
  foreignKey: 'checkedInBy',
  as: 'checkedInByUser'
});

User.hasMany(Booking, {
  foreignKey: 'checkedOutBy',
  as: 'checkedOutBookings'
});

Booking.belongsTo(User, {
  foreignKey: 'checkedOutBy',
  as: 'checkedOutByUser'
});

// Bed assignment for booking
Booking.belongsTo(BedAssignment, {
  foreignKey: 'bedId',
  as: 'bed'
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

// RoomStatus associations
Room.hasMany(RoomStatus, {
  foreignKey: 'roomId',
  as: 'statusHistory',
  onDelete: 'CASCADE'
});

RoomStatus.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

User.hasMany(RoomStatus, {
  foreignKey: 'updatedBy',
  as: 'roomStatusUpdates'
});

RoomStatus.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updatedByUser'
});

// BedAssignment associations
Room.hasMany(BedAssignment, {
  foreignKey: 'roomId',
  as: 'beds',
  onDelete: 'CASCADE'
});

BedAssignment.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

Booking.hasMany(BedAssignment, {
  foreignKey: 'bookingId',
  as: 'assignedBeds'
});

BedAssignment.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

User.hasMany(BedAssignment, {
  foreignKey: 'occupantId',
  as: 'occupiedBeds'
});

BedAssignment.belongsTo(User, {
  foreignKey: 'occupantId',
  as: 'occupant'
});

// Payment associations
Booking.hasMany(Payment, {
  foreignKey: 'bookingId',
  as: 'payments',
  onDelete: 'CASCADE'
});

Payment.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

User.hasMany(Payment, {
  foreignKey: 'recordedBy',
  as: 'recordedPayments'
});

Payment.belongsTo(User, {
  foreignKey: 'recordedBy',
  as: 'recorder'
});

// PaymentSchedule associations
Booking.hasMany(PaymentSchedule, {
  foreignKey: 'bookingId',
  as: 'paymentSchedules',
  onDelete: 'CASCADE'
});

PaymentSchedule.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

BedAssignment.hasMany(PaymentSchedule, {
  foreignKey: 'bedId',
  as: 'paymentSchedules'
});

PaymentSchedule.belongsTo(BedAssignment, {
  foreignKey: 'bedId',
  as: 'bed'
});

Payment.hasMany(PaymentSchedule, {
  foreignKey: 'paymentId',
  as: 'schedules'
});

PaymentSchedule.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

// SecurityDeposit associations
Booking.hasOne(SecurityDeposit, {
  foreignKey: 'bookingId',
  as: 'securityDeposit',
  onDelete: 'CASCADE'
});

SecurityDeposit.belongsTo(Booking, {
  foreignKey: 'bookingId',
  as: 'booking'
});

User.hasMany(SecurityDeposit, {
  foreignKey: 'refundedBy',
  as: 'refundedDeposits'
});

SecurityDeposit.belongsTo(User, {
  foreignKey: 'refundedBy',
  as: 'refunder'
});

// MaintenanceRequest associations
Room.hasMany(MaintenanceRequest, {
  foreignKey: 'roomId',
  as: 'maintenanceRequests',
  onDelete: 'CASCADE'
});

MaintenanceRequest.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

User.hasMany(MaintenanceRequest, {
  foreignKey: 'reportedBy',
  as: 'reportedMaintenanceRequests'
});

MaintenanceRequest.belongsTo(User, {
  foreignKey: 'reportedBy',
  as: 'reporter'
});

User.hasMany(MaintenanceRequest, {
  foreignKey: 'assignedTo',
  as: 'assignedMaintenanceRequests'
});

MaintenanceRequest.belongsTo(User, {
  foreignKey: 'assignedTo',
  as: 'assignee'
});

// HousekeepingLog associations
Room.hasMany(HousekeepingLog, {
  foreignKey: 'roomId',
  as: 'housekeepingLogs',
  onDelete: 'CASCADE'
});

HousekeepingLog.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

User.hasMany(HousekeepingLog, {
  foreignKey: 'cleanedBy',
  as: 'cleaningLogs'
});

HousekeepingLog.belongsTo(User, {
  foreignKey: 'cleanedBy',
  as: 'cleaner'
});

// RoomCategory associations
User.hasMany(RoomCategory, {
  foreignKey: 'propertyId',
  as: 'roomCategories'
});

RoomCategory.belongsTo(User, {
  foreignKey: 'propertyId',
  as: 'propertyOwner'
});

// TODO: Custom category associations - disabled until schema is clarified
// Room.belongsTo(RoomCategory, {
//   foreignKey: 'customCategoryId',
//   as: 'customCategory'
// });

// RoomCategory.hasMany(Room, {
//   foreignKey: 'customCategoryId',
//   as: 'rooms'
// });

// ============================================
// Internal User Role Management Associations
// ============================================

// InternalRole associations - temporarily disabled to fix sync issues
// User.belongsTo(InternalRole, {
//   foreignKey: 'internalRole',
//   targetKey: 'name',
//   as: 'roleDetails'
// });

// InternalRole.hasMany(User, {
//   foreignKey: 'internalRole',
//   sourceKey: 'name',
//   as: 'users'
// });

InternalRole.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// Territory associations
Territory.belongsTo(User, {
  foreignKey: 'regionalManagerId',
  as: 'regionalManager'
});

User.hasMany(Territory, {
  foreignKey: 'regionalManagerId',
  as: 'managedTerritories'
});

User.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Territory.hasMany(User, {
  foreignKey: 'territoryId',
  as: 'agents'
});

// Manager-Agent relationship
User.belongsTo(User, {
  foreignKey: 'managerId',
  as: 'manager'
});

User.hasMany(User, {
  foreignKey: 'managerId',
  as: 'managedAgents'
});

// Lead associations
Lead.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Lead, {
  foreignKey: 'agentId',
  as: 'leads'
});

Lead.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Territory.hasMany(Lead, {
  foreignKey: 'territoryId',
  as: 'leads'
});

Lead.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

User.hasMany(Lead, {
  foreignKey: 'approvedBy',
  as: 'approvedLeads'
});

// LeadCommunication associations
LeadCommunication.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

Lead.hasMany(LeadCommunication, {
  foreignKey: 'leadId',
  as: 'communications'
});

LeadCommunication.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(LeadCommunication, {
  foreignKey: 'userId',
  as: 'leadCommunications'
});

// Commission associations
Commission.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Commission, {
  foreignKey: 'agentId',
  as: 'commissions'
});

Commission.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

Lead.hasOne(Commission, {
  foreignKey: 'leadId',
  as: 'commission'
});

// AgentTarget associations
AgentTarget.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(AgentTarget, {
  foreignKey: 'agentId',
  as: 'targets'
});

AgentTarget.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Territory.hasMany(AgentTarget, {
  foreignKey: 'territoryId',
  as: 'targets'
});

AgentTarget.belongsTo(User, {
  foreignKey: 'setBy',
  as: 'setter'
});

User.hasMany(AgentTarget, {
  foreignKey: 'setBy',
  as: 'setTargets'
});

// SupportTicket associations
SupportTicket.belongsTo(User, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

User.hasMany(SupportTicket, {
  foreignKey: 'propertyOwnerId',
  as: 'submittedTickets'
});

SupportTicket.belongsTo(User, {
  foreignKey: 'assignedTo',
  as: 'assignee'
});

User.hasMany(SupportTicket, {
  foreignKey: 'assignedTo',
  as: 'assignedTickets'
});

SupportTicket.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(SupportTicket, {
  foreignKey: 'createdBy',
  as: 'createdTickets'
});

SupportTicket.belongsTo(User, {
  foreignKey: 'resolvedBy',
  as: 'resolver'
});

User.hasMany(SupportTicket, {
  foreignKey: 'resolvedBy',
  as: 'resolvedTickets'
});

// TicketResponse associations
TicketResponse.belongsTo(SupportTicket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

SupportTicket.hasMany(TicketResponse, {
  foreignKey: 'ticketId',
  as: 'responses'
});

TicketResponse.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(TicketResponse, {
  foreignKey: 'userId',
  as: 'ticketResponses'
});

// PropertyDocument associations
PropertyDocument.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

Lead.hasMany(PropertyDocument, {
  foreignKey: 'leadId',
  as: 'documents'
});

PropertyDocument.belongsTo(User, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

User.hasMany(PropertyDocument, {
  foreignKey: 'propertyOwnerId',
  as: 'documents'
});

PropertyDocument.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

User.hasMany(PropertyDocument, {
  foreignKey: 'uploadedBy',
  as: 'uploadedDocuments'
});

PropertyDocument.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer'
});

User.hasMany(PropertyDocument, {
  foreignKey: 'reviewedBy',
  as: 'reviewedDocuments'
});

// AuditLog associations
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

// Announcement associations
Announcement.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Announcement, {
  foreignKey: 'createdBy',
  as: 'announcements'
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

// Alert associations
Alert.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'propertyOwner'
});

User.hasMany(Alert, {
  foreignKey: 'ownerId',
  as: 'propertyAlerts'
});

Alert.belongsTo(SupportTicket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

SupportTicket.hasMany(Alert, {
  foreignKey: 'ticketId',
  as: 'alerts'
});

Alert.belongsTo(User, {
  foreignKey: 'resolvedBy',
  as: 'resolver'
});

User.hasMany(Alert, {
  foreignKey: 'resolvedBy',
  as: 'resolvedAlerts'
});

// ============================================
// Subscription and Billing Associations
// ============================================

// Subscription associations
Subscription.belongsTo(User, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

User.hasMany(Subscription, {
  foreignKey: 'propertyOwnerId',
  as: 'subscriptions'
});

Subscription.belongsTo(Discount, {
  foreignKey: 'discountId',
  as: 'discount'
});

Discount.hasMany(Subscription, {
  foreignKey: 'discountId',
  as: 'subscriptions'
});

Subscription.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Subscription, {
  foreignKey: 'createdBy',
  as: 'createdSubscriptions'
});

Subscription.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater'
});

User.hasMany(Subscription, {
  foreignKey: 'updatedBy',
  as: 'updatedSubscriptions'
});

// Discount associations
Discount.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Discount, {
  foreignKey: 'createdBy',
  as: 'createdDiscounts'
});

// BillingHistory associations
BillingHistory.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription'
});

Subscription.hasMany(BillingHistory, {
  foreignKey: 'subscriptionId',
  as: 'billingHistory'
});

BillingHistory.belongsTo(User, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

User.hasMany(BillingHistory, {
  foreignKey: 'propertyOwnerId',
  as: 'billingHistory'
});

BillingHistory.belongsTo(User, {
  foreignKey: 'processedBy',
  as: 'processor'
});

User.hasMany(BillingHistory, {
  foreignKey: 'processedBy',
  as: 'processedBillingHistory'
});

// ============================================
// API Key Associations
// ============================================

// APIKey associations
APIKey.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(APIKey, {
  foreignKey: 'createdBy',
  as: 'createdAPIKeys'
});

APIKey.belongsTo(User, {
  foreignKey: 'revokedBy',
  as: 'revoker'
});

User.hasMany(APIKey, {
  foreignKey: 'revokedBy',
  as: 'revokedAPIKeys'
});

// APIKeyUsage associations
APIKeyUsage.belongsTo(APIKey, {
  foreignKey: 'apiKeyId',
  as: 'apiKey'
});

APIKey.hasMany(APIKeyUsage, {
  foreignKey: 'apiKeyId',
  as: 'usageLogs'
});

// ============================================
// PropertyAssignment Associations
// ============================================

// PropertyAssignment to User (the assigned user)
PropertyAssignment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(PropertyAssignment, {
  foreignKey: 'userId',
  as: 'propertyAssignments'
});

// PropertyAssignment to Room (the property)
PropertyAssignment.belongsTo(Room, {
  foreignKey: 'propertyId',
  as: 'property'
});

Room.hasMany(PropertyAssignment, {
  foreignKey: 'propertyId',
  as: 'assignments'
});

// PropertyAssignment to User (who assigned)
PropertyAssignment.belongsTo(User, {
  foreignKey: 'assignedBy',
  as: 'assigner'
});

User.hasMany(PropertyAssignment, {
  foreignKey: 'assignedBy',
  as: 'assignmentsMade'
});

// ============================================
// Property Staff Assignment Associations
// ============================================

// User to Room (assigned property for property staff)
User.belongsTo(Room, {
  foreignKey: 'assignedPropertyId',
  as: 'assignedProperty'
});

Room.hasMany(User, {
  foreignKey: 'assignedPropertyId',
  as: 'assignedStaff'
});

const ensureSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const userTable = await queryInterface.describeTable('users');

    const addColumnIfMissing = async (columnName, definition, successMessage) => {
      if (userTable[columnName]) {
        return;
      }
      try {
        await queryInterface.addColumn('users', columnName, definition);
        userTable[columnName] = definition;
        if (successMessage) {
          console.log(successMessage);
        }
      } catch (error) {
        if (error?.original?.code === '42701') {
          console.log(`ℹ️ Column ${columnName} already exists, skipping add.`);
        } else {
          throw error;
        }
      }
    };

    await addColumnIfMissing('firebase_uid', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }, '✅ Added missing firebase_uid column to users table');

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

    await addColumnIfMissing('dob', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    }, '✅ Added missing dob column to users table');

    await addColumnIfMissing('location', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing location column to users table');

    await addColumnIfMissing('address', {
      type: DataTypes.TEXT,
      allowNull: true,
    }, '✅ Added missing address column to users table');

    await addColumnIfMissing('country', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing country column to users table');

    await addColumnIfMissing('state', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing state column to users table');

    await addColumnIfMissing('city', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing city column to users table');

    await addColumnIfMissing('landmark', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing landmark column to users table');

    await addColumnIfMissing('pincode', {
      type: DataTypes.STRING,
      allowNull: true,
    }, '✅ Added missing pincode column to users table');

    // Internal User Role Management fields
    await addColumnIfMissing('internalRole', {
      type: DataTypes.STRING,
      allowNull: true
    }, '✅ Added missing internalRole column to users table');

    await addColumnIfMissing('internalPermissions', {
      type: DataTypes.JSONB,
      allowNull: true
    }, '✅ Added missing internalPermissions column to users table');

    await addColumnIfMissing('territoryId', {
      type: DataTypes.UUID,
      allowNull: true
    }, '✅ Added missing territoryId column to users table');

    await addColumnIfMissing('managerId', {
      type: DataTypes.UUID,
      allowNull: true
    }, '✅ Added missing managerId column to users table');

    await addColumnIfMissing('commissionRate', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    }, '✅ Added missing commissionRate column to users table');

    if (!userTable['isActive']) {
      await addColumnIfMissing('isActive', {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      }, '✅ Added missing isActive column to users table');
    }

    await addColumnIfMissing('lastLoginAt', {
      type: DataTypes.DATE,
      allowNull: true
    }, '✅ Added missing lastLoginAt column to users table');
  } catch (error) {
    if (error?.message?.includes('does not exist')) {
      console.warn('⚠️ users table not found during schema check, skipping firebase_uid column ensure step');
    } else {
      throw error;
    }
  }
};

// Sync database - alter: false prevents modifying existing tables
const syncDatabase = async (force = false) => {
  try {
    console.log('🔄 Starting database synchronization...');
    
    // Drop foreign key constraint temporarily
    try {
      await sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_internal_role_fkey', { raw: true });
      console.log('🔧 Temporarily dropped internal_role foreign key constraint');
    } catch (error) {
      console.log('ℹ️ Foreign key constraint may not exist yet');
    }
    
    await ensureSchema();
    
    // Sync database
    await sequelize.sync({ force, alter: false });
    
    // Ensure required internal roles exist
    await ensureInternalRoles();
    
    // Recreate foreign key constraint
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_internal_role_fkey 
        FOREIGN KEY (internal_role) 
        REFERENCES internal_roles(name) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `, { raw: true });
      console.log('🔧 Recreated internal_role foreign key constraint');
    } catch (error) {
      console.log('⚠️ Could not recreate foreign key constraint:', error.message);
    }
    
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

// Ensure required internal roles exist
const ensureInternalRoles = async () => {
  try {
    // Check if internal_roles table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'internal_roles'
      );
    `);
    
    if (!results[0].exists) {
      console.log('ℹ️ internal_roles table does not exist yet, skipping role creation');
      return;
    }
    
    const InternalRole = require('./InternalRole');
    
    const requiredRoles = [
      {
        name: 'superuser',
        displayName: 'Super User',
        description: 'Full system access',
        permissions: {
          canManageBookings: true,
          canCheckIn: true,
          canCheckOut: true,
          canRecordPayments: true,
          canManageRooms: true,
          canViewReports: true,
          canManageUsers: true,
          canManageProperties: true
        }
      },
      {
        name: 'platform_admin',
        displayName: 'Platform Admin',
        description: 'Platform administration access',
        permissions: {
          canManageBookings: true,
          canCheckIn: true,
          canCheckOut: true,
          canRecordPayments: true,
          canManageRooms: true,
          canViewReports: true,
          canManageUsers: true,
          canManageProperties: true
        }
      },
      {
        name: 'operations_manager',
        displayName: 'Operations Manager',
        description: 'Operations management access',
        permissions: {
          canManageBookings: true,
          canCheckIn: true,
          canCheckOut: true,
          canRecordPayments: true,
          canManageRooms: true,
          canViewReports: true
        }
      },
      {
        name: 'regional_manager',
        displayName: 'Regional Manager',
        description: 'Regional management access',
        permissions: {
          canManageBookings: true,
          canCheckIn: true,
          canCheckOut: true,
          canRecordPayments: true,
          canManageRooms: true,
          canViewReports: true
        }
      },
      {
        name: 'agent',
        displayName: 'Agent',
        description: 'Sales and support agent',
        permissions: {
          canManageBookings: true,
          canCheckIn: true,
          canCheckOut: true
        }
      }
    ];
    
    for (const roleData of requiredRoles) {
      const [role, created] = await InternalRole.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });
      
      if (created) {
        console.log(`✅ Created internal role: ${roleData.name}`);
      }
    }
    
    console.log('✅ Internal roles ensured');
  } catch (error) {
    console.error('❌ Failed to ensure internal roles:', error);
    // Don't throw - this is not critical for basic functionality
  }
};

module.exports = {
  sequelize,
  User,
  Room,
  RoomType,
  Booking,
  Category,
  RoomStatus,
  BedAssignment,
  Payment,
  PaymentSchedule,
  SecurityDeposit,
  MaintenanceRequest,
  HousekeepingLog,
  RoomCategory,
  Property,
  // Internal User Role Management models
  InternalRole,
  Lead,
  LeadCommunication,
  Commission,
  Territory,
  AgentTarget,
  SupportTicket,
  TicketResponse,
  PropertyDocument,
  AuditLog,
  Announcement,
  Notification,
  Alert,
  Subscription,
  Discount,
  BillingHistory,
  APIKey,
  APIKeyUsage,
  PropertyAssignment,
  syncDatabase
};

