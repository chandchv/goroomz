const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyDocument = sequelize.define('PropertyDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'leads',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  documentType: {
    type: DataTypes.ENUM('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending_review'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'property_documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['lead_id']
    },
    {
      fields: ['property_owner_id']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['uploaded_by']
    }
  ]
});

module.exports = PropertyDocument;
