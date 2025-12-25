/**
 * Property-Based Tests for Role-Based Permission Enforcement
 * Feature: internal-user-roles, Property 1: Role-based permission enforcement
 * 
 * Property: For any internal user and any action, the system should only allow 
 * the action if the user's role has the required permissions for that action
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

const fc = require('fast-check');
const { authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');

/**
 * Mock request, response, and next for middleware testing
 */
function createMockReqRes(user) {
  const req = {
    user: user
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
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, nextCalled: () => nextCalled };
}

/**
 * Role hierarchy and their permissions
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
 * Actions and their required permissions
 */
const ACTION_REQUIREMENTS = {
  create_lead: { permissions: ['canOnboardProperties'] },
  approve_onboarding: { permissions: ['canApproveOnboardings'] },
  manage_agent: { permissions: ['canManageAgents'] },
  access_property: { permissions: ['canAccessAllProperties'] },
  update_system_settings: { permissions: ['canManageSystemSettings'] },
  view_audit_logs: { permissions: ['canViewAuditLogs'] },
  manage_commission: { permissions: ['canManageCommissions'] },
  manage_territory: { permissions: ['canManageTerritories'] },
  manage_ticket: { permissions: ['canManageTickets'] },
  broadcast_announcement: { permissions: ['canBroadcastAnnouncements'] }
};

describe('Property 1: Role-Based Permission Enforcement', () => {
  /**
   * Generator for internal role names
   */
  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

  /**
   * Generator for action names
   */
  const actionArbitrary = () =>
    fc.constantFrom(
      'create_lead',
      'approve_onboarding',
      'manage_agent',
      'access_property',
      'update_system_settings',
      'view_audit_logs',
      'manage_commission',
      'manage_territory',
      'manage_ticket',
      'broadcast_announcement'
    );

  /**
   * Generator for user objects
   */
  const userArbitrary = (roleName) => {
    const permissions = ROLE_PERMISSIONS[roleName];
    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      internalRole: fc.constant(roleName),
      internalPermissions: fc.constant(permissions),
      isActive: fc.constant(true)
    });
  };

  /**
   * Helper to check if user has permission
   */
  function userHasPermission(user, permission) {
    // Superuser has all permissions
    if (user.internalRole === 'superuser') {
      return true;
    }
    
    return user.internalPermissions && user.internalPermissions[permission] === true;
  }

  /**
   * Helper to check if user can perform action
   */
  function userCanPerformAction(user, action) {
    const actionReq = ACTION_REQUIREMENTS[action];
    if (!actionReq) return false;

    // Check if user has all required permissions
    return actionReq.permissions.every(permission => userHasPermission(user, permission));
  }

  test('Property 1: Users can only perform actions their role permits', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        actionArbitrary(),
        (roleName, action) => {
          // Generate user with this role
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: true
          };

          // Determine if user should be able to perform action
          const shouldAllow = userCanPerformAction(user, action);

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Test middleware
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(...requiredPermissions);
          middleware(req, res, next);

          // Property assertion: Access granted/denied matches expected
          if (shouldAllow) {
            // Should call next() and not set error response
            expect(nextCalled()).toBe(true);
            expect(res.statusCode).toBe(200);
          } else {
            // Should not call next() and set 403 error
            expect(nextCalled()).toBe(false);
            expect(res.statusCode).toBe(403);
            expect(res.jsonData).toBeDefined();
            expect(res.jsonData.success).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Role-based access control enforces role hierarchy', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        internalRoleArbitrary(),
        (userRole, requiredRole) => {
          // Generate user with userRole
          const permissions = ROLE_PERMISSIONS[userRole];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: userRole,
            internalPermissions: permissions,
            isActive: true
          };

          // Test if user can access endpoint requiring requiredRole
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = authorizeInternalRoles(requiredRole);
          middleware(req, res, next);

          // Property assertion: Access granted only if roles match
          if (userRole === requiredRole) {
            expect(nextCalled()).toBe(true);
            expect(res.statusCode).toBe(200);
          } else {
            expect(nextCalled()).toBe(false);
            expect(res.statusCode).toBe(403);
            expect(res.jsonData).toBeDefined();
            expect(res.jsonData.success).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Inactive users are denied access regardless of permissions', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        actionArbitrary(),
        (roleName, action) => {
          // Generate inactive user with this role
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: false // User is inactive
          };

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Test middleware
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(...requiredPermissions);
          middleware(req, res, next);

          // Property assertion: Inactive users are always denied
          expect(nextCalled()).toBe(false);
          expect(res.statusCode).toBe(403);
          expect(res.jsonData).toBeDefined();
          expect(res.jsonData.success).toBe(false);
          expect(res.jsonData.message).toContain('deactivated');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Superuser has access to all actions', () => {
    fc.assert(
      fc.property(
        actionArbitrary(),
        (action) => {
          // Generate superuser
          const user = {
            id: 'superuser-id',
            name: 'Super User',
            email: 'super@example.com',
            internalRole: 'superuser',
            internalPermissions: ROLE_PERMISSIONS.superuser,
            isActive: true
          };

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Test middleware
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(...requiredPermissions);
          middleware(req, res, next);

          // Property assertion: Superuser always has access
          expect(nextCalled()).toBe(true);
          expect(res.statusCode).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Users without internal role are denied access', () => {
    fc.assert(
      fc.property(
        actionArbitrary(),
        (action) => {
          // Generate user without internal role
          const user = {
            id: 'regular-user-id',
            name: 'Regular User',
            email: 'user@example.com',
            role: 'user',
            internalRole: null, // No internal role
            internalPermissions: null,
            isActive: true
          };

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Test middleware
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(...requiredPermissions);
          middleware(req, res, next);

          // Property assertion: Users without internal role are denied
          expect(nextCalled()).toBe(false);
          expect(res.statusCode).toBe(403);
          expect(res.jsonData).toBeDefined();
          expect(res.jsonData.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Multiple role authorization allows any matching role', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        fc.array(internalRoleArbitrary(), { minLength: 1, maxLength: 3 }),
        (userRole, allowedRoles) => {
          // Generate user with userRole
          const permissions = ROLE_PERMISSIONS[userRole];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: userRole,
            internalPermissions: permissions,
            isActive: true
          };

          // Test if user can access endpoint requiring any of allowedRoles
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = authorizeInternalRoles(...allowedRoles);
          middleware(req, res, next);

          // Property assertion: Access granted if user role is in allowed roles
          const shouldAllow = allowedRoles.includes(userRole);
          if (shouldAllow) {
            expect(nextCalled()).toBe(true);
            expect(res.statusCode).toBe(200);
          } else {
            expect(nextCalled()).toBe(false);
            expect(res.statusCode).toBe(403);
            expect(res.jsonData).toBeDefined();
            expect(res.jsonData.success).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Permission enforcement is consistent across multiple checks', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        actionArbitrary(),
        fc.integer({ min: 2, max: 5 }),
        (roleName, action, checkCount) => {
          // Generate user with this role
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: true
          };

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Perform multiple checks
          const results = [];
          for (let i = 0; i < checkCount; i++) {
            const { req, res, next, nextCalled } = createMockReqRes(user);
            const middleware = requireInternalPermissions(...requiredPermissions);
            middleware(req, res, next);
            results.push({
              nextCalled: nextCalled(),
              statusCode: res.statusCode
            });
          }

          // Property assertion: All checks should produce identical results
          const firstResult = results[0];
          for (let i = 1; i < results.length; i++) {
            expect(results[i].nextCalled).toBe(firstResult.nextCalled);
            expect(results[i].statusCode).toBe(firstResult.statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Agent cannot access regional manager functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('approve_onboarding', 'manage_agent', 'manage_commission', 'manage_territory'),
        (action) => {
          // Generate agent user
          const user = {
            id: 'agent-id',
            name: 'Agent User',
            email: 'agent@example.com',
            internalRole: 'agent',
            internalPermissions: ROLE_PERMISSIONS.agent,
            isActive: true
          };

          // Get required permissions for action
          const requiredPermissions = ACTION_REQUIREMENTS[action].permissions;

          // Test middleware
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(...requiredPermissions);
          middleware(req, res, next);

          // Property assertion: Agent is denied access to regional manager functions
          expect(nextCalled()).toBe(false);
          expect(res.statusCode).toBe(403);
          expect(res.jsonData).toBeDefined();
          expect(res.jsonData.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: Regional manager cannot modify system settings', () => {
    const user = {
      id: 'rm-id',
      name: 'Regional Manager',
      email: 'rm@example.com',
      internalRole: 'regional_manager',
      internalPermissions: ROLE_PERMISSIONS.regional_manager,
      isActive: true
    };

    // Test access to system settings
    const { req, res, next, nextCalled } = createMockReqRes(user);
    const middleware = requireInternalPermissions('canManageSystemSettings');
    middleware(req, res, next);

    // Property assertion: Regional manager is denied
    expect(nextCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toBeDefined();
    expect(res.jsonData.success).toBe(false);
  });

  test('Property 1: Operations manager has full property access', () => {
    const user = {
      id: 'om-id',
      name: 'Operations Manager',
      email: 'om@example.com',
      internalRole: 'operations_manager',
      internalPermissions: ROLE_PERMISSIONS.operations_manager,
      isActive: true
    };

    // Test access to all properties
    const { req, res, next, nextCalled } = createMockReqRes(user);
    const middleware = requireInternalPermissions('canAccessAllProperties');
    middleware(req, res, next);

    // Property assertion: Operations manager has access
    expect(nextCalled()).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
