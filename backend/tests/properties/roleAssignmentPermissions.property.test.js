/**
 * Property-Based Tests for Role Assignment Permission Consistency
 * Feature: internal-user-roles, Property 2: Role assignment applies correct permissions
 * 
 * Property: For any role assignment, the user should receive exactly the permission 
 * set defined for that role
 * 
 * Validates: Requirements 7.2, 22.2
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
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
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

// Define associations
User.belongsTo(InternalRole, {
  foreignKey: 'internalRole',
  targetKey: 'name',
  as: 'roleDetails'
});

InternalRole.hasMany(User, {
  foreignKey: 'internalRole',
  sourceKey: 'name',
  as: 'users'
});

/**
 * Default permission sets for each role
 */
const ROLE_PERMISSIONS = {
  agent: {
    canOnboardProperties: true,
    canApproveOnboardings: false,
    canManageAgents: false,
    canAccessAllProperties: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canManageCommissions: false,
    canManageTerritories: false,
    canManageTickets: false,
    canBroadcastAnnouncements: false
  },
  regional_manager: {
    canOnboardProperties: true,
    canApproveOnboardings: true,
    canManageAgents: true,
    canAccessAllProperties: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canManageCommissions: true,
    canManageTerritories: true,
    canManageTickets: false,
    canBroadcastAnnouncements: false
  },
  operations_manager: {
    canOnboardProperties: false,
    canApproveOnboardings: false,
    canManageAgents: false,
    canAccessAllProperties: true,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canManageCommissions: false,
    canManageTerritories: false,
    canManageTickets: true,
    canBroadcastAnnouncements: true
  },
  platform_admin: {
    canOnboardProperties: true,
    canApproveOnboardings: true,
    canManageAgents: true,
    canAccessAllProperties: true,
    canManageSystemSettings: true,
    canViewAuditLogs: true,
    canManageCommissions: true,
    canManageTerritories: true,
    canManageTickets: true,
    canBroadcastAnnouncements: true
  },
  superuser: {
    canOnboardProperties: true,
    canApproveOnboardings: true,
    canManageAgents: true,
    canAccessAllProperties: true,
    canManageSystemSettings: true,
    canViewAuditLogs: true,
    canManageCommissions: true,
    canManageTerritories: true,
    canManageTickets: true,
    canBroadcastAnnouncements: true
  }
};

/**
 * Function to assign role to user with correct permissions
 */
async function assignRoleToUser(user, roleName) {
  const role = await InternalRole.findOne({ where: { name: roleName } });
  
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  await user.update({
    internalRole: roleName,
    internalPermissions: role.defaultPermissions
  });

  return user;
}

describe('Property 2: Role Assignment Applies Correct Permissions', () => {
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create default roles
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      await InternalRole.create({
        name: roleName,
        displayName: roleName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: `Default ${roleName} role`,
        defaultPermissions: permissions,
        isCustom: false
      });
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await User.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for internal role names
   */
  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

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
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 5, maxLength: 15 }),
      fc.constantFrom('example.com', 'test.com', 'demo.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  /**
   * Generator for phone numbers
   */
  const phoneArbitrary = () =>
    fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString());

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

  test('Property 2: User receives exact permissions defined for assigned role', async () => {
    await fc.assert(
      fc.asyncProperty(
        internalRoleArbitrary(),
        userNameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        async (roleName, userName, email, phone) => {
          // Create a user without internal role
          const user = await User.create({
            name: userName,
            email: email,
            phone: phone,
            role: 'user'
          });

          // Assign internal role to user
          await assignRoleToUser(user, roleName);

          // Reload user to get updated data
          await user.reload();

          // Get expected permissions for this role
          const expectedPermissions = ROLE_PERMISSIONS[roleName];

          // Property assertion: User's permissions must match role's default permissions
          expect(user.internalRole).toBe(roleName);
          expect(user.internalPermissions).toBeDefined();
          expect(permissionsMatch(user.internalPermissions, expectedPermissions)).toBe(true);

          // Verify each permission individually
          for (const [permission, expectedValue] of Object.entries(expectedPermissions)) {
            expect(user.internalPermissions[permission]).toBe(expectedValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Role change updates permissions correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        internalRoleArbitrary(),
        internalRoleArbitrary(),
        userNameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        async (initialRole, newRole, userName, email, phone) => {
          // Create a user with initial role
          const user = await User.create({
            name: userName,
            email: email,
            phone: phone,
            role: 'user'
          });

          // Assign initial role
          await assignRoleToUser(user, initialRole);
          await user.reload();

          // Verify initial permissions
          const initialExpectedPermissions = ROLE_PERMISSIONS[initialRole];
          expect(permissionsMatch(user.internalPermissions, initialExpectedPermissions)).toBe(true);

          // Change to new role
          await assignRoleToUser(user, newRole);
          await user.reload();

          // Verify new permissions
          const newExpectedPermissions = ROLE_PERMISSIONS[newRole];
          expect(user.internalRole).toBe(newRole);
          expect(permissionsMatch(user.internalPermissions, newExpectedPermissions)).toBe(true);

          // Verify each permission individually
          for (const [permission, expectedValue] of Object.entries(newExpectedPermissions)) {
            expect(user.internalPermissions[permission]).toBe(expectedValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Custom role permissions are applied correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        }),
        userNameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 5, maxLength: 15 }).map(chars => chars.join('')),
        async (customPermissions, userName, email, phone, customRoleName) => {
          // Create a custom role with specific permissions
          const customRole = await InternalRole.create({
            name: `custom_${customRoleName}`,
            displayName: `Custom ${customRoleName}`,
            description: 'Custom role for testing',
            defaultPermissions: customPermissions,
            isCustom: true
          });

          // Create a user
          const user = await User.create({
            name: userName,
            email: email,
            phone: phone,
            role: 'user'
          });

          // Assign custom role to user
          await user.update({
            internalRole: customRole.name,
            internalPermissions: customRole.defaultPermissions
          });

          await user.reload();

          // Property assertion: User's permissions must match custom role's permissions
          expect(user.internalRole).toBe(customRole.name);
          expect(permissionsMatch(user.internalPermissions, customPermissions)).toBe(true);

          // Verify each permission individually
          for (const [permission, expectedValue] of Object.entries(customPermissions)) {
            expect(user.internalPermissions[permission]).toBe(expectedValue);
          }

          // Clean up custom role
          await customRole.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Multiple users with same role have identical permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        internalRoleArbitrary(),
        fc.integer({ min: 2, max: 5 }),
        async (roleName, userCount) => {
          const users = [];
          const timestamp = Date.now();

          // Create multiple users with the same role
          for (let i = 0; i < userCount; i++) {
            const user = await User.create({
              name: `User ${i}`,
              email: `user${timestamp}${i}@test.com`,
              phone: `${1000000000 + timestamp % 1000000 + i}`,
              role: 'user'
            });

            await assignRoleToUser(user, roleName);
            await user.reload();
            users.push(user);
          }

          // Get expected permissions for this role
          const expectedPermissions = ROLE_PERMISSIONS[roleName];

          // Property assertion: All users must have identical permissions
          for (const user of users) {
            expect(user.internalRole).toBe(roleName);
            expect(permissionsMatch(user.internalPermissions, expectedPermissions)).toBe(true);
          }

          // Verify all users have the same permissions as each other
          for (let i = 1; i < users.length; i++) {
            expect(permissionsMatch(
              users[i].internalPermissions,
              users[0].internalPermissions
            )).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
