const { DataTypes } = require('sequelize');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Create an in-memory SQLite database for testing
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false
});

// Import the validation functions and User model definition
// We'll need to recreate the model with our test sequelize instance
const validateRoleConflicts = (user) => {
  const hasPropertyOwnerRole = (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner');
  const hasInternalRole = !!user.internalRole;
  
  if (hasPropertyOwnerRole && hasInternalRole) {
    throw new Error('Role conflict: A user cannot have both property owner role (owner/admin/category_owner) and internal platform role (internalRole). These roles are mutually exclusive.');
  }
};

const validatePermissionScope = (user) => {
  if (!user.staffRole) {
    return;
  }
  
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
  
  if (user.permissions && typeof user.permissions === 'object') {
    const userPermissionKeys = Object.keys(user.permissions);
    const invalidPermissions = userPermissionKeys.filter(
      key => !allowedPropertyStaffPermissions.includes(key)
    );
    
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions for property staff: ${invalidPermissions.join(', ')}. Property staff can only have: ${allowedPropertyStaffPermissions.join(', ')}`);
    }
  }
  
  if (user.internalPermissions && Object.keys(user.internalPermissions).length > 0) {
    const hasAnyInternalPermission = Object.values(user.internalPermissions).some(val => val === true);
    if (hasAnyInternalPermission) {
      throw new Error('Property staff cannot have internal platform permissions. Only platform staff (users with internalRole) can have internalPermissions.');
    }
  }
};

const validateSelfPermissionModification = (user) => {
  if (user._requestingUserId && user.changed('permissions')) {
    if (user.id === user._requestingUserId) {
      const userType = user.getUserType();
      if (userType === 'property_staff') {
        throw new Error('Property staff cannot modify their own permissions. Permission changes must be made by a property owner or administrator.');
      }
    }
  }
};

const validatePlatformRoleCreation = (user) => {
  if (user._requestingUserType === 'property_owner' && user.internalRole) {
    throw new Error('Property owners cannot create or assign platform staff roles (internalRole). Only platform administrators can manage internal roles.');
  }
};

// Define User model for testing
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'owner', 'category_owner', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  internalPermissions: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users',
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      validateRoleConflicts(user);
      validatePermissionScope(user);
      validatePlatformRoleCreation(user);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      if (user.changed('role') || user.changed('internalRole')) {
        validateRoleConflicts(user);
      }
      if (user.changed('permissions') || user.changed('staffRole')) {
        validatePermissionScope(user);
      }
      validateSelfPermissionModification(user);
      if (user.changed('internalRole')) {
        validatePlatformRoleCreation(user);
      }
    }
  }
});

// Add helper methods
User.prototype.isPropertyOwner = function() {
  return (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') 
    && !this.internalRole;
};

User.prototype.isPlatformStaff = function() {
  return !!this.internalRole;
};

User.prototype.isPropertyStaff = function() {
  const hasPropertyOwnerRole = (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner');
  return !!this.staffRole && !this.internalRole && !hasPropertyOwnerRole;
};

User.prototype.getUserType = function() {
  if (this.isPlatformStaff()) return 'platform_staff';
  if (this.isPropertyOwner()) return 'property_owner';
  if (this.isPropertyStaff()) return 'property_staff';
  return 'external_user';
};

User.prototype.setRequestingUserContext = function(requestingUserId, requestingUserType) {
  this._requestingUserId = requestingUserId;
  this._requestingUserType = requestingUserType;
};

describe('User Role Validation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Role Conflict Prevention (Requirement 1.5)', () => {
    it('should prevent creating user with both owner role and internalRole', async () => {
      await expect(async () => {
        await User.create({
          name: 'Test User',
          email: 'conflict1@test.com',
          role: 'owner',
          internalRole: 'agent'
        });
      }).rejects.toThrow(/Role conflict/);
    });

    it('should prevent creating user with both admin role and internalRole', async () => {
      await expect(async () => {
        await User.create({
          name: 'Test User',
          email: 'conflict2@test.com',
          role: 'admin',
          internalRole: 'superuser'
        });
      }).rejects.toThrow(/Role conflict/);
    });

    it('should prevent creating user with both category_owner role and internalRole', async () => {
      await expect(async () => {
        await User.create({
          name: 'Test User',
          email: 'conflict3@test.com',
          role: 'category_owner',
          internalRole: 'platform_admin'
        });
      }).rejects.toThrow(/Role conflict/);
    });

    it('should allow creating user with owner role and no internalRole', async () => {
      const user = await User.create({
        name: 'Property Owner',
        email: 'owner@test.com',
        role: 'owner',
        internalRole: null
      });
      expect(user.id).toBeDefined();
      await user.destroy();
    });

    it('should allow creating user with internalRole and user role', async () => {
      const user = await User.create({
        name: 'Platform Staff',
        email: 'staff@test.com',
        role: 'user',
        internalRole: 'agent'
      });
      expect(user.id).toBeDefined();
      await user.destroy();
    });

    it('should prevent updating user to have both owner role and internalRole', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'update1@test.com',
        role: 'user',
        internalRole: null
      });

      await expect(async () => {
        user.role = 'owner';
        user.internalRole = 'agent';
        await user.save();
      }).rejects.toThrow(/Role conflict/);

      await user.destroy();
    });
  });

  describe('Permission Scope Validation (Requirement 10.2)', () => {
    it('should allow property staff with valid permissions', async () => {
      const user = await User.create({
        name: 'Front Desk Staff',
        email: 'frontdesk@test.com',
        role: 'user',
        staffRole: 'front_desk',
        permissions: {
          canCheckIn: true,
          canCheckOut: true,
          canManageRooms: false
        }
      });
      expect(user.id).toBeDefined();
      await user.destroy();
    });

    it('should reject property staff with invalid permissions', async () => {
      await expect(async () => {
        await User.create({
          name: 'Invalid Staff',
          email: 'invalid@test.com',
          role: 'user',
          staffRole: 'housekeeping',
          permissions: {
            canCheckIn: true,
            invalidPermission: true
          }
        });
      }).rejects.toThrow(/Invalid permissions for property staff/);
    });

    it('should reject property staff with internalPermissions', async () => {
      await expect(async () => {
        await User.create({
          name: 'Invalid Staff 2',
          email: 'invalid2@test.com',
          role: 'user',
          staffRole: 'maintenance',
          permissions: {
            canManageMaintenance: true
          },
          internalPermissions: {
            canOnboardProperties: true
          }
        });
      }).rejects.toThrow(/Property staff cannot have internal platform permissions/);
    });

    it('should allow users without staffRole to have any permissions structure', async () => {
      const user = await User.create({
        name: 'Regular User',
        email: 'regular@test.com',
        role: 'user',
        staffRole: null,
        permissions: {
          customPermission: true
        }
      });
      expect(user.id).toBeDefined();
      await user.destroy();
    });
  });

  describe('Self-Permission Modification Prevention (Requirement 7.5)', () => {
    it('should prevent property staff from modifying their own permissions', async () => {
      const user = await User.create({
        name: 'Staff Member',
        email: 'staffmember@test.com',
        role: 'user',
        staffRole: 'front_desk',
        permissions: {
          canCheckIn: true,
          canCheckOut: false
        }
      });

      // Simulate self-modification
      user.setRequestingUserContext(user.id, 'property_staff');
      user.permissions = {
        canCheckIn: true,
        canCheckOut: true,
        canManageRooms: true
      };

      await expect(async () => {
        await user.save();
      }).rejects.toThrow(/Property staff cannot modify their own permissions/);

      await user.destroy();
    });

    it('should allow property staff permissions to be modified by another user', async () => {
      const user = await User.create({
        name: 'Staff Member 2',
        email: 'staffmember2@test.com',
        role: 'user',
        staffRole: 'front_desk',
        permissions: {
          canCheckIn: true,
          canCheckOut: false
        }
      });

      // Simulate modification by property owner
      const ownerId = '123e4567-e89b-12d3-a456-426614174000';
      user.setRequestingUserContext(ownerId, 'property_owner');
      user.permissions = {
        canCheckIn: true,
        canCheckOut: true
      };

      await user.save();
      expect(user.permissions.canCheckOut).toBe(true);

      await user.destroy();
    });

    it('should allow non-property-staff to modify their own permissions', async () => {
      const user = await User.create({
        name: 'Platform Staff',
        email: 'platformstaff@test.com',
        role: 'user',
        internalRole: 'agent',
        internalPermissions: {
          canOnboardProperties: false
        }
      });

      // Simulate self-modification (should be allowed for platform staff)
      user.setRequestingUserContext(user.id, 'platform_staff');
      user.internalPermissions = {
        canOnboardProperties: true
      };

      await user.save();
      expect(user.internalPermissions.canOnboardProperties).toBe(true);

      await user.destroy();
    });
  });

  describe('Platform Role Creation Prevention (Requirement 10.4)', () => {
    it('should prevent property owners from creating users with internalRole', async () => {
      await expect(async () => {
        const user = User.build({
          name: 'New Staff',
          email: 'newstaff@test.com',
          role: 'user',
          internalRole: 'agent'
        });
        user.setRequestingUserContext('owner-id', 'property_owner');
        await user.save();
      }).rejects.toThrow(/Property owners cannot create or assign platform staff roles/);
    });

    it('should allow platform staff to create users with internalRole', async () => {
      const user = User.build({
        name: 'New Agent',
        email: 'newagent@test.com',
        role: 'user',
        internalRole: 'agent'
      });
      user.setRequestingUserContext('admin-id', 'platform_staff');
      await user.save();
      
      expect(user.id).toBeDefined();
      await user.destroy();
    });

    it('should allow property owners to create users without internalRole', async () => {
      const user = User.build({
        name: 'Property Staff',
        email: 'propertystaff@test.com',
        role: 'user',
        staffRole: 'front_desk',
        internalRole: null
      });
      user.setRequestingUserContext('owner-id', 'property_owner');
      await user.save();
      
      expect(user.id).toBeDefined();
      await user.destroy();
    });

    it('should prevent property owners from updating users to have internalRole', async () => {
      const user = await User.create({
        name: 'Staff Member',
        email: 'staffmember3@test.com',
        role: 'user',
        staffRole: 'front_desk'
      });

      user.setRequestingUserContext('owner-id', 'property_owner');
      user.internalRole = 'agent';

      await expect(async () => {
        await user.save();
      }).rejects.toThrow(/Property owners cannot create or assign platform staff roles/);

      await user.destroy();
    });
  });

  describe('setRequestingUserContext helper', () => {
    it('should set requesting user context correctly', () => {
      const user = User.build({
        name: 'Test User',
        email: 'test@test.com',
        role: 'user'
      });

      user.setRequestingUserContext('user-123', 'property_owner');
      expect(user._requestingUserId).toBe('user-123');
      expect(user._requestingUserType).toBe('property_owner');
    });
  });
});
