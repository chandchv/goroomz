const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [5, 200]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  targetAudience: {
    type: DataTypes.ENUM('all_property_owners', 'specific_region', 'specific_property_type'),
    allowNull: false,
    defaultValue: 'all_property_owners'
  },
  targetFilters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Filters for targeting specific audiences',
    validate: {
      isValidFilters(value) {
        if (!value) return;
        if (typeof value !== 'object') {
          throw new Error('Target filters must be an object');
        }
        // Validate regions array if present
        if (value.regions && !Array.isArray(value.regions)) {
          throw new Error('Target filters regions must be an array');
        }
        // Validate propertyTypes array if present
        if (value.propertyTypes && !Array.isArray(value.propertyTypes)) {
          throw new Error('Target filters propertyTypes must be an array');
        }
      }
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the announcement should be sent (null for immediate)'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the announcement was actually sent'
  },
  deliveryMethod: {
    type: DataTypes.ARRAY(DataTypes.ENUM('email', 'in_app', 'sms')),
    field: 'delivery_method',
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidMethods(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('At least one delivery method must be specified');
        }
      }
    }
  },
  readCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  totalRecipients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'announcements',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeValidate: (announcement) => {
      // Set default delivery methods if not provided
      if (!announcement.deliveryMethod || announcement.deliveryMethod.length === 0) {
        announcement.deliveryMethod = ['email', 'in_app'];
      }
    }
  },
  indexes: [
    {
      fields: ['created_by']
    },
    {
      fields: ['target_audience']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['sent_at']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Announcement;
