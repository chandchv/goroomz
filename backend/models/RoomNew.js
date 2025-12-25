const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomNew = sequelize.define('RoomNew', {
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
      model: 'properties',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Property this room belongs to'
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 20],
      notEmpty: true
    },
    comment: 'Room number (e.g., 101, 102, 201)'
  },
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Floor number where room is located'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    },
    comment: 'Optional room name (e.g., "Deluxe Suite", "Garden View")'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Room description and features'
  },
  roomType: {
    type: DataTypes.ENUM('standard', 'deluxe', 'suite', 'dormitory', 'private', 'shared'),
    allowNull: false,
    defaultValue: 'standard',
    comment: 'Type/category of room'
  },
  sharingType: {
    type: DataTypes.ENUM('single', 'double', 'triple', 'quad', 'dormitory'),
    allowNull: false,
    defaultValue: 'single',
    comment: 'Sharing configuration'
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 20
    },
    comment: 'Total number of beds in the room'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Base price per bed/room per day'
  },
  pricingType: {
    type: DataTypes.ENUM('per_bed', 'per_room', 'per_night', 'per_month'),
    allowNull: false,
    defaultValue: 'per_bed',
    comment: 'How pricing is calculated'
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidAmenities(value) {
        const validAmenities = [
          'wifi', 'ac', 'tv', 'attached-bathroom', 'balcony', 
          'window', 'wardrobe', 'study-table', 'chair', 'fan',
          'geyser', 'refrigerator', 'microwave', 'kettle'
        ];
        if (value && !value.every(amenity => validAmenities.includes(amenity))) {
          throw new Error('Invalid amenity provided');
        }
      }
    },
    comment: 'Room-specific amenities'
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidImages(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Images must be an array');
        }
        if (value) {
          value.forEach(image => {
            if (!image.url || typeof image.url !== 'string') {
              throw new Error('Each image must have a valid URL');
            }
          });
        }
      }
    },
    comment: 'Room images'
  },
  currentStatus: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty', 'maintenance', 'blocked'),
    allowNull: false,
    defaultValue: 'vacant_clean',
    comment: 'Current operational status of the room'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether room is active and bookable'
  },
  lastCleanedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last cleaning timestamp'
  },
  lastMaintenanceAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last maintenance timestamp'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes about the room'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional room-specific metadata'
  }
}, {
  tableName: 'rooms_new',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['property_id']
    },
    {
      fields: ['property_id', 'room_number'],
      unique: true,
      name: 'unique_room_number_per_property'
    },
    {
      fields: ['property_id', 'floor_number']
    },
    {
      fields: ['current_status']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['sharing_type']
    }
  ]
});

// Instance methods
RoomNew.prototype.getPrimaryImage = function() {
  const primaryImg = this.images?.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images?.[0] ? this.images[0].url : null);
};

RoomNew.prototype.getOccupiedBeds = async function() {
  const BedAssignment = require('./BedAssignment');
  const occupied = await BedAssignment.count({
    where: {
      roomId: this.id,
      status: 'occupied'
    }
  });
  return occupied;
};

RoomNew.prototype.getAvailableBeds = async function() {
  const occupied = await this.getOccupiedBeds();
  return this.totalBeds - occupied;
};

module.exports = RoomNew;
