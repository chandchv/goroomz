const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyAssignment = sequelize.define('PropertyAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  assignmentType: {
    type: DataTypes.ENUM('agent', 'staff', 'manager'),
    allowNull: false,
    validate: {
      isIn: [['agent', 'staff', 'manager']]
    }
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  assignedBy: {
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
  }
}, {
  tableName: 'property_assignments',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['property_id']
    },
    {
      fields: ['assignment_type']
    },
    {
      fields: ['is_active']
    },
    {
      // Composite index for common queries
      fields: ['user_id', 'property_id', 'is_active']
    },
    {
      // Composite index for filtering by type and status
      fields: ['assignment_type', 'is_active']
    }
  ]
});

module.exports = PropertyAssignment;
