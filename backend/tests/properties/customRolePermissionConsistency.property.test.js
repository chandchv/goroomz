/**
 * Property-Based Tests for Custom Role Permission Consistency
 * Feature: internal-user-roles, Property 3: Custom role permission consistency
 * 
 * Property: For any custom role modification, all users assigned to that role 
 * should have their permissions updated to match the new role definition
 * 
 * Validates: Requirements 22.4
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
 * Function to update role permissions and propagate to all users
 * This simulates the behavior in the PUT /api/internal/roles/:id endpoint
 */
async function updateRolePermissions(role, newPermissions) {
  // Update role permissions
  role.defaultPermissions = {
    ...role.defaultPermissions,
    ...newPermissions
  };
  await role.save();

  // Update all users with this role
  const usersWithRole = await User.findAll({
    where: {
      internalRole: role.name
    }
  });

  await Promise.all(
    usersWithRole.map(user => {
      user.internalPermissions = role.defaultPermissions;
      return user.save({ fields: ['internalPermissions'] });
    })
  );

  return usersWithRole.length;
}

/**
 * Helper to compare permission objects
 */
function permissionsMatch(actual, expected) {
  const keys = Object.keys(expected);
  for (const key of keys) {
    if (actual[key] !== expected[key]) {
      return false;
    }
  }
  return true;
}

describe('Property 3: Custom Role Permission Consistency', () => {
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
   * Generator for partial permission updates (subset of permissions)
   */
  const partialPermissionsArbitrary = () =>
    fc.record({
      canOnboardProperties: fc.option(fc.boolean(), { nil: undefined }),
      canApproveOnboardings: fc.option(fc.boolean(), { nil: undefined }),
      canManageAgents: fc.option(fc.boolean(), { nil: undefined }),
      canAccessAllProperties: fc.option(fc.boolean(), { nil: undefined }),
      canManageSystemSettings: fc.option(fc.boolean(), { nil: undefined }),
      canViewAuditLogs: fc.option(fc.boolean(), { nil: undefined }),
      canManageCommissions: fc.option(fc.boolean(), { nil: undefined }),
      canManageTerritories: fc.option(fc.boolean(), { nil: undefined }),
      canManageTickets: fc.option(fc.boolean(), { nil: undefined }),
      canBroadcastAnnouncements: fc.option(fc.boolean(), { nil: undefined })
    }).map(obj => {
      // Remove undefined values
      const filtered = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          filtered[key] = value;
        }
      }
      return filtered;
    }).filter(obj => Object.keys(obj).length > 0); // Ensure at least one permission is updated

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

  test('Property 3: Single user permissions update when role is modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        partialPermissionsArbitrary(),
        userNameArbitrary(),
        emailArbitrary(),
        async (roleName, initialPermissions, permissionUpdates, userName, email) => {
          // Create a custom role with initial permissions
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: initialPermissions,
            isCustom: true
          });

          // Create a user with this role
          const user = await User.create({
            name: userName,
            email: email,
            role: 'user',
            internalRole: roleName,
            internalPermissions: initialPermissions
          });

          // Verify initial state
          await user.reload();
          expect(permissionsMatch(user.internalPermissions, initialPermissions)).toBe(true);

          // Update role permissions
          await updateRolePermissions(role, permissionUpdates);

          // Reload user to get updated permissions
          await user.reload();
          await role.reload();

          // Property assertion: User's permissions must match updated role permissions
          expect(permissionsMatch(user.internalPermissions, role.defaultPermissions)).toBe(true);

          // Verify each updated permission
          for (const [permission, expectedValue] of Object.entries(role.defaultPermissions)) {
            expect(user.internalPermissions[permission]).toBe(expectedValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Multiple users permissions update when role is modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        partialPermissionsArbitrary(),
        fc.integer({ min: 2, max: 5 }),
        async (roleName, initialPermissions, permissionUpdates, userCount) => {
          // Create a custom role with initial permissions
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: initialPermissions,
            isCustom: true
          });

          // Create multiple users with this role
          const users = [];
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            const user = await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: initialPermissions
            });
            users.push(user);
          }

          // Verify initial state for all users
          for (const user of users) {
            await user.reload();
            expect(permissionsMatch(user.internalPermissions, initialPermissions)).toBe(true);
          }

          // Update role permissions
          const updatedCount = await updateRolePermissions(role, permissionUpdates);

          // Verify the correct number of users were updated
          expect(updatedCount).toBe(userCount);

          // Reload role to get updated permissions
          await role.reload();

          // Property assertion: All users' permissions must match updated role permissions
          for (const user of users) {
            await user.reload();
            expect(permissionsMatch(user.internalPermissions, role.defaultPermissions)).toBe(true);

            // Verify each permission individually
            for (const [permission, expectedValue] of Object.entries(role.defaultPermissions)) {
              expect(user.internalPermissions[permission]).toBe(expectedValue);
            }
          }

          // Verify all users have identical permissions
          for (let i = 1; i < users.length; i++) {
            expect(permissionsMatch(
              users[i].internalPermissions,
              users[0].internalPermissions
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sequential role updates maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        permissionsArbitrary(),
        fc.array(partialPermissionsArbitrary(), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 2, max: 4 }),
        async (roleName, initialPermissions, permissionUpdateSequence, userCount) => {
          // Create a custom role with initial permissions
          const role = await InternalRole.create({
            name: roleName,
            displayName: `Custom Role ${roleName}`,
            description: 'Test custom role',
            defaultPermissions: initialPermissions,
            isCustom: true
          });

          // Create multiple users with this role
          const users = [];
          const timestamp = Date.now();
          for (let i = 0; i < userCount; i++) {
            const user = await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              role: 'user',
              internalRole: roleName,
              internalPermissions: initialPermissions
            });
            users.push(user);
          }

          // Apply each permission update in sequence
          for (const permissionUpdate of permissionUpdateSequence) {
            await updateRolePermissions(role, permissionUpdate);
            await role.reload();

            // Property assertion: After each update, all users must have matching permissions
            for (const user of users) {
              await user.reload();
              expect(permissionsMatch(user.internalPermissions, role.defaultPermissions)).toBe(true);
            }

            // Verify all users have identical permissions
            for (let i = 1; i < users.length; i++) {
              await users[i].reload();
              expect(permissionsMatch(
                users[i].internalPermissions,
                users[0].internalPermissions
              )).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 3: Users not assigned to role are unaffected by role updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleNameArbitrary(),
        roleNameArbitrary(),
        permissionsArbitrary(),
        permissionsArbitrary(),
        partialPermissionsArbitrary(),
        userNameArbitrary(),
        userNameArbitrary(),
        emailArbitrary(),
        emailArbitrary(),
        async (roleName1, roleName2, permissions1, permissions2, permissionUpdates, userName1, userName2, email1, email2) => {
          // Ensure role names are different
          if (roleName1 === roleName2) {
            roleName2 = `${roleName2}_alt`;
          }

          // Ensure emails are different
          if (email1 === email2) {
            email2 = `alt_${email2}`;
          }

          // Create two custom roles
          const role1 = await InternalRole.create({
            name: roleName1,
            displayName: `Custom Role ${roleName1}`,
            description: 'Test custom role 1',
            defaultPermissions: permissions1,
            isCustom: true
          });

          const role2 = await InternalRole.create({
            name: roleName2,
            displayName: `Custom Role ${roleName2}`,
            description: 'Test custom role 2',
            defaultPermissions: permissions2,
            isCustom: true
          });

          // Create users with different roles
          const user1 = await User.create({
            name: userName1,
            email: email1,
            role: 'user',
            internalRole: roleName1,
            internalPermissions: permissions1
          });

          const user2 = await User.create({
            name: userName2,
            email: email2,
            role: 'user',
            internalRole: roleName2,
            internalPermissions: permissions2
          });

          // Store user2's initial permissions
          const user2InitialPermissions = { ...user2.internalPermissions };

          // Update role1 permissions
          await updateRolePermissions(role1, permissionUpdates);

          // Reload both users
          await user1.reload();
          await user2.reload();
          await role1.reload();

          // Property assertion: user1 should have updated permissions
          expect(permissionsMatch(user1.internalPermissions, role1.defaultPermissions)).toBe(true);

          // Property assertion: user2 should have unchanged permissions
          expect(permissionsMatch(user2.internalPermissions, user2InitialPermissions)).toBe(true);
          expect(permissionsMatch(user2.internalPermissions, permissions2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
