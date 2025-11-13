const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 50],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  roomTypes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidRoomTypes(value) {
        const validRoomTypes = ['Private Room', 'Shared Room', 'Entire Place', 'Studio'];
        if (value && !value.every(type => validRoomTypes.includes(type))) {
          throw new Error('Invalid room type provided');
        }
      }
    }
  },
  defaultAmenities: {
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
  }
}, {
  tableName: 'categories',
  indexes: [
    {
      fields: ['sort_order', 'name']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Category;