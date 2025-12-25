const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  type: {
    type: DataTypes.ENUM(
      'alert', 
      'lead_assignment', 
      'approval_request', 
      'commission_payment', 
      'ticket_assignment',
      'system_announcement',
      'announcement',
      'reminder'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('unread', 'read', 'dismissed'),
    allowNull: false,
    defaultValue: 'unread'
  },
  deliveryMethod: {
    type: DataTypes.ARRAY(DataTypes.ENUM('in_app', 'email', 'sms')),
    allowNull: false,
    defaultValue: ['in_app']
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data like propertyId, leadId, ticketId, etc.'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'For scheduled notifications/reminders'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  smsSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['scheduled_for']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Notification;