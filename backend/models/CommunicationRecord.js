const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommunicationRecord = sequelize.define('CommunicationRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Reference Information
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'leads',
      key: 'id'
    }
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'property_owners',
      key: 'id'
    }
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  
  // Communication Details
  type: {
    type: DataTypes.ENUM(
      'email', 'sms', 'phone_call', 'whatsapp', 'in_app_notification',
      'system_notification', 'meeting', 'video_call', 'chat'
    ),
    allowNull: false
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed', 'pending'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Participants
  fromUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Internal user who initiated the communication'
  },
  toUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who received the communication'
  },
  fromEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  toEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  fromPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 15]
    }
  },
  toPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 15]
    }
  },
  
  // Content
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 5000],
      notEmpty: true
    }
  },
  contentType: {
    type: DataTypes.ENUM('text', 'html', 'markdown'),
    defaultValue: 'text',
    allowNull: false
  },
  
  // Metadata
  category: {
    type: DataTypes.ENUM(
      'lead_notification', 'assignment_notification', 'status_update',
      'booking_confirmation', 'booking_cancellation', 'payment_notification',
      'onboarding', 'training', 'support', 'marketing', 'system_alert'
    ),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Tracking
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // External Service Integration
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID from external service (email provider, SMS service, etc.)'
  },
  externalStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Status from external service'
  },
  externalResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full response from external service'
  },
  
  // Error Handling
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 5
    }
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false,
    validate: {
      min: 0,
      max: 10
    }
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Template Information
  templateId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to email/SMS template used'
  },
  templateVariables: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Variables used to populate the template'
  },
  
  // Follow-up and Response
  requiresResponse: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  responseDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  parentCommunicationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'communication_records',
      key: 'id'
    },
    comment: 'Reference to original communication if this is a response'
  },
  
  // Analytics and Reporting
  openedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  lastOpenedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastClickedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'communication_records',
  indexes: [
    {
      fields: ['leadId', 'createdAt']
    },
    {
      fields: ['propertyOwnerId', 'createdAt']
    },
    {
      fields: ['bookingId', 'createdAt']
    },
    {
      fields: ['fromUserId', 'createdAt']
    },
    {
      fields: ['toUserId', 'createdAt']
    },
    {
      fields: ['type', 'status', 'createdAt']
    },
    {
      fields: ['category', 'createdAt']
    },
    {
      fields: ['status', 'nextRetryAt']
    },
    {
      fields: ['requiresResponse', 'responseDeadline']
    },
    {
      fields: ['parentCommunicationId']
    }
  ],
  hooks: {
    beforeCreate: async (record) => {
      // Set sentAt timestamp when status is 'sent'
      if (record.status === 'sent' && !record.sentAt) {
        record.sentAt = new Date();
      }
    },
    beforeUpdate: async (record) => {
      // Update timestamps based on status changes
      if (record.changed('status')) {
        const now = new Date();
        switch (record.status) {
          case 'sent':
            if (!record.sentAt) record.sentAt = now;
            break;
          case 'delivered':
            if (!record.deliveredAt) record.deliveredAt = now;
            break;
          case 'read':
            if (!record.readAt) record.readAt = now;
            break;
          case 'failed':
            if (!record.failedAt) record.failedAt = now;
            break;
        }
      }
    }
  }
});

// Instance methods
CommunicationRecord.prototype.canRetry = function() {
  return this.status === 'failed' && 
         this.retryCount < this.maxRetries && 
         (!this.nextRetryAt || new Date() >= new Date(this.nextRetryAt));
};

CommunicationRecord.prototype.scheduleRetry = function() {
  if (this.canRetry()) {
    this.retryCount += 1;
    // Exponential backoff: 5 minutes, 15 minutes, 45 minutes, etc.
    const delayMinutes = 5 * Math.pow(3, this.retryCount - 1);
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    this.status = 'pending';
  }
};

CommunicationRecord.prototype.isOverdue = function() {
  return this.requiresResponse && 
         this.responseDeadline && 
         new Date() > new Date(this.responseDeadline) && 
         !this.respondedAt;
};

CommunicationRecord.prototype.getResponseTime = function() {
  if (this.sentAt && this.respondedAt) {
    return Math.ceil((new Date(this.respondedAt) - new Date(this.sentAt)) / (1000 * 60 * 60)); // hours
  }
  return null;
};

module.exports = CommunicationRecord;