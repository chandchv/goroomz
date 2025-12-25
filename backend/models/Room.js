const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // Essential room fields (added by migration 20251127100000)
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [5, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 2000]
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  maxGuests: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 20
    }
  },
  category: {
    type: DataTypes.ENUM('PG', 'Hotel Room', 'Independent Home', 'Home Stay'),
    allowNull: true
  },
  roomType: {
    type: DataTypes.ENUM('Private Room', 'Shared Room', 'Entire Place', 'Studio', 'Hotel Room', 'PG'),
    allowNull: true
  },
  pricingType: {
    type: DataTypes.ENUM('daily', 'monthly'),
    allowNull: true
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  rules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved',
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'properties',
      key: 'id'
    },
    comment: 'For rooms that belong to a property.'
  },
  // Internal Management System fields (added by migration 20251126000001)
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 20]
    }
  },
  sharingType: {
    type: DataTypes.ENUM('single', '2_sharing', '3_sharing', 'quad', 'dormitory'),
    allowNull: true
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  currentStatus: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
    allowNull: true,
    defaultValue: 'vacant_clean'
  },
  lastCleanedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastMaintenanceAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional room-specific metadata (pgOptions, hotelRoomTypes, etc.)'
  }
}, {
  tableName: 'rooms',
  timestamps: true,
  underscored: true,
  indexes: [
    // Note: Indexes are managed via migrations to avoid sync conflicts
    // See migration 20251126000000-add-property-id-to-rooms.js
  ]
});

// Instance methods
Room.prototype.getPrimaryImage = function() {
  const primaryImg = this.images?.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images?.[0] ? this.images[0].url : null);
};

Room.prototype.updateRating = function() {
  // This would typically be called when reviews are added/updated
  // For now, we'll keep it simple
};

module.exports = Room;