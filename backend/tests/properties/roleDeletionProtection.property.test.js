/**
 * Property-Based Tests for Role Deletion Protection
 * Feature: internal-user-roles, Property 4: Role deletion protection
 * 
 * Property: For any role with assigned users, deletion attempts should be rejected
 * 
 * Validates: Requirements 22.5
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
    underscored: false
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
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
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
  internalPermissions: {
    type: DataTypes.JSON,
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
    type: DataTypes.REAL,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users'
});

// Define InternalRole model inline for testing
const InternalRole = sequelize.define('InternalRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  defaultPermissions: {
    type: DataTypes.JSON,
    allowNull: false,
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
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'internal_roles'
});

/**
 * Function to attempt role deletion with protection
 * This simulates the behavior in the DELETE /api/internal/roles/:id endpoint
 */
async function attemptRoleDeletion(role) {
  // Check if role is custom
  if (!role.isCustom) {
    throw new Error('Cannot delete predefined roles');
  }

  // Check if any users are assigned to this role
  const usersWithRole = await User.count({
    where: {
      internalRole: role.name
    }
  });

  if (usersWithRole > 0) {
    throw new Error(`Cannot delete role. ${usersWithRole} user(s) are currently assigned to this role.`);
  }

  // Delete the role
  await role.destroy();
  return true;
}

describe('Property 4: Role Deletion Protection', () => {
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.destroy({ where: {}, truncate: true });
    await InternalRole.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for permission objects
   */
  const permissionsArbitrary = () =>
    fc.record({
      canOnboardProperties: fc.boolean(),
      canApproveOnboardings: fc.boolean(),
      canManageAgents: fc.boolean(),
      canAccessAllProperties: fc.boolean(),
      canManageSystemSettings: fc.boolean(),
      canViewAuditLogs: fc.boolean(),
      canManageCommissions: fc.boolean(),
      canManageTerritories: fc.boolean(),
      canManageTickets: fc.boolean(),
      canBroadcastAnnouncements: fc.boolean()
    });

  /**
   * Generator for role names
   */
  const roleNameArbitrary = () =>
    fc.array(
      fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'),
      { minLength: 5, maxLength: 15 }
    ).map(chars => `custom_${chars.join('')}`);

  /**
   * Generator for user names
   */
  const userNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'),
      fc.constantFrom('Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis')
    ).map(([first, last]) => `${first} ${last}`);

  /**
   * Generator for email addresses
   */
  const emailArbitrary = () =>
    fc.tuple(
      fc.array(
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
        { minLength: 5, maxLength: 15 }
      ),
      fc.constantFrom('example.com', 'test.com', 'demo.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  test('Property 4: Role with assigned users cannot be deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        fc.integer({ min: 1, max: 5 }),
        async (roleName, permissions, userCount) => {
          // Create a custom role
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: permissions,
            isCustom: true
          });

          // Create users with this role
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: permissions
            });
          }

          // Property assertion: Attempting to delete the role should throw an error
          await expect(attemptRoleDeletion(role)).rejects.toThrow();

          // Verify the role still exists
          const roleStillExists = await InternalRole.findByPk(role.id);
          expect(roleStillExists).not.toBeNull();

          // Verify all users still have the role
          const usersWithRole = await User.count({
            where: { internalRole: roleName }
          });
          expect(usersWithRole).toBe(userCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Role without assigned users can be deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        async (roleName, permissions) => {
          // Create a custom role
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: permissions,
            isCustom: true
          });

          const roleId = role.id;

          // Property assertion: Deleting the role should succeed
          const result = await attemptRoleDeletion(role);
          expect(result).toBe(true);

          // Verify the role no longer exists
          const roleStillExists = await InternalRole.findByPk(roleId);
          expect(roleStillExists).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Role becomes deletable after all users are removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        fc.integer({ min: 1, max: 5 }),
        async (roleName, permissions, userCount) => {
          // Create a custom role
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: permissions,
            isCustom: true
          });

          // Create users with this role
          const users = [];
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            const user = await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: permissions
            });
            users.push(user);
          }

          // Verify deletion is blocked
          await expect(attemptRoleDeletion(role)).rejects.toThrow();

          // Remove all users from the role
          for (const user of users) {
            await user.update({
              internalRole: null,
              internalPermissions: null
            });
          }

          // Property assertion: Now deletion should succeed
          const roleId = role.id;
          const result = await attemptRoleDeletion(role);
          expect(result).toBe(true);

          // Verify the role no longer exists
          const roleStillExists = await InternalRole.findByPk(roleId);
          expect(roleStillExists).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Predefined roles cannot be deleted regardless of user count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
        permissionsArbitrary(),
        fc.integer({ min: 0, max: 3 }),
        async (predefinedRoleName, permissions, userCount) => {
          // Check if role already exists and delete it first
          const existingRole = await InternalRole.findOne({ where: { name: predefinedRoleName } });
          if (existingRole) {
            // Remove all users from this role first
            await User.update(
              { internalRole: null, internalPermissions: null },
              { where: { internalRole: predefinedRoleName } }
            );
            await existingRole.destroy();
          }

          // Create a predefined role
          const role = await InternalRole.create({
            name: predefinedRoleName,
            displayName: predefinedRoleName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            description: `Predefined ${predefinedRoleName} role`,
            defaultPermissions: permissions,
            isCustom: false
          });

          // Create users with this role (or not)
          const timestamp = Date.now();
          const randomSuffix = Math.floor(Math.random() * 1000000);
          for (let i = 0; i < userCount; i++) {
            await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${randomSuffix}${i}@test.com`,
              role: 'user',
              internalRole: predefinedRoleName,
              internalPermissions: permissions
            });
          }

          // Property assertion: Attempting to delete predefined role should throw an error
          await expect(attemptRoleDeletion(role)).rejects.toThrow('Cannot delete predefined roles');

          // Verify the role still exists
          const roleStillExists = await InternalRole.findByPk(role.id);
          expect(roleStillExists).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Deletion protection is consistent across multiple attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 2, max: 5 }),
        async (roleName, permissions, userCount, attemptCount) => {
          // Create a custom role
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: permissions,
            isCustom: true
          });

          // Create users with this role
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: permissions
            });
          }

          // Property assertion: Multiple deletion attempts should all fail
          for (let attempt = 0; attempt < attemptCount; attempt++) {
            await expect(attemptRoleDeletion(role)).rejects.toThrow();
            
            // Verify the role still exists after each attempt
            const roleStillExists = await InternalRole.findByPk(role.id);
            expect(roleStillExists).not.toBeNull();
          }

          // Verify all users still have the role
          const usersWithRole = await User.count({
            where: { internalRole: roleName }
          });
          expect(usersWithRole).toBe(userCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 4: Inactive users still prevent role deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        fc.integer({ min: 1, max: 5 }),
        async (roleName, permissions, userCount) => {
          // Create a custom role
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: permissions,
            isCustom: true
          });

          // Create inactive users with this role
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: permissions,
              isActive: false // Inactive users
            });
          }

          // Property assertion: Even with inactive users, deletion should be blocked
          await expect(attemptRoleDeletion(role)).rejects.toThrow();

          // Verify the role still exists
          const roleStillExists = await InternalRole.findByPk(role.id);
          expect(roleStillExists).not.toBeNull();

          // Verify all inactive users still have the role
          const usersWithRole = await User.count({
            where: { 
              internalRole: roleName,
              isActive: false
            }
          });
          expect(usersWithRole).toBe(userCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
