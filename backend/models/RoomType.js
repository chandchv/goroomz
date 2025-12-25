const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomType = sequelize.define('RoomType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
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
    defaultValue: {}
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
    validate: {
      min: 0
    }
  },
  availableBeds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  roomSize: {
    type: DataTypes.INTEGER,
    allowNull: true
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
    defaultValue: false
  },
  gender: {
    type: DataTypes.ENUM('mixed', 'male', 'female'),
    allowNull: true
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
    allowNull: true
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialOffers: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'room_types',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['property_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_dormitory']
    }
  ]
});

module.exports = RoomType;

