const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const APIKeyUsage = sequelize.define('APIKeyUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  apiKeyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'api_keys',
      key: 'id'
    },
    comment: 'The API key that was used'
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The API endpoint that was accessed'
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'HTTP method (GET, POST, etc.)'
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'HTTP response status code'
  },
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Response time in milliseconds'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the request'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if request failed'
  },
  requestData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Request parameters (sanitized)'
  }
}, {
  tableName: 'api_key_usage',
  timestamps: true,
  updatedAt: false, // Only need createdAt for usage logs
  underscored: true,
  indexes: [
    {
      fields: ['api_key_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['endpoint']
    },
    {
      fields: ['status_code']
    }
  ]
});

module.exports = APIKeyUsage;
