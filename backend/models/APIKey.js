const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const APIKey = sequelize.define('APIKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Descriptive name for the API key'
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'The actual API key (hashed)'
  },
  keyPrefix: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'First 8 characters of the key for identification'
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Permissions granted to this API key'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created this API key'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether the API key is active'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time this API key was used'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration date for the API key'
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the API key was revoked'
  },
  revokedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who revoked this API key'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Number of times this API key has been used'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata about the API key'
  }
}, {
  tableName: 'api_keys',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['key']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['key_prefix']
    }
  ]
});

// Static method to generate a secure API key
APIKey.generateKey = function() {
  // Generate a random 32-byte key and encode as base64
  const key = crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  return key;
};

// Static method to hash an API key
APIKey.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// Instance method to verify a key
APIKey.prototype.verifyKey = function(key) {
  const hashedKey = APIKey.hashKey(key);
  return this.key === hashedKey;
};

// Instance method to check if key is valid
APIKey.prototype.isValid = function() {
  if (!this.isActive) return false;
  if (this.revokedAt) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

module.exports = APIKey;
