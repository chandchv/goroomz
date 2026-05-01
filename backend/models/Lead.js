const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Property Information
  propertyOwnerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15],
      is: /^[0-9+\-\s()]+$/
    }
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  propertyType: {
    type: DataTypes.ENUM('hotel', 'pg', 'homestay', 'apartment'),
    allowNull: false
  },
  estimatedRooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 1000
    }
  },
  
  // Location Information
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 500],
      notEmpty: true
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India',
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [5, 10],
      is: /^[0-9]+$/
    }
  },
  landmark: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  
  // Lead Management
  status: {
    type: DataTypes.ENUM(
      'pending', 'assigned', 'contacted', 'in_review', 
      'approved', 'rejected', 'on_hold', 'converted'
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'website',
    validate: {
      len: [1, 50]
    }
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'territories',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  
  // Workflow Tracking
  submissionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastContactDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expectedCloseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Additional Data
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 2000]
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidTags(value) {
        if (value && value.some(tag => tag.length > 50)) {
          throw new Error('Tags cannot be more than 50 characters');
        }
      }
    }
  },
  
  // Frontend Sync Fields
  frontendSubmissionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [0, 100]
    }
  },
  syncStatus: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Property Details (from frontend submission)
  propertyDetails: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional property details from frontend submission'
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidAmenities(value) {
        const validAmenities = [
          'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 
          'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
          'refrigerator', 'microwave', 'iron', 'heater', 'cctv'
        ];
        if (value && !value.every(amenity => validAmenities.includes(amenity))) {
          throw new Error('Invalid amenity provided');
        }
      }
    }
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidImages(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Images must be an array');
        }
        if (value) {
          value.forEach(image => {
            if (!image.url || typeof image.url !== 'string') {
              throw new Error('Each image must have a valid URL');
            }
          });
        }
      }
    }
  },
  expectedLaunchDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'leads',
  indexes: [
    {
      fields: ['status', 'submissionDate']
    },
    {
      fields: ['agentId', 'status']
    },
    {
      fields: ['territoryId', 'status']
    },
    {
      fields: ['city', 'state']
    },
    {
      fields: ['frontendSubmissionId']
    },
    {
      fields: ['syncStatus', 'lastSyncAt']
    }
  ]
});

// Instance methods
Lead.prototype.canBeAssigned = function() {
  return ['pending', 'on_hold'].includes(this.status);
};

Lead.prototype.canBeApproved = function() {
  return ['in_review', 'contacted'].includes(this.status);
};

Lead.prototype.isOverdue = function() {
  if (!this.expectedCloseDate) return false;
  return new Date() > new Date(this.expectedCloseDate) && !['approved', 'rejected', 'converted'].includes(this.status);
};

Lead.prototype.getDaysOld = function() {
  const now = new Date();
  const submission = new Date(this.submissionDate);
  return Math.floor((now - submission) / (1000 * 60 * 60 * 24));
};

module.exports = Lead;