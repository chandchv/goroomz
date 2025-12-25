const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Territory = sequelize.define('Territory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  regionalManagerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  boundaries: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'GeoJSON format for territory boundaries',
    validate: {
      isValidGeoJSON(value) {
        if (!value) return;
        
        if (value.type && value.coordinates) {
          // Basic GeoJSON validation
          if (!['Polygon', 'MultiPolygon', 'Point'].includes(value.type)) {
            throw new Error('GeoJSON type must be Polygon, MultiPolygon, or Point');
          }
          if (!Array.isArray(value.coordinates)) {
            throw new Error('GeoJSON coordinates must be an array');
          }
        }
      }
    }
  },
  cities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  states: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'territories',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['regional_manager_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = Territory;
