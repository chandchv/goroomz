const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyClaim = sequelize.define('PropertyClaim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Property being claimed
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  
  // Claimant information
  claimantUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'claimant_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID if claimant has an account'
  },
  
  // Claimant details (for users without account)
  claimantName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'claimant_name'
  },
  claimantEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'claimant_email',
    validate: {
      isEmail: true
    }
  },
  claimantPhone: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'claimant_phone'
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'business_name'
  },
  
  // Verification documents
  documents: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of uploaded verification documents'
  },
  
  // Claim status
  status: {
    type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Verification details
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'verification_notes'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  
  // Review tracking
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  
  // Additional claim information
  proofOfOwnership: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'proof_of_ownership',
    comment: 'Description of ownership proof provided'
  },
  additionalInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'additional_info'
  },
  
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'property_claims',
  timestamps: true,
  indexes: [
    { fields: ['property_id'] },
    { fields: ['claimant_user_id'] },
    { fields: ['claimant_email'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = PropertyClaim;
