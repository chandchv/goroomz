const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketResponse = sequelize.define('TicketResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'support_tickets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'True for internal notes, false for customer-facing responses'
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment URLs',
    validate: {
      isValidAttachments(value) {
        if (!value) return;
        if (!Array.isArray(value)) {
          throw new Error('Attachments must be an array');
        }
        for (const attachment of value) {
          if (typeof attachment !== 'string') {
            throw new Error('Each attachment must be a string URL');
          }
        }
      }
    }
  }
}, {
  tableName: 'ticket_responses',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['ticket_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_internal']
    }
  ]
});

module.exports = TicketResponse;
