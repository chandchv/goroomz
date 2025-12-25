const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyStaff = sequelize.define('PropertyStaff', {
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
    comment: 'Property where staff member works'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Staff member user ID'
  },
  role: {
    type: DataTypes.ENUM(
      'manager',
      'receptionist',
      'housekeeping',
      'maintenance',
      'security',
      'cook',
      'accountant',
      'other'
    ),
    allowNull: false,
    comment: 'Staff role at the property'
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Staff permissions for property operations: {canCheckIn, canCheckOut, canManageRooms, canViewReports, etc.}'
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Monthly salary (optional)'
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When staff member joined this property'
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When staff member left (NULL if still active)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether staff member is currently active'
  },
  workSchedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Work schedule: {days: ["monday", "tuesday"], shifts: [{start: "09:00", end: "17:00"}]}'
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Emergency contact and additional info'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes about staff member'
  }
}, {
  tableName: 'property_staff',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['property_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['property_id', 'user_id'],
      unique: true,
      name: 'unique_staff_per_property'
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = PropertyStaff;
