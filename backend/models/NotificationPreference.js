const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * NotificationPreference model for storing user notification preferences
 * Allows per-channel and per-type configuration
 */
const NotificationPreference = sequelize.define('NotificationPreference', {
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
    comment: 'User who owns these preferences'
  },
  notificationType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Notification type this preference applies to, or "default" for global settings'
  },
  emailEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether email notifications are enabled for this type'
  },
  smsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether SMS notifications are enabled for this type'
  },
  inAppEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether in-app notifications are enabled for this type'
  },
  pushEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether push notifications are enabled for this type'
  },
  digestMode: {
    type: DataTypes.ENUM('immediate', 'daily', 'weekly'),
    defaultValue: 'immediate',
    allowNull: false,
    comment: 'Delivery mode: immediate, daily digest, or weekly digest'
  },
  quietHoursStart: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Start of quiet hours (e.g., 22:00)'
  },
  quietHoursEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'End of quiet hours (e.g., 08:00)'
  },
  language: {
    type: DataTypes.ENUM('en', 'hi'),
    defaultValue: 'en',
    allowNull: false,
    comment: 'Preferred language for notifications'
  }
}, {
  tableName: 'notification_preferences',
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
      name: 'notification_preferences_user_id_idx'
    },
    {
      fields: ['user_id', 'notification_type'],
      unique: true,
      name: 'notification_preferences_user_type_unique'
    }
  ]
});

// Instance methods

/**
 * Check if a specific channel is enabled
 */
NotificationPreference.prototype.isChannelEnabled = function(channel) {
  switch (channel) {
    case 'email':
      return this.emailEnabled;
    case 'sms':
      return this.smsEnabled;
    case 'in_app':
      return this.inAppEnabled;
    case 'push':
      return this.pushEnabled;
    default:
      return false;
  }
};

/**
 * Get enabled channels as array
 */
NotificationPreference.prototype.getEnabledChannels = function() {
  const channels = [];
  if (this.emailEnabled) channels.push('email');
  if (this.smsEnabled) channels.push('sms');
  if (this.inAppEnabled) channels.push('in_app');
  if (this.pushEnabled) channels.push('push');
  return channels;
};

/**
 * Check if current time is within quiet hours
 */
NotificationPreference.prototype.isQuietHours = function(currentTime = new Date()) {
  if (!this.quietHoursStart || !this.quietHoursEnd) {
    return false;
  }

  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

  const start = this.quietHoursStart;
  const end = this.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTimeStr >= start || currentTimeStr < end;
  }
  
  // Same day quiet hours (e.g., 14:00 to 16:00)
  return currentTimeStr >= start && currentTimeStr < end;
};

/**
 * Update channel preference
 */
NotificationPreference.prototype.setChannelEnabled = async function(channel, enabled) {
  switch (channel) {
    case 'email':
      this.emailEnabled = enabled;
      break;
    case 'sms':
      this.smsEnabled = enabled;
      break;
    case 'in_app':
      this.inAppEnabled = enabled;
      break;
    case 'push':
      this.pushEnabled = enabled;
      break;
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
  return await this.save();
};

// Static methods

/**
 * Get or create default preferences for a user
 */
NotificationPreference.getOrCreateDefault = async function(userId) {
  const [preference, created] = await NotificationPreference.findOrCreate({
    where: {
      userId,
      notificationType: 'default'
    },
    defaults: {
      userId,
      notificationType: 'default',
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      pushEnabled: true,
      digestMode: 'immediate',
      language: 'en'
    }
  });
  return preference;
};

/**
 * Get preference for a specific notification type, falling back to default
 */
NotificationPreference.getPreferenceForType = async function(userId, notificationType) {
  // First try to find specific preference for this type
  let preference = await NotificationPreference.findOne({
    where: {
      userId,
      notificationType
    }
  });

  // If not found, get default preference
  if (!preference) {
    preference = await NotificationPreference.getOrCreateDefault(userId);
  }

  return preference;
};

module.exports = NotificationPreference;
