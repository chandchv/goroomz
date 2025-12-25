/**
 * Property-Based Test for Role Conflict Prevention
 * Feature: role-segregation-optimization, Property 4: Role conflict prevention
 * Validates: Requirements 1.5, 8.4
 * 
 * Tests that the system prevents role conflicts by ensuring a user cannot have
 * both internalRole and owner role simultaneously.
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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
function validateRoleConflicts(user) {
  const hasPropertyOwnerRole = (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner');
  const hasInternalRole = !!user.internalRole;
  
  if (hasPropertyOwnerRole && hasInternalRole) {
    throw new Error('Role conflict: A user cannot have both property owner role (owner/admin/category_owner) and internal platform role (internalRole). These roles are mutually exclusive.');
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
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      validateRoleConflicts(user);
    },
    beforeUpdate: async (user) => {
      if (user.changed('role') || user.changed('internalRole')) {
        validateRoleConflicts(user);
      }
    }
  }
});

// Arbitraries for generating test data
const propertyOwnerRoleArbitrary = () => fc.constantFrom('owner', 'admin', 'category_owner');
const internalRoleArbitrary = () => fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');
const nonOwnerRoleArbitrary = () => fc.constant('user');
const emailArbitrary = () => fc.emailAddress();
const nameArbitrary = () => fc.string({ minLength: 2, maxLength: 50 });

describe('Property 4: Role Conflict Prevention', () => {
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
   * Property: For any user with property owner role (owner/admin/category_owner) and internalRole,
   * the system should reject the creation/update
   */
  test('should reject users with both property owner role and internalRole', async () => {
    await fc.assert(
      fc.asyncProperty(
        propertyOwnerRoleArbitrary(),
        internalRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        async (ownerRole, internalRole, email, name) => {
          // Try to create a user with conflicting roles
          let errorThrown = false;
          let errorMessage = '';

          try {
            await User.create({
              name,
              email,
              role: ownerRole,
              internalRole: internalRole
            });
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }

          // Property assertion: Should always throw an error
          expect(errorThrown).toBe(true);
          expect(errorMessage).toMatch(/Role conflict/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with property owner role and no internalRole,
   * the system should allow the creation
   */
  test('should allow users with property owner role and no internalRole', async () => {
    await fc.assert(
      fc.asyncProperty(
        propertyOwnerRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        async (ownerRole, email, name) => {
          // Try to create a user with only owner role
          let user = null;
          let errorThrown = false;

          try {
            user = await User.create({
              name,
              email,
              role: ownerRole,
              internalRole: null
            });
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user).not.toBeNull();
          expect(user.role).toBe(ownerRole);
          expect(user.internalRole).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with internalRole and non-owner role,
   * the system should allow the creation
   */
  test('should allow users with internalRole and non-owner role', async () => {
    await fc.assert(
      fc.asyncProperty(
        internalRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        async (internalRole, email, name) => {
          // Try to create a user with internal role and user role
          let user = null;
          let errorThrown = false;

          try {
            user = await User.create({
              name,
              email,
              role: 'user',
              internalRole: internalRole
            });
          } catch (error) {
            errorThrown = true;
          }

          // Property assertion: Should not throw an error
          expect(errorThrown).toBe(false);
          expect(user).not.toBeNull();
          expect(user.role).toBe('user');
          expect(user.internalRole).toBe(internalRole);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any existing user, updating to have both property owner role
   * and internalRole should be rejected
   */
  test('should reject updates that create role conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        propertyOwnerRoleArbitrary(),
        internalRoleArbitrary(),
        emailArbitrary(),
        nameArbitrary(),
        async (ownerRole, internalRole, email, name) => {
          // Create a user with no conflicts
          const user = await User.create({
            name,
            email,
            role: 'user',
            internalRole: null
          });

          // Try to update to conflicting roles
          let errorThrown = false;
          let errorMessage = '';

          try {
            user.role = ownerRole;
            user.internalRole = internalRole;
            await user.save();
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }

          // Property assertion: Should always throw an error
          expect(errorThrown).toBe(true);
          expect(errorMessage).toMatch(/Role conflict/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with no role conflicts, updates that maintain
   * no conflicts should be allowed
   */
  test('should allow updates that maintain no role conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArbitrary(),
        nameArbitrary(),
        fc.string({ minLength: 2, maxLength: 50 }),
        async (email, name, newName) => {
          // Create a user with no conflicts
          const user = await User.create({
            name,
            email,
            role: 'owner',
            internalRole: null
          });

          // Update non-role fields
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
});
