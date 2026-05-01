const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingSync = sequelize.define('BookingSync', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Reference Information
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'property_owners',
      key: 'id'
    }
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  
  // Sync Status
  syncStatus: {
    type: DataTypes.ENUM('pending', 'synced', 'failed', 'partial'),
    defaultValue: 'pending',
    allowNull: false
  },
  syncType: {
    type: DataTypes.ENUM(
      'booking_created', 'booking_updated', 'booking_cancelled',
      'payment_updated', 'status_changed', 'guest_details_updated'
    ),
    allowNull: false
  },
  
  // Sync Tracking
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 10
    }
  },
  maxSyncAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false,
    validate: {
      min: 1,
      max: 20
    }
  },
  
  // Data Synchronization
  frontendData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Booking data from frontend system'
  },
  backendData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Booking data from backend system'
  },
  propertyManagementData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Booking data from property management system'
  },
  
  // Conflict Resolution
  hasConflicts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  conflicts: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Details of data conflicts between systems'
  },
  conflictResolution: {
    type: DataTypes.ENUM('frontend_priority', 'backend_priority', 'property_management_priority', 'manual_review'),
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Notification Tracking
  ownerNotified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  ownerNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  guestNotified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  guestNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  internalNotified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  internalNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Error Handling
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  errorDetails: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Detailed error information for debugging'
  },
  lastErrorAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // External System Integration
  externalBookingId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Booking ID in external property management system'
  },
  externalSystemStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Status in external property management system'
  },
  externalSystemResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Last response from external system'
  },
  
  // Availability Sync
  availabilityUpdated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  availabilityUpdateAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  calendarSynced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  calendarSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Real-time Updates
  realTimeEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  websocketNotified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  websocketNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Audit and Compliance
  dataChanges: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Log of all data changes during sync'
  },
  complianceChecked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  complianceStatus: {
    type: DataTypes.ENUM('compliant', 'non_compliant', 'needs_review'),
    allowNull: true
  },
  complianceNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Performance Metrics
  syncDurationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken for sync operation in milliseconds'
  },
  dataSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Size of synced data in bytes'
  },
  
  // Priority and Scheduling
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  scheduledSync: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'booking_syncs',
  indexes: [
    {
      fields: ['bookingId']
    },
    {
      fields: ['propertyOwnerId', 'syncStatus']
    },
    {
      fields: ['roomId', 'syncStatus']
    },
    {
      fields: ['syncStatus', 'nextSyncAt']
    },
    {
      fields: ['syncType', 'createdAt']
    },
    {
      fields: ['hasConflicts', 'conflictResolution']
    },
    {
      fields: ['priority', 'scheduledAt']
    },
    {
      fields: ['externalBookingId']
    },
    {
      fields: ['lastSyncAt', 'syncStatus']
    }
  ],
  hooks: {
    beforeCreate: async (bookingSync) => {
      // Set initial sync attempt
      if (bookingSync.syncStatus === 'pending') {
        bookingSync.nextSyncAt = new Date();
      }
    },
    beforeUpdate: async (bookingSync) => {
      // Update timestamps based on status changes
      if (bookingSync.changed('syncStatus')) {
        const now = new Date();
        if (bookingSync.syncStatus === 'synced') {
          bookingSync.lastSyncAt = now;
          bookingSync.nextSyncAt = null;
        } else if (bookingSync.syncStatus === 'failed') {
          bookingSync.lastErrorAt = now;
          // Schedule retry with exponential backoff
          if (bookingSync.syncAttempts < bookingSync.maxSyncAttempts) {
            const delayMinutes = 5 * Math.pow(2, bookingSync.syncAttempts);
            bookingSync.nextSyncAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
          }
        }
      }
    }
  }
});

// Instance methods
BookingSync.prototype.canRetrySync = function() {
  return this.syncStatus === 'failed' && 
         this.syncAttempts < this.maxSyncAttempts && 
         (!this.nextSyncAt || new Date() >= new Date(this.nextSyncAt));
};

BookingSync.prototype.incrementSyncAttempt = function() {
  this.syncAttempts += 1;
  if (this.syncAttempts >= this.maxSyncAttempts) {
    this.syncStatus = 'failed';
    this.nextSyncAt = null;
  } else {
    // Exponential backoff
    const delayMinutes = 5 * Math.pow(2, this.syncAttempts - 1);
    this.nextSyncAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }
};

BookingSync.prototype.detectConflicts = function() {
  const conflicts = [];
  
  if (this.frontendData && this.backendData) {
    // Compare key fields for conflicts
    const keyFields = ['checkIn', 'checkOut', 'guests', 'totalAmount', 'status'];
    
    keyFields.forEach(field => {
      if (this.frontendData[field] !== this.backendData[field]) {
        conflicts.push({
          field,
          frontendValue: this.frontendData[field],
          backendValue: this.backendData[field],
          detectedAt: new Date()
        });
      }
    });
  }
  
  if (conflicts.length > 0) {
    this.hasConflicts = true;
    this.conflicts = conflicts;
  }
  
  return conflicts;
};

BookingSync.prototype.resolveConflicts = function(resolution, resolvedBy) {
  if (!this.hasConflicts) return;
  
  this.conflictResolution = resolution;
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.hasConflicts = false;
  
  // Apply resolution logic based on priority
  switch (resolution) {
    case 'backend_priority':
      this.frontendData = { ...this.backendData };
      break;
    case 'frontend_priority':
      this.backendData = { ...this.frontendData };
      break;
    case 'property_management_priority':
      if (this.propertyManagementData) {
        this.frontendData = { ...this.propertyManagementData };
        this.backendData = { ...this.propertyManagementData };
      }
      break;
  }
};

BookingSync.prototype.isOverdue = function() {
  if (!this.nextSyncAt) return false;
  return new Date() > new Date(this.nextSyncAt) && this.syncStatus === 'pending';
};

BookingSync.prototype.getTimeSinceLastSync = function() {
  if (!this.lastSyncAt) return null;
  return Math.ceil((new Date() - new Date(this.lastSyncAt)) / (1000 * 60)); // minutes
};

module.exports = BookingSync;