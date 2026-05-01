const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Staff = sequelize.define('Staff', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'property_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'joined_at'
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'left_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
    field: 'is_active'
  },
  workSchedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'work_schedule'
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'contact_info'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'property_staff',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Staff;
