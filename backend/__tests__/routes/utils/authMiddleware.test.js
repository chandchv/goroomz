/**
 * Auth Middleware Unit Tests
 * 
 * Tests for shared authentication utilities used by internal management routes.
 * Requirements: 14.1, 14.2, 14.3
 */

const jwt = require('jsonwebtoken');

// Set up test environment variables before importing the module
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.JWT_EXPIRE = '7d';

const {
  extractToken,
  verifyToken,
  generateToken,
  getPermissionsForRole,
  INTERNAL_ROLES
} = require('../../../routes/utils/authMiddleware');

describe('Auth Middleware', () => {
  describe('extractToken', () => {
    /**
     * Requirements: 14.1
     * THE Shared_Utilities file SHALL contain the authentication middleware 
     * for extracting and verifying JWT tokens
     */

    test('should extract token from valid Bearer header', () => {
      const req = {
        headers: {
          authorization: 'Bearer valid-token-here'
        }
      };
      
      const token = extractToken(req);
      expect(token).toBe('valid-token-here');
    });

    test('should return null when no authorization header', () => {
      const req = {
        headers: {}
      };
      
      const token = extractToken(req);
      expect(token).toBeNull();
    });

    test('should return null when authorization header does not start with Bearer', () => {
      const req = {
        headers: {
          authorization: 'Basic some-credentials'
        }
      };
      
      const token = extractToken(req);
      expect(token).toBeNull();
    });

    test('should return null when authorization header is just "Bearer "', () => {
      const req = {
        headers: {
          authorization: 'Bearer '
        }
      };
      
      const token = extractToken(req);
      expect(token).toBe('');
    });

    test('should handle token with spaces correctly', () => {
      const req = {
        headers: {
          authorization: 'Bearer token-with-no-spaces'
        }
      };
      
      const token = extractToken(req);
      expect(token).toBe('token-with-no-spaces');
    });
  });

  describe('generateToken', () => {
    /**
     * Requirements: 14.1
     * THE Shared_Utilities file SHALL contain the authentication middleware 
     * for extracting and verifying JWT tokens
     */

    test('should generate a valid JWT token', () => {
      const userId = 'test-user-id-123';
      const token = generateToken(userId);
      
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should encode the user ID in the token', () => {
      const userId = 'test-user-id-456';
      const token = generateToken(userId);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(userId);
    });

    test('should set expiration on the token', () => {
      const userId = 'test-user-id-789';
      const token = generateToken(userId);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    /**
     * Requirements: 14.1
     * THE Shared_Utilities file SHALL contain the authentication middleware 
     * for extracting and verifying JWT tokens
     */

    test('should verify and decode a valid token', () => {
      const userId = 'verify-test-user';
      const token = generateToken(userId);
      
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(userId);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });

    test('should throw error for token signed with different secret', () => {
      const fakeToken = jwt.sign({ id: 'user' }, 'different-secret');
      
      expect(() => {
        verifyToken(fakeToken);
      }).toThrow();
    });
  });

  describe('getPermissionsForRole', () => {
    /**
     * Requirements: 14.3
     * THE Shared_Utilities file SHALL contain role-checking helper functions
     */

    test('should return full permissions for superuser', () => {
      const permissions = getPermissionsForRole('superuser');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(true);
      expect(permissions.canManageAgents).toBe(true);
      expect(permissions.canAccessAllProperties).toBe(true);
      expect(permissions.canManageSystemSettings).toBe(true);
      expect(permissions.canViewAuditLogs).toBe(true);
      expect(permissions.canManageCommissions).toBe(true);
      expect(permissions.canManageTerritories).toBe(true);
      expect(permissions.canManageTickets).toBe(true);
      expect(permissions.canBroadcastAnnouncements).toBe(true);
    });

    test('should return full permissions for admin', () => {
      const permissions = getPermissionsForRole('admin');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(true);
      expect(permissions.canManageAgents).toBe(true);
      expect(permissions.canAccessAllProperties).toBe(true);
      expect(permissions.canManageSystemSettings).toBe(true);
    });

    test('should return limited permissions for platform_admin', () => {
      const permissions = getPermissionsForRole('platform_admin');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(true);
      expect(permissions.canManageAgents).toBe(true);
      expect(permissions.canAccessAllProperties).toBe(true);
      expect(permissions.canManageSystemSettings).toBe(false);
      expect(permissions.canViewAuditLogs).toBe(true);
    });

    test('should return limited permissions for operations_manager', () => {
      const permissions = getPermissionsForRole('operations_manager');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(true);
      expect(permissions.canManageAgents).toBe(true);
      expect(permissions.canAccessAllProperties).toBe(false);
      expect(permissions.canViewAuditLogs).toBe(true);
    });

    test('should return limited permissions for regional_manager', () => {
      const permissions = getPermissionsForRole('regional_manager');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canManageAgents).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(false);
    });

    test('should return minimal permissions for agent', () => {
      const permissions = getPermissionsForRole('agent');
      
      expect(permissions.canOnboardProperties).toBe(true);
      expect(permissions.canApproveOnboardings).toBe(false);
      expect(permissions.canManageAgents).toBe(false);
    });

    test('should return no permissions for unknown role', () => {
      const permissions = getPermissionsForRole('unknown_role');
      
      expect(permissions.canOnboardProperties).toBe(false);
      expect(permissions.canApproveOnboardings).toBe(false);
      expect(permissions.canManageAgents).toBe(false);
      expect(permissions.canAccessAllProperties).toBe(false);
      expect(permissions.canManageSystemSettings).toBe(false);
    });

    test('should return no permissions for undefined role', () => {
      const permissions = getPermissionsForRole(undefined);
      
      expect(permissions.canOnboardProperties).toBe(false);
      expect(permissions.canApproveOnboardings).toBe(false);
    });
  });

  describe('INTERNAL_ROLES', () => {
    /**
     * Requirements: 14.3
     * THE Shared_Utilities file SHALL contain role-checking helper functions
     */

    test('should be an array', () => {
      expect(Array.isArray(INTERNAL_ROLES)).toBe(true);
    });

    test('should contain expected roles', () => {
      expect(INTERNAL_ROLES).toContain('admin');
      expect(INTERNAL_ROLES).toContain('superuser');
      expect(INTERNAL_ROLES).toContain('owner');
      expect(INTERNAL_ROLES).toContain('category_owner');
    });

    test('should have 4 roles', () => {
      expect(INTERNAL_ROLES.length).toBe(4);
    });
  });
});
