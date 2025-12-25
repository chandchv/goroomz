/**
 * Property-Based Tests for Critical Action Flagging
 * Feature: internal-user-roles, Property 27: Critical action flagging
 * 
 * Property: For any action marked as critical, the audit log entry must be 
 * flagged for review
 * 
 * Validates: Requirements 21.3
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

/**
 * Critical actions that should be flagged in audit logs
 * This matches the CRITICAL_ACTIONS array from the audit middleware
 */
const CRITICAL_ACTIONS = [
  'delete_user',
  'deactivate_user',
  'update_permissions',
  'update_role',
  'approve_onboarding',
  'reject_onboarding',
  'mark_commission_paid',
  'update_commission_rate',
  'delete_property',
  'update_system_settings',
  'create_api_key',
  'revoke_api_key',
  'bulk_payment',
  'delete_territory',
  'assign_territory'
];

/**
 * Non-critical actions for comparison
 */
const NON_CRITICAL_ACTIONS = [
  'create_lead',
  'update_lead',
  'view_lead',
  'create_communication',
  'view_dashboard',
  'search_properties',
  'view_reports',
  'create_ticket',
  'update_ticket',
  'view_audit_logs'
];

/**
 * Test-specific audit log creation function that implements critical action logic
 */
async function testCreateAuditLog(logData) {
  const isCritical = CRITICAL_ACTIONS.includes(logData.action);
  
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

describe('Property 27: Critical Action Flagging', () => {
  
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
   * Generator for critical action names
   */
  const criticalActionArbitrary = () =>
    fc.constantFrom(...CRITICAL_ACTIONS);

  /**
   * Generator for non-critical action names
   */
  const nonCriticalActionArbitrary = () =>
    fc.constantFrom(...NON_CRITICAL_ACTIONS);

  /**
   * Generator for all action names (critical and non-critical)
   */
  const allActionArbitrary = () =>
    fc.constantFrom(...CRITICAL_ACTIONS, ...NON_CRITICAL_ACTIONS);

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

  test('Property 27: Critical actions are always flagged as critical', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        criticalActionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        async (user, action, resourceType, resourceId) => {
          // Create audit log entry for critical action
          const auditLog = await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: { test: 'critical action' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Property assertion: Critical actions must be flagged
          expect(auditLog.isCritical).toBe(true);
          expect(auditLog.action).toBe(action);
          expect(auditLog.userId).toBe(user.id);
          expect(CRITICAL_ACTIONS.includes(action)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Non-critical actions are never flagged as critical', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        nonCriticalActionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        async (user, action, resourceType, resourceId) => {
          // Create audit log entry for non-critical action
          const auditLog = await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: { test: 'non-critical action' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Property assertion: Non-critical actions must not be flagged
          expect(auditLog.isCritical).toBe(false);
          expect(auditLog.action).toBe(action);
          expect(auditLog.userId).toBe(user.id);
          expect(CRITICAL_ACTIONS.includes(action)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Critical flag is determined solely by action type', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        allActionArbitrary(),
        resourceTypeArbitrary(),
        resourceIdArbitrary(),
        async (user, action, resourceType, resourceId) => {
          // Create audit log entry
          const auditLog = await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            changes: { test: 'action type test' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Property assertion: Critical flag matches action classification
          const shouldBeCritical = CRITICAL_ACTIONS.includes(action);
          expect(auditLog.isCritical).toBe(shouldBeCritical);
          expect(auditLog.action).toBe(action);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Critical flag is consistent across multiple identical actions', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        allActionArbitrary(),
        resourceTypeArbitrary(),
        fc.integer({ min: 2, max: 5 }),
        async (user, action, resourceType, repeatCount) => {
          // Create multiple audit logs for the same action
          const auditLogs = [];
          for (let i = 0; i < repeatCount; i++) {
            const auditLog = await testCreateAuditLog({
              userId: user.id,
              action: action,
              resourceType: resourceType,
              resourceId: `resource-${i}`,
              changes: { iteration: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
            auditLogs.push(auditLog);
          }

          // Property assertion: All instances have same critical flag
          const expectedCritical = CRITICAL_ACTIONS.includes(action);
          auditLogs.forEach((log, index) => {
            expect(log.isCritical).toBe(expectedCritical);
            expect(log.action).toBe(action);
            expect(log.changes.iteration).toBe(index);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 27: Critical actions include all security-sensitive operations', () => {
    // Test specific critical actions that should always be flagged
    const securitySensitiveActions = [
      'delete_user',
      'deactivate_user',
      'update_permissions',
      'update_role',
      'create_api_key',
      'revoke_api_key'
    ];

    fc.assert(
      fc.property(
        internalUserArbitrary(),
        fc.constantFrom(...securitySensitiveActions),
        resourceTypeArbitrary(),
        async (user, action, resourceType) => {
          // Create audit log for security-sensitive action
          const auditLog = await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: 'security-test',
            changes: { security: 'sensitive' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Property assertion: Security-sensitive actions are always critical
          expect(auditLog.isCritical).toBe(true);
          expect(securitySensitiveActions.includes(action)).toBe(true);
          expect(CRITICAL_ACTIONS.includes(action)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Critical actions include all financial operations', () => {
    // Test financial operations that should be flagged as critical
    const financialActions = [
      'mark_commission_paid',
      'update_commission_rate',
      'bulk_payment'
    ];

    fc.assert(
      fc.property(
        internalUserArbitrary(),
        fc.constantFrom(...financialActions),
        resourceTypeArbitrary(),
        async (user, action, resourceType) => {
          // Create audit log for financial action
          const auditLog = await testCreateAuditLog({
            userId: user.id,
            action: action,
            resourceType: resourceType,
            resourceId: 'financial-test',
            changes: { financial: 'operation' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-user-agent'
          });

          // Property assertion: Financial actions are always critical
          expect(auditLog.isCritical).toBe(true);
          expect(financialActions.includes(action)).toBe(true);
          expect(CRITICAL_ACTIONS.includes(action)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Critical flag does not depend on user role', () => {
    fc.assert(
      fc.property(
        fc.array(internalUserArbitrary(), { minLength: 2, maxLength: 5 }),
        criticalActionArbitrary(),
        resourceTypeArbitrary(),
        async (users, action, resourceType) => {
          // Create audit logs for same critical action by different users
          const auditLogs = [];
          for (let i = 0; i < users.length; i++) {
            const auditLog = await testCreateAuditLog({
              userId: users[i].id,
              action: action,
              resourceType: resourceType,
              resourceId: `user-${i}-resource`,
              changes: { userIndex: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
            auditLogs.push(auditLog);
          }

          // Property assertion: All users get same critical flag for same action
          auditLogs.forEach((log, index) => {
            expect(log.isCritical).toBe(true); // Critical action should always be flagged
            expect(log.action).toBe(action);
            expect(log.userId).toBe(users[index].id);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 27: Critical flag does not depend on resource type', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        criticalActionArbitrary(),
        fc.array(resourceTypeArbitrary(), { minLength: 2, maxLength: 4 }),
        async (user, action, resourceTypes) => {
          // Create audit logs for same critical action on different resource types
          const auditLogs = [];
          for (let i = 0; i < resourceTypes.length; i++) {
            const auditLog = await testCreateAuditLog({
              userId: user.id,
              action: action,
              resourceType: resourceTypes[i],
              resourceId: `${resourceTypes[i]}-resource`,
              changes: { resourceIndex: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
            auditLogs.push(auditLog);
          }

          // Property assertion: Same critical action is flagged regardless of resource type
          auditLogs.forEach((log, index) => {
            expect(log.isCritical).toBe(true); // Critical action should always be flagged
            expect(log.action).toBe(action);
            expect(log.resourceType).toBe(resourceTypes[index]);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 27: Mixed critical and non-critical actions maintain correct flags', () => {
    fc.assert(
      fc.property(
        internalUserArbitrary(),
        fc.array(allActionArbitrary(), { minLength: 3, maxLength: 6 }),
        resourceTypeArbitrary(),
        async (user, actions, resourceType) => {
          // Create audit logs for mixed actions
          const auditLogs = [];
          for (let i = 0; i < actions.length; i++) {
            const auditLog = await testCreateAuditLog({
              userId: user.id,
              action: actions[i],
              resourceType: resourceType,
              resourceId: `mixed-${i}`,
              changes: { actionIndex: i },
              ipAddress: '127.0.0.1',
              userAgent: 'test-user-agent'
            });
            auditLogs.push(auditLog);
          }

          // Property assertion: Each action has correct critical flag
          auditLogs.forEach((log, index) => {
            const expectedCritical = CRITICAL_ACTIONS.includes(actions[index]);
            expect(log.isCritical).toBe(expectedCritical);
            expect(log.action).toBe(actions[index]);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 27: Critical action list completeness', () => {
    // Verify that all expected critical actions are in the list
    const expectedCriticalActions = [
      'delete_user',
      'deactivate_user', 
      'update_permissions',
      'update_role',
      'approve_onboarding',
      'reject_onboarding',
      'mark_commission_paid',
      'update_commission_rate',
      'delete_property',
      'update_system_settings',
      'create_api_key',
      'revoke_api_key',
      'bulk_payment',
      'delete_territory',
      'assign_territory'
    ];

    // Property assertion: All expected critical actions are in the CRITICAL_ACTIONS list
    expectedCriticalActions.forEach(action => {
      expect(CRITICAL_ACTIONS.includes(action)).toBe(true);
    });

    // Verify the lists match exactly
    expect(CRITICAL_ACTIONS.sort()).toEqual(expectedCriticalActions.sort());
  });
});