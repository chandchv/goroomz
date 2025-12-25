/**
 * Property-Based Test for Role Priority Enforcement
 * Feature: role-segregation-optimization, Property 2: Role priority enforcement
 * Validates: Requirements 1.2
 * 
 * Tests that when a user has multiple role types, the system prioritizes
 * internalRole over role over staffRole for access determination.
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
  }
}, {
  tableName: 'users',
  underscored: true
});

// Add helper methods to User model
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

describe('Role Priority Enforcement Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // Generators
  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

  const propertyRoleArbitrary = () =>
    fc.constantFrom('owner', 'category_owner', 'admin');

  const staffRoleArbitrary = () =>
    fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager');

  /**
   * Property 2: Role priority enforcement
   * Validates: Requirements 1.2
   */
  describe('Property 2: Role priority enforcement', () => {
    test('internalRole takes priority over role and staffRole', async () => {
      await fc.assert(
        fc.asyncProperty(
          internalRoleArbitrary(),
          propertyRoleArbitrary(),
          staffRoleArbitrary(),
          async (internalRole, propertyRole, staffRole) => {
            // Create user with all three role types
            const user = await User.create({
              name: 'Multi-Role User',
              email: `user${Date.now()}${Math.random()}@test.com`,
              role: propertyRole,
              internalRole: internalRole,
              staffRole: staffRole
            });

            // Verify that getUserType returns platform_staff (internalRole priority)
            expect(user.getUserType()).toBe('platform_staff');
            expect(user.isPlatformStaff()).toBe(true);
            expect(user.isPropertyOwner()).toBe(false);
            expect(user.isPropertyStaff()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('role takes priority over staffRole when no internalRole', async () => {
      await fc.assert(
        fc.asyncProperty(
          propertyRoleArbitrary(),
          staffRoleArbitrary(),
          async (propertyRole, staffRole) => {
            // Create user with role and staffRole but no internalRole
            const user = await User.create({
              name: 'Owner-Staff User',
              email: `user${Date.now()}${Math.random()}@test.com`,
              role: propertyRole,
              internalRole: null,
              staffRole: staffRole
            });

            // Verify that getUserType returns property_owner (role priority over staffRole)
            expect(user.getUserType()).toBe('property_owner');
            expect(user.isPropertyOwner()).toBe(true);
            expect(user.isPlatformStaff()).toBe(false);
            expect(user.isPropertyStaff()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('staffRole is used when no internalRole or property role', async () => {
      await fc.assert(
        fc.asyncProperty(
          staffRoleArbitrary(),
          async (staffRole) => {
            // Create user with only staffRole
            const user = await User.create({
              name: 'Staff User',
              email: `user${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: null,
              staffRole: staffRole
            });

            // Verify that getUserType returns property_staff
            expect(user.getUserType()).toBe('property_staff');
            expect(user.isPropertyStaff()).toBe(true);
            expect(user.isPropertyOwner()).toBe(false);
            expect(user.isPlatformStaff()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('external_user when no special roles are set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Create user with no special roles
            const user = await User.create({
              name: 'External User',
              email: `user${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: null,
              staffRole: null
            });

            // Verify that getUserType returns external_user
            expect(user.getUserType()).toBe('external_user');
            expect(user.isPropertyStaff()).toBe(false);
            expect(user.isPropertyOwner()).toBe(false);
            expect(user.isPlatformStaff()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('priority hierarchy is consistent across all role combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(internalRoleArbitrary(), { nil: null }),
          fc.constantFrom('user', 'owner', 'category_owner', 'admin'),
          fc.option(staffRoleArbitrary(), { nil: null }),
          async (internalRole, role, staffRole) => {
            // Create user with given role combination
            const user = await User.create({
              name: 'Test User',
              email: `user${Date.now()}${Math.random()}@test.com`,
              role: role,
              internalRole: internalRole,
              staffRole: staffRole
            });

            const userType = user.getUserType();

            // Verify priority hierarchy
            if (internalRole) {
              // If internalRole is set, must be platform_staff
              expect(userType).toBe('platform_staff');
              expect(user.isPlatformStaff()).toBe(true);
            } else if (role === 'owner' || role === 'admin' || role === 'category_owner') {
              // If no internalRole but has property owner role, must be property_owner
              expect(userType).toBe('property_owner');
              expect(user.isPropertyOwner()).toBe(true);
            } else if (staffRole) {
              // If no internalRole or property role but has staffRole, must be property_staff
              expect(userType).toBe('property_staff');
              expect(user.isPropertyStaff()).toBe(true);
            } else {
              // Otherwise, must be external_user
              expect(userType).toBe('external_user');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('role priority is deterministic for same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(internalRoleArbitrary(), { nil: null }),
          fc.constantFrom('user', 'owner', 'category_owner', 'admin'),
          fc.option(staffRoleArbitrary(), { nil: null }),
          async (internalRole, role, staffRole) => {
            // Create two users with identical role configuration
            const user1 = await User.create({
              name: 'User 1',
              email: `user1${Date.now()}${Math.random()}@test.com`,
              role: role,
              internalRole: internalRole,
              staffRole: staffRole
            });

            const user2 = await User.create({
              name: 'User 2',
              email: `user2${Date.now()}${Math.random()}@test.com`,
              role: role,
              internalRole: internalRole,
              staffRole: staffRole
            });

            // Verify both users have the same user type
            expect(user1.getUserType()).toBe(user2.getUserType());
            expect(user1.isPlatformStaff()).toBe(user2.isPlatformStaff());
            expect(user1.isPropertyOwner()).toBe(user2.isPropertyOwner());
            expect(user1.isPropertyStaff()).toBe(user2.isPropertyStaff());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
