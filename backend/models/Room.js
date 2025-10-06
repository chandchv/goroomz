const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [20, 1000],
      notEmpty: true
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      notNull: true
    }
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  roomType: {
    type: DataTypes.ENUM('Private Room', 'Shared Room', 'Entire Place', 'Studio'),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('PG', 'Hotel Room', 'Independent Home', 'Home Stay'),
    allowNull: false
  },
  maxGuests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
      notNull: true
    }
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidAmenities(value) {
        const validAmenities = [
          'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 
          'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
          'refrigerator', 'microwave', 'iron', 'heater', 'cctv'
        ];
        if (value && !value.every(amenity => validAmenities.includes(amenity))) {
          throw new Error('Invalid amenity provided');
        }
      }
    }
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
    }
  },
  rules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidRules(value) {
        if (value && value.some(rule => rule.length > 200)) {
          throw new Error('Rules cannot be more than 200 characters');
        }
      }
    }
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
    }
  },
  availability: {
    type: DataTypes.JSONB,
    defaultValue: {
      isAvailable: true,
      availableFrom: null,
      availableUntil: null
    }
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'rooms',
  indexes: [
    {
      fields: ['title', 'description', 'location']
    },
    {
      fields: ['category', 'room_type', 'price', 'location']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['is_active']
    }
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