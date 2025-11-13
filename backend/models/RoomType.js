const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomType = sequelize.define('RoomType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bedConfiguration: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'e.g., { "single": 1, "bunk": 2, "double": 0 }'
  },
  maxOccupancy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 20
    }
  },
  pricePerNight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  pricePerBed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'For dormitory-style rooms where guests book individual beds',
    validate: {
      min: 0
    }
  },
  totalRooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  availableRooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total number of beds in this room type (for dormitories)',
    validate: {
      min: 0
    }
  },
  availableBeds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Available beds (for dormitories)',
    validate: {
      min: 0
    }
  },
  roomSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Room size in square feet'
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDormitory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if this is a shared dormitory room'
  },
  gender: {
    type: DataTypes.ENUM('mixed', 'male', 'female'),
    allowNull: true,
    comment: 'For dormitory rooms - gender restriction'
  },
  smokingAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  petsAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasAttachedBathroom: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  hasAC: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasBalcony: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  floor: {
    type: DataTypes.STRING,
    allowNull: true
  },
  viewType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., "Garden View", "City View", "Sea View"'
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialOffers: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Special offers and discounts'
  }
}, {
  tableName: 'room_types',
  underscored: true,
  timestamps: true
});

module.exports = RoomType;

