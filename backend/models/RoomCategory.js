const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomCategory = sequelize.define('RoomCategory', {
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
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'room_categories',
  indexes: [
    {
      fields: ['property_id']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      fields: ['property_id', 'name']
    }
  ]
});

module.exports = RoomCategory;
