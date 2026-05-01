const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GuestDocument = sequelize.define('GuestDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Reference to guest profile
  guestProfileId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'guest_profiles',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Reference to guest profile'
  },
  // Reference to booking (optional - document may be uploaded during booking)
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id'
    },
    comment: 'Reference to booking when document was uploaded'
  },
  // Document details
  documentType: {
    type: DataTypes.ENUM('id_front', 'id_back', 'other'),
    allowNull: false,
    comment: 'Type of document: id_front, id_back, or other'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    },
    comment: 'Original file name'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true
    },
    comment: 'Secure storage path'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 5 * 1024 * 1024 // 5MB max
    },
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isValidMimeType(value) {
        if (value) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
          if (!allowedTypes.includes(value)) {
            throw new Error('Invalid file type. Only images and PDFs are allowed.');
          }
        }
      }
    },
    comment: 'MIME type of the file'
  },
  // Upload tracking
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Staff who uploaded the document'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'Timestamp when document was uploaded'
  }
}, {
  tableName: 'guest_documents',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['guest_profile_id']
    },
    {
      fields: ['booking_id']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['uploaded_at']
    }
  ]
});

// Instance methods

// Check if document is an image
GuestDocument.prototype.isImage = function() {
  return this.mimeType && this.mimeType.startsWith('image/');
};

// Get file size in human-readable format
GuestDocument.prototype.getFileSizeFormatted = function() {
  if (!this.fileSize) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.fileSize;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// Static: Allowed MIME types
GuestDocument.ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

// Static: Max file size (5MB)
GuestDocument.MAX_FILE_SIZE = 5 * 1024 * 1024;

// Static: Validate file
GuestDocument.validateFile = function(file) {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  if (file.size > GuestDocument.MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed (${GuestDocument.MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }
  
  if (!GuestDocument.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push('Invalid file type. Only images and PDFs are allowed.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = GuestDocument;
