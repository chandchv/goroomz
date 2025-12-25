/**
 * Property-Based Test for Staff Permission Scope Validation
 * Feature: role-segregation-optimization, Property 17: Staff permission scope validation
 * Validates: Requirements 10.2
 * 
 * Tests that property owner updating staff permissions validates that permissions
 * are within the allowed scope for property staff.
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
function validatePermissionScope(user) {
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
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  internalPermissions: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      validatePermissionScope(user);
    },
    beforeUpdate: async (user) => {
      if (user.changed('permissions') || user.changed('staffRole')) {
        validatePermissionScope(user);
      }
    }
  }
});

// Arbitraries for generating test data
const staffRoleArbitrary = () => fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager');
const emailArbitrary = () => fc.emailAddress();
const nameArbitrary = () => fc.string({ minLength: 2, maxLength: 50 });

const validPermissionKeyArbitrary = () => fc.constantFrom(
  'canCheckIn',
  'canCheckOut',
  'canManageRooms',
  'canRecordPayments',
  'canViewReports',
  'canManageStaff',
  'canUpdateRoomStatus',
  'canManageMaintenance'
);

const invalidPermissionKeyArbitrary = () => fc.constantFrom(
  'canDeleteDatabase',
  'canAccessAllProperties',
  'canManageSystemSettings',
  'invalidPermission',
  'canOnboardProperties'
);

const validPermissionsArbitrary = () => fc.dictionary(
  validPermissionKeyArbitrary(),
  fc.boolean(),
  { minKeys: 1, maxKeys: 5 }
);

const mixedPermissionsArbitrary = () => fc.record({
  valid: validPermissionsArbitrary(),
  invalid: fc.dictionary(
    invalidPermissionKeyArbitrary(),
    fc.boolean(),
    { minKeys: 1, maxKeys: 3 }
  )
}).map(({ valid, invalid }) => ({ ...valid, ...invalid }));

describe('Property 17: Staff Permission Scope Validation', () => {
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
   * Property: For any property staff with only valid permissions,
   * the system should allow creation
   */
  test('should allow property staff with valid permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        validPermissionsArbitrary(),
        async (staffRole, email, name, permissions) => {
          // Try to create property staff with valid permissions
          let user = null;
          let errorThrown = false;

          try {
            user = await User.create({
              name,
              email,
              role: 'user',
              staffRole: staffRole,
              permissions: permissions
            });
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user).not.toBeNull();
          expect(user.staffRole).toBe(staffRole);
          expect(user.permissions).toEqual(permissions);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property staff with invalid permissions,
   * the system should reject creation
   */
  test('should reject property staff with invalid permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        mixedPermissionsArbitrary(),
        async (staffRole, email, name, permissions) => {
          // Try to create property staff with invalid permissions
          let errorThrown = false;
          let errorMessage = '';

          try {
            await User.create({
              name,
              email,
              role: 'user',
              staffRole: staffRole,
              permissions: permissions
            });
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }

          // Property assertion: Should always throw an error
          expect(errorThrown).toBe(true);
          expect(errorMessage).toMatch(/Invalid permissions for property staff/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property staff with internalPermissions set to true,
   * the system should reject creation
   */
  test('should reject property staff with internal permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        validPermissionsArbitrary(),
        fc.record({
          canOnboardProperties: fc.boolean(),
          canApproveOnboardings: fc.boolean(),
          canManageAgents: fc.boolean()
        }),
        async (staffRole, email, name, permissions, internalPermissions) => {
          // Ensure at least one internal permission is true
          const hasAnyTrue = Object.values(internalPermissions).some(val => val === true);
          fc.pre(hasAnyTrue);

          // Try to create property staff with internal permissions
          let errorThrown = false;
          let errorMessage = '';

          try {
            await User.create({
              name,
              email,
              role: 'user',
              staffRole: staffRole,
              permissions: permissions,
              internalPermissions: internalPermissions
            });
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }

          // Property assertion: Should always throw an error
          expect(errorThrown).toBe(true);
          expect(errorMessage).toMatch(/Property staff cannot have internal platform permissions/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user without staffRole, any permissions structure should be allowed
   */
  test('should allow users without staffRole to have any permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArbitrary(),
        nameArbitrary(),
        fc.dictionary(fc.string(), fc.boolean(), { minKeys: 1, maxKeys: 5 }),
        async (email, name, permissions) => {
          // Try to create user without staffRole with any permissions
          let user = null;
          let errorThrown = false;

          try {
            user = await User.create({
              name,
              email,
              role: 'user',
              staffRole: null,
              permissions: permissions
            });
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user).not.toBeNull();
          expect(user.permissions).toEqual(permissions);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any existing property staff, updating to invalid permissions
   * should be rejected
   */
  test('should reject updates to invalid permissions for property staff', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        validPermissionsArbitrary(),
        mixedPermissionsArbitrary(),
        async (staffRole, email, name, initialPermissions, newPermissions) => {
          // Create property staff with valid permissions
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            permissions: initialPermissions
          });

          // Try to update to invalid permissions
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
          expect(errorMessage).toMatch(/Invalid permissions for property staff/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any existing property staff, updating to valid permissions
   * should be allowed
   */
  test('should allow updates to valid permissions for property staff', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        validPermissionsArbitrary(),
        validPermissionsArbitrary(),
        async (staffRole, email, name, initialPermissions, newPermissions) => {
          // Create property staff with valid permissions
          const user = await User.create({
            name,
            email,
            role: 'user',
            staffRole: staffRole,
            permissions: initialPermissions
          });

          // Try to update to different valid permissions
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
   * Property: For any property staff with all internal permissions set to false,
   * the system should allow creation (empty internal permissions are okay)
   */
  test('should allow property staff with all internal permissions set to false', async () => {
    await fc.assert(
      fc.asyncProperty(
        staffRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        validPermissionsArbitrary(),
        async (staffRole, email, name, permissions) => {
          // Try to create property staff with internal permissions all false
          let user = null;
          let errorThrown = false;

          try {
            user = await User.create({
              name,
              email,
              role: 'user',
              staffRole: staffRole,
              permissions: permissions,
              internalPermissions: {
                canOnboardProperties: false,
                canApproveOnboardings: false,
                canManageAgents: false
              }
            });
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error (all false is okay)
          expect(errorThrown).toBe(false);
          expect(user).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
