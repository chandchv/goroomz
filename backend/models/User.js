const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Validates that a user doesn't have conflicting roles
 * Requirement 1.5: Prevent role conflicts (owner + internalRole)
 * @param {Object} user - User instance
 * @throws {Error} If role conflict detected
 */
function validateRoleConflicts(user) {
  const hasPropertyOwnerRole = (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner');
  const hasInternalRole = !!user.internalRole;
  
  if (hasPropertyOwnerRole && hasInternalRole) {
    throw new Error('Role conflict: A user cannot have both property owner role (owner/admin/category_owner) and internal platform role (internalRole). These roles are mutually exclusive.');
  }
}

/**
 * Validates that permission scope is appropriate for the user's role
 * Requirement 10.2: Validate permissions are within allowed scope for property staff
 * @param {Object} user - User instance
 * @throws {Error} If invalid permissions detected
 */
function validatePermissionScope(user) {
  // Only validate if user has staffRole (property staff)
  if (!user.staffRole) {
    return;
  }
  
  // Define allowed permissions for property staff
  const allowedPropertyStaffPermissions = [
    'canCheckIn',
    'canCheckOut',
    'canManageRooms',
    'canRecordPayments',
    'canViewReports',
    'canManageStaff',
    'canUpdateRoomStatus',
    'canManageMaintenance'
  ];
  
  // Check if user has permissions set
  if (user.permissions && typeof user.permissions === 'object') {
    const userPermissionKeys = Object.keys(user.permissions);
    
    // Check for any permissions outside the allowed scope
    const invalidPermissions = userPermissionKeys.filter(
      key => !allowedPropertyStaffPermissions.includes(key)
    );
    
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions for property staff: ${invalidPermissions.join(', ')}. Property staff can only have: ${allowedPropertyStaffPermissions.join(', ')}`);
    }
  }
  
  // Ensure property staff don't have internalPermissions
  if (user.internalPermissions && Object.keys(user.internalPermissions).length > 0) {
    const hasAnyInternalPermission = Object.values(user.internalPermissions).some(val => val === true);
    if (hasAnyInternalPermission) {
      throw new Error('Property staff cannot have internal platform permissions. Only platform staff (users with internalRole) can have internalPermissions.');
    }
  }
}

/**
 * Validates that property staff cannot modify their own permissions
 * Requirement 7.5: Prevent self-permission modification
 * @param {Object} user - User instance being updated
 * @throws {Error} If self-permission modification detected
 */
function validateSelfPermissionModification(user) {
  // This validation requires context about who is making the change
  // We'll store the requesting user ID in a special field during the update
  if (user._requestingUserId && user.changed('permissions')) {
    // Check if the user is trying to modify their own permissions
    if (user.id === user._requestingUserId) {
      const userType = user.getUserType();
      if (userType === 'property_staff') {
        throw new Error('Property staff cannot modify their own permissions. Permission changes must be made by a property owner or administrator.');
      }
    }
  }
}

/**
 * Validates that property owners cannot create or assign platform roles
 * Requirement 10.4: Prevent property owners from assigning internalRole
 * @param {Object} user - User instance
 * @throws {Error} If property owner tries to assign internalRole
 */
function validatePlatformRoleCreation(user) {
  // This validation requires context about who is making the change
  // We'll store the requesting user type in a special field during creation/update
  if (user._requestingUserType === 'property_owner' && user.internalRole) {
    throw new Error('Property owners cannot create or assign platform staff roles (internalRole). Only platform administrators can manage internal roles.');
  }
}

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  firebase_uid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [6, 255],
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: {
      name: 'unique_phone',
      msg: 'Phone number must be unique'
    },
    validate: {
      isValidPhone(value) {
        if (!value) return;
        const phone = value.trim();
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          throw new Error('Phone number must be 10-15 digits and may start with +');
        }
      }
    }
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [2, 100],
    },
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  landmark: {
    type: DataTypes.STRING,
    allowNull: true,
  },
   
  pincode: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [4, 10],
    },
  },
  role: {
    type: DataTypes.ENUM('user', 'owner', 'category_owner', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      notifications: {
        email: true,
        sms: false
      },
      language: 'en'
    }
  },
  // Internal Management System fields
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    }
  },
  // Internal User Role Management System fields
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']]
    }
  },
  internalPermissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    }
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assignedPropertyId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_property_id',
    references: {
      model: 'rooms',
      key: 'id'
    },
    comment: 'Property (room) assigned to property staff members'
  }
}, {
  tableName: 'users',
  underscored: true,
  indexes: [
    {
      fields: ['email'],
      unique: true
    },
    {
      fields: ['phone'],
      unique: true,
      where: {
        phone: {
          [Op.ne]: null
        }
      }
    },
    {
      fields: ['firebase_uid'],
      unique: true
    },
    {
      fields: ['role']
    },
    {
      fields: ['internal_role']
    },
    {
      fields: ['territory_id']
    },
    {
      fields: ['manager_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['staff_role']
    }
    // Note: assigned_property_id index is created by migration 20251124000000
  ],
  hooks: {
    beforeCreate: async (user) => {
      // Hash password if provided
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Validate role conflicts (Requirement 1.5)
      validateRoleConflicts(user);
      
      // Validate permission scope (Requirement 10.2)
      validatePermissionScope(user);
      
      // Validate platform role creation (Requirement 10.4)
      validatePlatformRoleCreation(user);
    },
    beforeUpdate: async (user) => {
      // Hash password if changed
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Validate role conflicts (Requirement 1.5)
      if (user.changed('role') || user.changed('internalRole')) {
        validateRoleConflicts(user);
      }
      
      // Validate permission scope (Requirement 10.2)
      if (user.changed('permissions') || user.changed('staffRole')) {
        validatePermissionScope(user);
      }
      
      // Validate self-permission modification (Requirement 7.5)
      validateSelfPermissionModification(user);
      
      // Validate platform role creation (Requirement 10.4)
      if (user.changed('internalRole')) {
        validatePlatformRoleCreation(user);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.verificationToken;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  return values;
};

/**
 * Determines if the user is a property owner
 * Property owners have role 'owner', 'admin', or 'category_owner' and no internalRole
 * @returns {boolean}
 */
User.prototype.isPropertyOwner = function() {
  return (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') 
    && !this.internalRole;
};

/**
 * Determines if the user is platform staff
 * Platform staff have an internalRole set
 * @returns {boolean}
 */
User.prototype.isPlatformStaff = function() {
  return !!this.internalRole;
};

/**
 * Determines if the user is property staff
 * Property staff have a staffRole, no internalRole, and no property owner role
 * This ensures role priority: internalRole > property owner role > staffRole
 * @returns {boolean}
 */
User.prototype.isPropertyStaff = function() {
  const hasPropertyOwnerRole = (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner');
  return !!this.staffRole && !this.internalRole && !hasPropertyOwnerRole;
};

/**
 * Returns the user type as a string
 * @returns {'property_owner' | 'platform_staff' | 'property_staff' | 'external_user'}
 */
User.prototype.getUserType = function() {
  if (this.isPlatformStaff()) return 'platform_staff';
  if (this.isPropertyOwner()) return 'property_owner';
  if (this.isPropertyStaff()) return 'property_staff';
  return 'external_user';
};

/**
 * Returns an array of property IDs (room IDs) the user can access
 * @returns {Promise<string[]>} Array of property/room IDs
 */
User.prototype.getAccessiblePropertyIds = async function() {
  const userType = this.getUserType();
  
  try {
    if (userType === 'platform_staff') {
      // Superuser and platform_admin see all properties
      if (this.internalRole === 'superuser' || this.internalRole === 'platform_admin') {
        const { Room } = require('./index');
        const properties = await Room.findAll({ attributes: ['id'] });
        return properties.map(p => p.id);
      }
      
      // Regional manager sees properties in their territory
      if (this.internalRole === 'regional_manager' && this.territoryId) {
        // For now, return empty array as there's no direct property-territory link
        // This will be enhanced when PropertyAssignment model is created
        return [];
      }
      
      // Agent sees assigned properties
      if (this.internalRole === 'agent') {
        // For now, return empty array as there's no direct lead-to-property link
        // This will be enhanced when PropertyAssignment model is created
        return [];
      }
    }
    
    if (userType === 'property_owner') {
      const { Property } = require('./index');
      console.log('🔍 Getting accessible properties for owner:', this.email, 'ID:', this.id);
      
      // Get properties owned by this user
      const ownedProperties = await Property.findAll({
        where: { ownerId: this.id },
        attributes: ['id']
      });
      
      if (ownedProperties.length === 0) {
        console.log('🔍 No properties found for owner');
        return [];
      }
      
      const propertyIds = ownedProperties.map(p => p.id);
      console.log('🔍 Found owned properties:', propertyIds);
      
      // Return property IDs (not room IDs) for property owners
      return propertyIds;
    }
    
    if (userType === 'property_staff') {
      // Staff assigned to specific property
      return this.assignedPropertyId ? [this.assignedPropertyId] : [];
    }
    
    return [];
  } catch (error) {
    // Handle database errors gracefully
    console.error('Error fetching accessible property IDs:', error.message);
    return [];
  }
};

/**
 * Sets the requesting user context for validation purposes
 * This should be called before save/update operations to enable validation
 * @param {string} requestingUserId - ID of the user making the request
 * @param {string} requestingUserType - Type of the user making the request
 */
User.prototype.setRequestingUserContext = function(requestingUserId, requestingUserType) {
  this._requestingUserId = requestingUserId;
  this._requestingUserType = requestingUserType;
};

module.exports = User;
