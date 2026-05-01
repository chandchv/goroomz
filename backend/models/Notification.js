const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Notification model for storing all system notifications
 * Supports multi-channel delivery (email, SMS, in-app, push)
 */
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Target user for this notification'
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
    allowNull: false,
    comment: 'Type of notification'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Notification title'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification message body'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Notification priority level'
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'read', 'dismissed', 'failed'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the notification'
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['in_app'],
    allowNull: true,
    field: 'delivery_method',
    comment: 'Delivery method: array of email, sms, in_app, push'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: false,
    comment: 'Event-specific data (booking ID, claim ID, etc.)'
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'For scheduled notifications - when to send'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notification was sent'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notification was read'
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notification was dismissed'
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
    comment: 'Whether email was sent'
  },
  smsSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
    comment: 'Whether SMS was sent'
  }
}, {
  tableName: 'notifications',
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
      name: 'notifications_user_id_idx'
    },
    {
      fields: ['type'],
      name: 'notifications_type_idx'
    },
    {
      fields: ['status'],
      name: 'notifications_status_idx'
    },
    {
      fields: ['created_at'],
      name: 'notifications_created_at_idx'
    },
    {
      fields: ['user_id', 'status'],
      name: 'notifications_user_status_idx'
    },
    {
      fields: ['scheduled_for'],
      name: 'notifications_scheduled_for_idx'
    },
    {
      fields: ['priority'],
      name: 'notifications_priority_idx'
    }
  ]
});

// Instance methods

/**
 * Mark notification as read
 */
Notification.prototype.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  return await this.save();
};

/**
 * Mark notification as dismissed
 */
Notification.prototype.dismiss = async function() {
  this.status = 'dismissed';
  return await this.save();
};

/**
 * Update delivery status for a specific channel
 */
Notification.prototype.updateDeliveryStatus = async function(channel, status, error = null) {
  if (channel === 'email') this.emailSent = (status === 'sent');
  if (channel === 'sms') this.smsSent = (status === 'sent');
  return await this.save();
};

/**
 * Increment retry count (no-op since column doesn't exist)
 */
Notification.prototype.incrementRetry = async function() {
  return this;
};

/**
 * Check if notification can be retried
 */
Notification.prototype.canRetry = function() {
  return this.status === 'failed';
};

/**
 * Check if notification is unread
 */
Notification.prototype.isUnread = function() {
  return this.status === 'pending' || this.status === 'sent';
};

module.exports = Notification;
