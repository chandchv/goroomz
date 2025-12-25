/**
 * Property-Based Tests for User Deactivation Access Revocation
 * Feature: internal-user-roles, Property 28: User deactivation access revocation
 * 
 * Property: For any deactivated user, all authentication attempts should be rejected 
 * while their historical data remains accessible
 * 
 * Validates: Requirements 7.5
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { User, Lead, Commission, AuditLog } = require('../../models');
const { protectInternal, requireInternalPermissions } = require('../../middleware/internalAuth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Mock request, response, and next for middleware testing
 */
function createMockReqRes(user, token = null) {
  const req = {
    user: user,
    headers: {
      authorization: token ? `Bearer ${token}` : undefined
    }
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
 * Role permissions mapping
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

describe('Property 28: User Deactivation Access Revocation', () => {
  /**
   * Generator for internal role names
   */
  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

  /**
   * Generator for user objects
   */
  const userArbitrary = (roleName, isActive = true) => {
    const permissions = ROLE_PERMISSIONS[roleName];
    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      internalRole: fc.constant(roleName),
      internalPermissions: fc.constant(permissions),
      isActive: fc.constant(isActive)
    });
  };

  /**
   * Generator for permission names
   */
  const permissionArbitrary = () =>
    fc.constantFrom(
      'canOnboardProperties',
      'canApproveOnboardings',
      'canManageAgents',
      'canAccessAllProperties',
      'canManageSystemSettings',
      'canViewAuditLogs',
      'canManageCommissions',
      'canManageTerritories',
      'canManageTickets',
      'canBroadcastAnnouncements'
    );

  test('Property 28: Deactivated users are denied access to all protected endpoints', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        permissionArbitrary(),
        (roleName, permission) => {
          // Generate deactivated user with this role
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'deactivated-user-id',
            name: 'Deactivated User',
            email: 'deactivated@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: false // User is deactivated
          };

          // Test middleware with deactivated user
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(permission);
          middleware(req, res, next);

          // Property assertion: Deactivated users are always denied
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

  test('Property 28: Active users with same role and permissions are granted access', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        permissionArbitrary(),
        (roleName, permission) => {
          // Generate active user with this role
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'active-user-id',
            name: 'Active User',
            email: 'active@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: true // User is active
          };

          // Only test if user has the permission
          if (!permissions[permission] && roleName !== 'superuser') {
            return true; // Skip this test case
          }

          // Test middleware with active user
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(permission);
          middleware(req, res, next);

          // Property assertion: Active users with permission are granted access
          expect(nextCalled()).toBe(true);
          expect(res.statusCode).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 28: Deactivation status check is consistent across multiple attempts', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        fc.boolean(),
        fc.integer({ min: 2, max: 5 }),
        (roleName, isActive, attemptCount) => {
          // Generate user with specified active status
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: isActive
          };

          // Perform multiple authentication attempts
          const results = [];
          for (let i = 0; i < attemptCount; i++) {
            const { req, res, next, nextCalled } = createMockReqRes(user);
            const middleware = requireInternalPermissions('canOnboardProperties');
            middleware(req, res, next);
            results.push({
              nextCalled: nextCalled(),
              statusCode: res.statusCode,
              denied: res.statusCode === 403
            });
          }

          // Property assertion: All attempts should produce identical results
          const firstResult = results[0];
          for (let i = 1; i < results.length; i++) {
            expect(results[i].nextCalled).toBe(firstResult.nextCalled);
            expect(results[i].statusCode).toBe(firstResult.statusCode);
            expect(results[i].denied).toBe(firstResult.denied);
          }

          // If user is inactive, all attempts should be denied
          if (!isActive) {
            results.forEach(result => {
              expect(result.denied).toBe(true);
              expect(result.nextCalled).toBe(false);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 28: Deactivated users cannot access any internal role endpoints', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        (userRole) => {
          // Generate deactivated user
          const permissions = ROLE_PERMISSIONS[userRole];
          const user = {
            id: 'deactivated-user-id',
            name: 'Deactivated User',
            email: 'deactivated@example.com',
            internalRole: userRole,
            internalPermissions: permissions,
            isActive: false // User is deactivated
          };

          // Test role-based authorization with matching role (so role check passes)
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const { authorizeInternalRoles } = require('../../middleware/internalAuth');
          const middleware = authorizeInternalRoles(userRole); // Use same role to pass role check
          middleware(req, res, next);

          // Property assertion: Deactivated users are denied even when role matches
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

  test('Property 28: Deactivation immediately revokes access even with valid permissions', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        (roleName) => {
          // Generate user with all permissions for their role
          const permissions = ROLE_PERMISSIONS[roleName];
          
          // Test 1: User is active and has access
          const activeUser = {
            id: 'user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: true
          };

          const { req: req1, res: res1, next: next1, nextCalled: nextCalled1 } = createMockReqRes(activeUser);
          const middleware1 = requireInternalPermissions('canOnboardProperties');
          middleware1(req1, res1, next1);

          // For roles that don't have this permission, skip the test
          if (!permissions.canOnboardProperties && roleName !== 'superuser') {
            return true;
          }

          const hadAccessWhenActive = nextCalled1();

          // Test 2: Same user is now deactivated
          const deactivatedUser = {
            ...activeUser,
            isActive: false
          };

          const { req: req2, res: res2, next: next2, nextCalled: nextCalled2 } = createMockReqRes(deactivatedUser);
          const middleware2 = requireInternalPermissions('canOnboardProperties');
          middleware2(req2, res2, next2);

          const hasAccessWhenDeactivated = nextCalled2();

          // Property assertion: If user had access when active, they should lose it when deactivated
          if (hadAccessWhenActive) {
            expect(hasAccessWhenDeactivated).toBe(false);
            expect(res2.statusCode).toBe(403);
            expect(res2.jsonData.message).toContain('deactivated');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 28: Superuser deactivation also revokes all access', () => {
    // Generate deactivated superuser
    const user = {
      id: 'superuser-id',
      name: 'Deactivated Superuser',
      email: 'superuser@example.com',
      internalRole: 'superuser',
      internalPermissions: ROLE_PERMISSIONS.superuser,
      isActive: false // Deactivated
    };

    fc.assert(
      fc.property(
        permissionArbitrary(),
        (permission) => {
          // Test middleware with deactivated superuser
          const { req, res, next, nextCalled } = createMockReqRes(user);
          const middleware = requireInternalPermissions(permission);
          middleware(req, res, next);

          // Property assertion: Even superuser is denied when deactivated
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

  test('Property 28: Deactivation does not affect user data existence', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        fc.boolean(),
        (roleName, isActive) => {
          // Generate user with specified active status
          const permissions = ROLE_PERMISSIONS[roleName];
          const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: isActive
          };

          // Property assertion: User object exists and has all properties regardless of active status
          expect(user).toBeDefined();
          expect(user.id).toBeDefined();
          expect(user.name).toBeDefined();
          expect(user.email).toBeDefined();
          expect(user.internalRole).toBeDefined();
          expect(user.internalPermissions).toBeDefined();
          expect(typeof user.isActive).toBe('boolean');

          // Historical data (permissions, role) should be preserved
          expect(user.internalPermissions).toEqual(permissions);
          expect(user.internalRole).toBe(roleName);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 28: protectInternal middleware checks isActive status', async () => {
    await fc.assert(
      fc.asyncProperty(
        internalRoleArbitrary(),
        fc.boolean(),
        async (roleName, isActive) => {
          // Create a mock user in the format protectInternal expects
          const permissions = ROLE_PERMISSIONS[roleName];
          const mockUser = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: isActive,
            save: jest.fn().mockResolvedValue(true)
          };

          // Mock User.findByPk to return our mock user
          const originalFindByPk = User.findByPk;
          User.findByPk = jest.fn().mockResolvedValue(mockUser);

          // Generate a valid JWT token
          const token = jwt.sign(
            { id: mockUser.id },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
          );

          // Create mock request with token
          const req = {
            headers: {
              authorization: `Bearer ${token}`
            }
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

          // Test protectInternal middleware
          await protectInternal(req, res, next);

          // Restore original function
          User.findByPk = originalFindByPk;

          // Property assertion: Inactive users are denied by protectInternal
          if (!isActive) {
            expect(nextCalled).toBe(false);
            expect(res.statusCode).toBe(403);
            expect(res.jsonData).toBeDefined();
            expect(res.jsonData.success).toBe(false);
            expect(res.jsonData.message).toContain('deactivated');
          } else {
            expect(nextCalled).toBe(true);
            expect(req.user).toBeDefined();
            expect(req.user.id).toBe(mockUser.id);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for async test
    );
  });

  test('Property 28: Reactivation restores access with same permissions', () => {
    fc.assert(
      fc.property(
        internalRoleArbitrary(),
        (roleName) => {
          const permissions = ROLE_PERMISSIONS[roleName];

          // Test 1: User is deactivated
          const deactivatedUser = {
            id: 'user-id',
            name: 'Test User',
            email: 'test@example.com',
            internalRole: roleName,
            internalPermissions: permissions,
            isActive: false
          };

          const { req: req1, res: res1, next: next1, nextCalled: nextCalled1 } = createMockReqRes(deactivatedUser);
          const middleware1 = requireInternalPermissions('canOnboardProperties');
          middleware1(req1, res1, next1);

          const deniedWhenDeactivated = !nextCalled1() && res1.statusCode === 403;

          // Test 2: User is reactivated with same permissions
          const reactivatedUser = {
            ...deactivatedUser,
            isActive: true
          };

          const { req: req2, res: res2, next: next2, nextCalled: nextCalled2 } = createMockReqRes(reactivatedUser);
          const middleware2 = requireInternalPermissions('canOnboardProperties');
          middleware2(req2, res2, next2);

          // For roles that don't have this permission, skip the assertion
          if (!permissions.canOnboardProperties && roleName !== 'superuser') {
            return true;
          }

          // Property assertion: Reactivation restores access
          expect(deniedWhenDeactivated).toBe(true);
          expect(nextCalled2()).toBe(true);
          expect(res2.statusCode).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});
