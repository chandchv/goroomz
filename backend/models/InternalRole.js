const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InternalRole = sequelize.define('InternalRole', {
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
      len: [2, 50]
    }
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  defaultPermissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    validate: {
      isValidPermissions(value) {
        const requiredKeys = [
          'canOnboardProperties',
          'canApproveOnboardings',
          'canManageAgents',
          'canAccessAllProperties',
          'canManageSystemSettings',
          'canViewAuditLogs',
          'canManageCommissions',
          'canManageTerritories',
          'canManageTickets',
          'canBroadcastAnnouncements'
        ];
        
        for (const key of requiredKeys) {
          if (typeof value[key] !== 'boolean') {
            throw new Error(`Permission ${key} must be a boolean value`);
          }
        }
      }
    }
  },
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'internal_roles',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['name'],
      unique: true
    },
    {
      fields: ['is_custom']
    },
    {
      fields: ['created_by']
    }
  ]
});

module.exports = InternalRole;
