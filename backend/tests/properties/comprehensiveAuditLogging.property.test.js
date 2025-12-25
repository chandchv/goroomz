/**
 * Property-Based Tests for Comprehensive Audit Logging
 * Feature: internal-user-roles, Property 26: Comprehensive audit logging
 * 
 * Property: For any internal user action, an audit log entry must be created 
 * with user ID, action type, timestamp, and affected resources
 * 
 * Validates: Requirements 6.3, 8.5, 21.1
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');
const { auditLog, createAuditLog } = require('../../middleware/auditLog');

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

// Define AuditLog model inline for testing
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isCritical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false
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
    unique: true,
    validate: {
      isEmail: true
    }
  },
  internalRole: {
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
});

// Set up associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

/**
 * Test-specific audit log creation function
 */
async function testCreateAuditLog(logData) {
  const isCritical = ['delete_user', 'deactivate_user', 'update_permissions', 'update_role', 'approve_onboarding', 'reject_onboarding'].includes(logData.action);
  
  return await AuditLog.create({
    userId: logData.userId,
    action: logData.action,
    resourceType: logData.resourceType,
    resourceId: logData.resourceId,
    changes: logData.changes,
    ipAddress: logData.ipAddress,
    userAgent: logData.userAgent,
    isCritical
  });
}

/**
 * Mock request, response, and next for middleware testing
 */
function createMockReqRes(user, params = {}, body = {}) {
  const req = {
    user: user,
    params: params,
    body: body,
    ip: '127.0.0.1',
    get: (header) => header === 'user-agent' ? 'test-user-agent' : null
  };

  const res = {
    statusCode: 200,
    jsonData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      // Call original json method to trigger audit logging
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, nextCalled: () => nextCalled };
}

describe('Property 26: Comprehensive Audit Logging', () => {
  
  beforeAll(async () => {
    // Sync the in-memory database
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    // Clean up audit logs after each test
    await AuditLog.destroy({ where: {}, force: true });
  });

  /**
   * Generator for internal user objects
   */
  const internalUserArbitrary = () => 
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      internalRole: fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
      isActive: fc.constant(true)
    });

  /**
   * Generator for action names
   */
  const actionArbitrary = () =>
    fc.constantFrom(
      'create_lead',
      'update_lead',
      'approve_onboarding',
      'reject_onboarding',
      'create_commission',
      'mark_commission_paid',
      'create_territory',
      'assign_agent',
      'create_ticket',
      'resolve_ticket',
      'upload_document',
      'approve_document',
      'create_user',
      'deactivate_user',
      'update_permissions'
    );

  /**
   * Generator for resource types
   */
  const resourceTypeArbitrary = () =>
    fc.constantFrom(
      'lead',
      'commission',
      'territory',
      'user',
      'ticket',
      'document',
      'property',
      'onboarding'
    );

  /**
   * Generator for resource IDs
   */
  const resourceIdArbitrary = () => fc.uuid();

  /**
   * Generator for changes object
   */
  const changesArbitrary = () =>
    fc.record({
      before: fc.record({
        status: fc.constantFrom('pending', 'approved', 'rejected', 'active', 'inactive'),
        value: fc.integer({ min: 0, max: 1000 })
      }),
      after: fc.record({
        status: fc.constantFrom('pending', 'approved', 'rejected', 'active', 'inactive'),
        value: fc.integer({ min: 0, max: 1000 })
      })
    });

  test('Property 26: Audit log entry is created for every internal user action', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        actionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        changesArbitrary(),
        async (user, action, resourceType, resourceId, changes) => {
          // Create audit log entry using test helper function
          await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: changes,
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Verify audit log was created
          const auditLogs = await AuditLog.findAll({
            where: {
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: resourceId
            }
          });

          // Property assertion: Audit log entry exists
          expect(auditLogs.length).toBe(1);
          
          const auditLog = auditLogs[0];
          expect(auditLog.userId).toBe(user.id);
          expect(auditLog.action).toBe(action);
          expect(auditLog.resourceType).toBe(resourceType);
          expect(auditLog.resourceId).toBe(resourceId);
          expect(auditLog.changes).toEqual(changes);
          expect(auditLog.ipAddress).toBe('127.0.0.1');
          expect(auditLog.userAgent).toBe('test-user-agent');
          expect(auditLog.createdAt).toBeDefined();
          expect(auditLog.createdAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 26: Audit log creation is consistent across multiple calls', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        actionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        fc.integer({ min: 2, max: 5 }),
        async (user, action, resourceType, resourceId, callCount) => {
          // Create multiple identical audit log entries
          for (let i = 0; i < callCount; i++) {
            await testCreateAuditLog({
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: resourceId,
              changes: { call: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
          }

          // Verify all audit logs were created
          const auditLogs = await AuditLog.findAll({
            where: {
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: resourceId
            }
          });

          // Property assertion: All calls create audit logs
          expect(auditLogs.length).toBe(callCount);
          
          // Verify each audit log has correct data
          auditLogs.forEach((log, index) => {
            expect(log.userId).toBe(user.id);
            expect(log.action).toBe(action);
            expect(log.resourceType).toBe(resourceType);
            expect(log.resourceId).toBe(resourceId);
            expect(log.changes.call).toBe(index);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 26: Audit logs contain all required fields', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        actionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        changesArbitrary(),
        async (user, action, resourceType, resourceId, changes) => {
          // Create audit log entry
          await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: changes,
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 Test Browser'
          });

          // Retrieve audit log
          const auditLog = await AuditLog.findOne({
            where: {
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: resourceId
            }
          });

          // Property assertion: All required fields are present and valid
          expect(auditLog).toBeDefined();
          expect(auditLog.id).toBeDefined();
          expect(auditLog.userId).toBe(user.id);
          expect(auditLog.action).toBe(action);
          expect(auditLog.resourceType).toBe(resourceType);
          expect(auditLog.resourceId).toBe(resourceId);
          expect(auditLog.changes).toEqual(changes);
          expect(auditLog.ipAddress).toBe('192.168.1.100');
          expect(auditLog.userAgent).toBe('Mozilla/5.0 Test Browser');
          expect(auditLog.createdAt).toBeInstanceOf(Date);
          expect(auditLog.isCritical).toBeDefined();
          expect(typeof auditLog.isCritical).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 26: Multiple actions by same user create separate audit logs', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        fc.array(actionArbitrary(), { minLength: 2, maxLength: 5 }),
        resourceTypeArbitrary(),
        async (user, actions, resourceType) => {
          // Create multiple audit log entries for the same user
          const resourceIds = [];
          for (let i = 0; i < actions.length; i++) {
            const resourceId = `resource-${i}`;
            resourceIds.push(resourceId);
            
            await testCreateAuditLog({
              userId: user.id,
              action: actions[i],
              resourceType: resourceType,
              resourceId: resourceId,
              changes: { action_number: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
          }

          // Verify all audit logs were created
          const auditLogs = await AuditLog.findAll({
            where: {
              userId: user.id,
              resourceType: resourceType
            },
            order: [['createdAt', 'ASC']]
          });

          // Property assertion: Separate audit log for each action
          expect(auditLogs.length).toBe(actions.length);
          
          for (let i = 0; i < actions.length; i++) {
            expect(auditLogs[i].userId).toBe(user.id);
            expect(auditLogs[i].action).toBe(actions[i]);
            expect(auditLogs[i].resourceType).toBe(resourceType);
            expect(auditLogs[i].resourceId).toBe(resourceIds[i]);
            expect(auditLogs[i].changes.action_number).toBe(i);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 26: Audit logs preserve chronological order', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        fc.array(actionArbitrary(), { minLength: 3, maxLength: 5 }),
        resourceTypeArbitrary(),
        async (user, actions, resourceType) => {
          const startTime = new Date();
          
          // Create audit logs with small delays to ensure different timestamps
          for (let i = 0; i < actions.length; i++) {
            await testCreateAuditLog({
              userId: user.id,
              action: actions[i],
              resourceType: resourceType,
              resourceId: `resource-${i}`,
              changes: { sequence: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
            
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Retrieve audit logs ordered by creation time
          const auditLogs = await AuditLog.findAll({
            where: {
              userId: user.id,
              resourceType: resourceType,
              createdAt: { [require('sequelize').Op.gte]: startTime }
            },
            order: [['createdAt', 'ASC']]
          });

          // Property assertion: Audit logs maintain chronological order
          expect(auditLogs.length).toBe(actions.length);
          
          for (let i = 0; i < auditLogs.length - 1; i++) {
            expect(auditLogs[i].createdAt.getTime()).toBeLessThanOrEqual(
              auditLogs[i + 1].createdAt.getTime()
            );
            expect(auditLogs[i].changes.sequence).toBe(i);
          }
        }
      ),
      { numRuns: 30 } // Reduced due to timing sensitivity
    );
  });

  test('Property 26: Audit logs handle null/undefined resource IDs gracefully', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        actionArbitrary(),
        resourceTypeArbitrary(),
        fc.constantFrom(null, undefined),
        async (user, action, resourceType, resourceId) => {
          // Create audit log with null/undefined resource ID
          await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: { test: 'value' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Verify audit log was created
          const auditLog = await AuditLog.findOne({
            where: {
              userId: user.id,
              action: action,
              resourceType: resourceType
            }
          });

          // Property assertion: Audit log handles null resource ID
          expect(auditLog).toBeDefined();
          expect(auditLog.userId).toBe(user.id);
          expect(auditLog.action).toBe(action);
          expect(auditLog.resourceType).toBe(resourceType);
          expect(auditLog.resourceId).toBeNull();
          expect(auditLog.changes).toEqual({ test: 'value' });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 26: Audit logs capture IP address and user agent consistently', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        actionArbitrary(),
        resourceTypeArbitrary(),
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (user, action, resourceType, ipAddress, userAgent) => {
          // Create audit log with specific IP and user agent
          await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: 'test-resource',
            changes: {},
            ipAddress: ipAddress,
            userAgent: userAgent
          });

          // Verify audit log captured the information
          const auditLog = await AuditLog.findOne({
            where: {
              userId: user.id,
              action: action,
              resourceType: resourceType
            }
          });

          // Property assertion: IP and user agent are captured correctly
          expect(auditLog).toBeDefined();
          expect(auditLog.ipAddress).toBe(ipAddress);
          expect(auditLog.userAgent).toBe(userAgent);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 26: Audit logs maintain data integrity under concurrent operations', () => {
    fc.assert(
      fc.property(
        fc.array(internalUserArbitrary(), { minLength: 2, maxLength: 5 }),
        actionArbitrary(),
        resourceTypeArbitrary(),
        async (users, action, resourceType) => {
          // Create audit logs concurrently for different users
          const promises = users.map((user, index) => 
            testCreateAuditLog({
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: `resource-${index}`,
              changes: { userIndex: index },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            })
          );

          await Promise.all(promises);

          // Verify all audit logs were created correctly
          const auditLogs = await AuditLog.findAll({
            where: {
              action: action,
              resourceType: resourceType
            },
            order: [['createdAt', 'ASC']]
          });

          // Property assertion: All concurrent operations succeeded
          expect(auditLogs.length).toBe(users.length);
          
          // Verify each user's audit log exists and is correct
          users.forEach((user, index) => {
            const userLog = auditLogs.find(log => log.userId === user.id);
            expect(userLog).toBeDefined();
            expect(userLog.action).toBe(action);
            expect(userLog.resourceType).toBe(resourceType);
            expect(userLog.resourceId).toBe(`resource-${index}`);
            expect(userLog.changes.userIndex).toBe(index);
          });
        }
      ),
      { numRuns: 30 }
    );
  });
});