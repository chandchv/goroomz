const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
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
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
    comment: 'Action performed, e.g., create_lead, approve_onboarding, update_commission'
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    },
    comment: 'Type of resource affected, e.g., lead, property, user, commission'
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the affected resource'
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Before and after values for the change',
    validate: {
      isValidChanges(value) {
        if (!value) return;
        if (typeof value !== 'object') {
          throw new Error('Changes must be an object');
        }
        // Optionally validate that it has 'before' and 'after' keys
        if (value.before !== undefined && typeof value.before !== 'object') {
          throw new Error('Changes.before must be an object');
        }
        if (value.after !== undefined && typeof value.after !== 'object') {
          throw new Error('Changes.after must be an object');
        }
      }
    }
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIP: true
    }
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isCritical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Flag for critical actions requiring review'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Audit logs should not be updated
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['resource_type']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_critical']
    },
    {
      fields: ['resource_type', 'resource_id']
    }
  ]
});

module.exports = AuditLog;
