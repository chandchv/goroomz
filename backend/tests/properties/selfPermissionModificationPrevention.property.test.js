/**
 * Property-Based Test for Self-Permission Modification Prevention
 * Feature: role-segregation-optimization, Property 16: Self-permission modification prevention
 * Validates: Requirements 7.5
 * 
 * Tests that property staff cannot modify their own permissions.
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Validation function (same as in User model)
function validateSelfPermissionModification(user) {
  if (user._requestingUserId && user.changed('permissions')) {
    if (user.id === user._requestingUserId) {
      const userType = user.getUserType();
      if (userType === 'property_staff') {
        throw new Error('Property staff cannot modify their own permissions. Permission changes must be made by a property owner or administrator.');
      }
    }
  }
}

// Define User model inline for testing
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  role: {
    type: DataTypes.ENUM('user', 'owner', 'category_owner', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users',
  hooks: {
    beforeUpdate: async (user) => {
      validateSelfPermissionModification(user);
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

// Arbitraries for generating test data
const staffRoleArbitrary = () => fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager');
const emailArbitrary = () => fc.emailAddress();
const nameArbitrary = () => fc.string({ minLength: 2, maxLength: 50 });
const permissionsArbitrary = () => fc.record({
  canCheckIn: fc.boolean(),
  canCheckOut: fc.boolean(),
  canManageRooms: fc.boolean(),
  canRecordPayments: fc.boolean()
});

describe('Property 16: Self-Permission Modification Prevention', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.destroy({ where: {}, truncate: true });
  });

  /**
   * Property: For any property staff user attempting to modify their own permissions,
   * the system should reject the modification
   */
  test('should reject property staff modifying their own permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        permissionsArbitrary(),
        permissionsArbitrary(),
        async (staffRole, email, name, initialPermissions, newPermissions) => {
          // Ensure permissions are actually different
          const permissionsAreDifferent = JSON.stringify(initialPermissions) !== JSON.stringify(newPermissions);
          fc.pre(permissionsAreDifferent);

          // Create a property staff user
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            internalRole: null,
            permissions: initialPermissions
          });

          // Set requesting user context to self
          user.setRequestingUserContext(user.id, 'property_staff');

          // Try to modify own permissions
          let errorThrown = false;
          let errorMessage = '';

          try {
            user.permissions = newPermissions;
            await user.save();
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }

          // Property assertion: Should always throw an error
          expect(errorThrown).toBe(true);
          expect(errorMessage).toMatch(/Property staff cannot modify their own permissions/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property staff user, when another user modifies their permissions,
   * the system should allow the modification
   */
  test('should allow property staff permissions to be modified by another user', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        permissionsArbitrary(),
        permissionsArbitrary(),
        fc.uuid(),
        async (staffRole, email, name, initialPermissions, newPermissions, otherUserId) => {
          // Create a property staff user
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            internalRole: null,
            permissions: initialPermissions
          });

          // Ensure otherUserId is different from user.id
          fc.pre(otherUserId !== user.id);

          // Set requesting user context to another user (property owner)
          user.setRequestingUserContext(otherUserId, 'property_owner');

          // Try to modify permissions
          let errorThrown = false;

          try {
            user.permissions = newPermissions;
            await user.save();
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user.permissions).toEqual(newPermissions);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-property-staff user, modifying their own permissions
   * should be allowed
   */
  test('should allow non-property-staff to modify their own permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('agent', 'regional_manager', 'platform_admin'),
        emailArbitrary(),
        nameArbitrary(),
        fc.record({
          canOnboardProperties: fc.boolean(),
          canApproveOnboardings: fc.boolean()
        }),
        fc.record({
          canOnboardProperties: fc.boolean(),
          canApproveOnboardings: fc.boolean()
        }),
        async (internalRole, email, name, initialPermissions, newPermissions) => {
          // Create a platform staff user
          const user = await User.create({
            name,
            email,
            role: 'user',
            internalRole: internalRole,
            permissions: initialPermissions
          });

          // Set requesting user context to self
          user.setRequestingUserContext(user.id, 'platform_staff');

          // Try to modify own permissions
          let errorThrown = false;

          try {
            user.permissions = newPermissions;
            await user.save();
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error (platform staff can modify their own)
          expect(errorThrown).toBe(false);
          expect(user.permissions).toEqual(newPermissions);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property staff user, modifying non-permission fields
   * should be allowed even when requesting user is self
   */
  test('should allow property staff to modify non-permission fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        nameArbitrary(),
        permissionsArbitrary(),
        async (staffRole, email, name, newName, permissions) => {
          // Ensure names are different
          fc.pre(name !== newName);

          // Create a property staff user
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            internalRole: null,
            permissions: permissions
          });

          // Set requesting user context to self
          user.setRequestingUserContext(user.id, 'property_staff');

          // Try to modify name (not permissions)
          let errorThrown = false;

          try {
            user.name = newName;
            await user.save();
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user.name).toBe(newName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property staff user without requesting user context set,
   * permission modifications should be allowed (no validation)
   */
  test('should allow permission modifications when no requesting user context is set', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        permissionsArbitrary(),
        permissionsArbitrary(),
        async (staffRole, email, name, initialPermissions, newPermissions) => {
          // Create a property staff user
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            internalRole: null,
            permissions: initialPermissions
          });

          // Do NOT set requesting user context

          // Try to modify permissions
          let errorThrown = false;

          try {
            user.permissions = newPermissions;
            await user.save();
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error (no context means no validation)
          expect(errorThrown).toBe(false);
          expect(user.permissions).toEqual(newPermissions);
        }
      ),
      { numRuns: 100 }
    );
  });
});
