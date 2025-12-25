const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeadCommunication = sequelize.define('LeadCommunication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'leads',
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
  type: {
    type: DataTypes.ENUM('call', 'email', 'meeting', 'note'),
    allowNull: false
  },
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
      notEmpty: true
    }
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'lead_communications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['lead_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = LeadCommunication;
