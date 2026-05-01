const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GuestProfile = sequelize.define('GuestProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Link to registered user (optional - guests may not have accounts)
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Link to User if guest has registered account'
  },
  // Personal Information
  name: {
    type: DataTypes.STRING(255),
    field: 'full_name',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: /^[0-9]{10}$/
    }
  },
  // Address stored as JSONB
  address: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Guest address: {street, city, state, pincode, country}'
  },
  // ID Verification
  idType: {
    type: DataTypes.ENUM('aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'),
    allowNull: true,
    comment: 'Type of government ID'
  },
  idNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID document number'
  },
  idVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether ID has been verified'
  },
  idVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when ID was verified'
  },
  idVerifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Staff who verified the ID'
  },
  // Stay Statistics (denormalized for quick access)
  totalStays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Total number of stays'
  },
  lastStayDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of last stay'
  }
}, {
  tableName: 'guest_profiles',
  underscored: true,
  indexes: [
    {
      fields: ['phone'],
      unique: true
    },
    {
      fields: ['email']
    },
    {
      fields: ['id_number']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['name']
    }
  ]
});


// Instance methods

// Get full address as string
GuestProfile.prototype.getFullAddress = function() {
  if (!this.address) return '';
  const { street, city, state, pincode, country } = this.address;
  return [street, city, state, pincode, country].filter(Boolean).join(', ');
};

// Check if guest is a returning guest
GuestProfile.prototype.isReturningGuest = function() {
  return this.totalStays > 0;
};

// Update stay statistics
GuestProfile.prototype.recordStay = async function(stayDate) {
  this.totalStays += 1;
  this.lastStayDate = stayDate || new Date();
  await this.save();
};

// Validate ID number format based on ID type
GuestProfile.validateIdNumber = function(idType, idNumber) {
  if (!idType || !idNumber) return { valid: false, message: 'ID type and number are required' };
  
  const patterns = {
    'aadhaar': /^[0-9]{12}$/,
    'pan': /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    'passport': /^[A-Z0-9]{6,9}$/,
    'driving_license': /^[A-Z0-9]{10,20}$/,
    'voter_id': /^[A-Z]{3}[0-9]{7}$/
  };
  
  const pattern = patterns[idType];
  if (!pattern) {
    return { valid: false, message: 'Invalid ID type' };
  }
  
  const normalizedIdNumber = idNumber.toUpperCase().replace(/\s/g, '');
  if (!pattern.test(normalizedIdNumber)) {
    return { valid: false, message: `Invalid ${idType.replace('_', ' ')} format` };
  }
  
  return { valid: true, normalizedIdNumber };
};

module.exports = GuestProfile;
