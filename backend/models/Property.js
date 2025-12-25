const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 2000]
    }
  },
  type: {
    type: DataTypes.ENUM('hotel', 'pg', 'hostel', 'homestay', 'apartment'),
    allowNull: false,
    comment: 'Type of property'
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    },
    comment: 'Category this property belongs to (e.g., Budget Hotels, Luxury PGs)'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Property owner user ID'
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidLocation(value) {
        if (!value.address || !value.city || !value.state) {
          throw new Error('Location must include address, city, and state');
        }
      }
    },
    comment: 'Full address with coordinates: {address, city, state, country, pincode, latitude, longitude}'
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Contact information: {phone, email, website}'
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidAmenities(value) {
        const validAmenities = [
          'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 
          'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
          'refrigerator', 'microwave', 'iron', 'heater', 'cctv',
          'elevator', 'power-backup', 'water-supply', 'housekeeping'
        ];
        if (value && !value.every(amenity => validAmenities.includes(amenity))) {
          throw new Error('Invalid amenity provided');
        }
      }
    },
    comment: 'Property-level amenities available to all guests'
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
    comment: 'Property images with URLs and metadata'
  },
  rules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidRules(value) {
        if (value && value.some(rule => rule.length > 300)) {
          throw new Error('Rules cannot be more than 300 characters');
        }
      }
    },
    comment: 'Property rules and policies'
  },
  totalFloors: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 100
    },
    comment: 'Total number of floors in the property'
  },
  totalRooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total number of rooms (calculated from Room records)'
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '12:00:00',
    comment: 'Standard check-in time'
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '11:00:00',
    comment: 'Standard check-out time'
  },
  rating: {
    type: DataTypes.JSONB,
    defaultValue: {
      average: 0,
      count: 0
    },
    validate: {
      isValidRating(value) {
        if (value.average < 0 || value.average > 5) {
          throw new Error('Rating average must be between 0 and 5');
        }
        if (value.count < 0) {
          throw new Error('Rating count cannot be negative');
        }
      }
    },
    comment: 'Property rating aggregated from reviews'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether property is active and accepting bookings'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether property is featured on platform'
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Property approval status by platform admin'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When property was approved'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin user who approved the property'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for rejection if status is rejected'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional property-specific metadata'
  }
}, {
  tableName: 'properties',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['type']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['approval_status']
    },
    {
      fields: ['location'],
      using: 'gin'
    }
  ]
});

// Instance methods
Property.prototype.getPrimaryImage = function() {
  const primaryImg = this.images?.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images?.[0] ? this.images[0].url : null);
};

Property.prototype.calculateOccupancy = async function() {
  const Room = require('./Room');
  const rooms = await Room.findAll({
    where: { propertyId: this.id }
  });
  
  if (rooms.length === 0) return 0;
  
  const occupiedRooms = rooms.filter(r => r.currentStatus === 'occupied').length;
  return (occupiedRooms / rooms.length) * 100;
};

module.exports = Property;
