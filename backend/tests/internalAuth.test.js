/**
 * Internal Authentication Middleware and Routes Tests
 * Tests for Requirements: 32.1, 33.1, 33.2, 33.3, 33.4, 33.5
 */

const jwt = require('jsonwebtoken');

// Mock environment
process.env.JWT_SECRET = 'test-secret-key';

// Mock User model
const mockUsers = {
  admin: {
    id: '1',
    email: 'admin@test.com',
    role: 'admin',
    staffRole: null,
    internalRole: null,
    permissions: null,
    password: '$2a$12$hashedpassword',
    save: jest.fn().mockResolvedValue(true)
  },
  owner: {
    id: '2',
    email: 'owner@test.com',
    role: 'owner',
    staffRole: null,
    internalRole: null,
    permissions: null,
    password: '$2a$12$hashedpassword',
    save: jest.fn().mockResolvedValue(true)
  },
  frontDesk: {
    id: '3',
    email: 'frontdesk@test.com',
    role: 'user',
    staffRole: 'front_desk',
    internalRole: null,
    permissions: {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: false,
      canRecordPayments: true,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    },
    password: '$2a$12$hashedpassword',
    save: jest.fn().mockResolvedValue(true)
  },
  housekeeping: {
    id: '4',
    email: 'housekeeping@test.com',
    role: 'user',
    staffRole: 'housekeeping',
    internalRole: null,
    permissions: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: true,
      canManageMaintenance: false
    },
    password: '$2a$12$hashedpassword',
    save: jest.fn().mockResolvedValue(true)
  },
  regularUser: {
    id: '5',
    email: 'user@test.com',
    role: 'user',
    staffRole: null,
    internalRole: null,
    permissions: null,
    password: '$2a$12$hashedpassword',
    save: jest.fn().mockResolvedValue(true)
  },
  platformStaff: {
    id: '6',
    email: 'agent@test.com',
    role: 'user',
    internalRole: 'agent',
    staffRole: null,
    isActive: true,
    internalPermissions: {
      canOnboardProperties: true,
      canManageLeads: true
    },
    isPlatformStaff: function() { return true; },
    isPropertyOwner: function() { return false; },
    isPropertyStaff: function() { return false; },
    getUserType: function() { return 'platform_staff'; },
    save: jest.fn().mockResolvedValue(true)
  },
  superuser: {
    id: '7',
    email: 'superuser@test.com',
    role: 'user',
    internalRole: 'superuser',
    staffRole: null,
    isActive: true,
    internalPermissions: {},
    isPlatformStaff: function() { return true; },
    isPropertyOwner: function() { return false; },
    isPropertyStaff: function() { return false; },
    getUserType: function() { return 'platform_staff'; },
    save: jest.fn().mockResolvedValue(true)
  },
  propertyOwner: {
    id: '8',
    email: 'propertyowner@test.com',
    role: 'owner',
    internalRole: null,
    staffRole: null,
    isPlatformStaff: function() { return false; },
    isPropertyOwner: function() { return true; },
    isPropertyStaff: function() { return false; },
    getUserType: function() { return 'property_owner'; },
    save: jest.fn().mockResolvedValue(true)
  },
  propertyStaff: {
    id: '9',
    email: 'propertystaff@test.com',
    role: 'user',
    internalRole: null,
    staffRole: 'front_desk',
    isActive: true,
    isPlatformStaff: function() { return false; },
    isPropertyOwner: function() { return false; },
    isPropertyStaff: function() { return true; },
    getUserType: function() { return 'property_staff'; },
    save: jest.fn().mockResolvedValue(true)
  },
  inactivePlatformStaff: {
    id: '10',
    email: 'inactive@test.com',
    role: 'user',
    internalRole: 'agent',
    staffRole: null,
    isActive: false,
    isPlatformStaff: function() { return true; },
    isPropertyOwner: function() { return false; },
    isPropertyStaff: function() { return false; },
    getUserType: function() { return 'platform_staff'; },
    save: jest.fn().mockResolvedValue(true)
  }
};

// Mock request and response
const createMockReq = (token = null, user = null) => ({
  headers: {
    authorization: token ? `Bearer ${token}` : undefined
  },
  user: user
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Import middleware after mocking
jest.mock('../models', () => ({
  User: {
    findByPk: jest.fn((id) => {
      const user = Object.values(mockUsers).find(u => u.id === id);
      return Promise.resolve(user || null);
    })
  }
}));

const {
  protectInternal,
  authorizeRoles,
  authorizeStaffRoles,
  requirePermissions,
  requireSuperuser,
  requirePlatformRole,
  requirePropertyOwner,
  requirePropertyStaff
} = require('../middleware/internalAuth');

describe('Internal Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protectInternal', () => {
    test('should reject request without token', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid token', async () => {
      const req = createMockReq('invalid-token');
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token is not valid or has expired.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should accept valid token for admin user', async () => {
      const token = jwt.sign({ id: '1' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should accept valid token for owner user', async () => {
      const token = jwt.sign({ id: '2' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('owner');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should accept valid token for staff user', async () => {
      const token = jwt.sign({ id: '3' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.staffRole).toBe('front_desk');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject regular user without staff role', async () => {
      const token = jwt.sign({ id: '5' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();

      await protectInternal(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for internal management only.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizeRoles', () => {
    test('should allow admin role', () => {
      const middleware = authorizeRoles('admin', 'owner');
      const req = createMockReq(null, mockUsers.admin);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject unauthorized role', () => {
      const middleware = authorizeRoles('admin');
      const req = createMockReq(null, mockUsers.owner);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizeStaffRoles', () => {
    test('should allow admin to access all staff functions', () => {
      const middleware = authorizeStaffRoles('front_desk');
      const req = createMockReq(null, mockUsers.admin);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow matching staff role', () => {
      const middleware = authorizeStaffRoles('front_desk', 'housekeeping');
      const req = createMockReq(null, mockUsers.frontDesk);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject non-matching staff role', () => {
      const middleware = authorizeStaffRoles('maintenance');
      const req = createMockReq(null, mockUsers.frontDesk);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermissions', () => {
    test('should allow admin all permissions', () => {
      const middleware = requirePermissions('canManageRooms', 'canManageStaff');
      const req = createMockReq(null, mockUsers.admin);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow user with required permissions', () => {
      const middleware = requirePermissions('canCheckIn', 'canCheckOut');
      const req = createMockReq(null, mockUsers.frontDesk);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject user without required permissions', () => {
      const middleware = requirePermissions('canManageStaff');
      const req = createMockReq(null, mockUsers.frontDesk);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required permissions: canManageStaff'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperuser', () => {
    test('should allow admin', () => {
      const req = createMockReq(null, mockUsers.admin);
      const res = createMockRes();

      requireSuperuser(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject non-admin', () => {
      const req = createMockReq(null, mockUsers.owner);
      const res = createMockRes();

      requireSuperuser(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Superuser privileges required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePlatformRole', () => {
    test('should allow platform staff with any internal role', () => {
      const middleware = requirePlatformRole();
      const req = createMockReq(null, mockUsers.platformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow platform staff with specific required role', () => {
      const middleware = requirePlatformRole('superuser', 'agent');
      const req = createMockReq(null, mockUsers.platformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject platform staff without required specific role', () => {
      const middleware = requirePlatformRole('superuser', 'platform_admin');
      const req = createMockReq(null, mockUsers.platformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required platform roles: superuser, platform_admin',
        currentRole: 'agent'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject property owner', () => {
      const middleware = requirePlatformRole();
      const req = createMockReq(null, mockUsers.propertyOwner);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for platform staff only.',
        userType: 'property_owner'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject inactive platform staff', () => {
      const middleware = requirePlatformRole();
      const req = createMockReq(null, mockUsers.inactivePlatformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Your account has been deactivated.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      const middleware = requirePlatformRole();
      const req = createMockReq(null, null);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePropertyOwner', () => {
    test('should allow property owner', () => {
      const middleware = requirePropertyOwner();
      const req = createMockReq(null, mockUsers.propertyOwner);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject platform staff without override', () => {
      const middleware = requirePropertyOwner(false);
      const req = createMockReq(null, mockUsers.platformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for property owners only.',
        userType: 'platform_staff'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow superuser with override enabled', () => {
      const middleware = requirePropertyOwner(true);
      const req = createMockReq(null, mockUsers.superuser);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject property staff', () => {
      const middleware = requirePropertyOwner();
      const req = createMockReq(null, mockUsers.propertyStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for property owners only.',
        userType: 'property_staff'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      const middleware = requirePropertyOwner();
      const req = createMockReq(null, null);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePropertyStaff', () => {
    test('should allow property staff', () => {
      const middleware = requirePropertyStaff();
      const req = createMockReq(null, mockUsers.propertyStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow property owner when allowOwnerAccess is true', () => {
      const middleware = requirePropertyStaff(true);
      const req = createMockReq(null, mockUsers.propertyOwner);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject property owner when allowOwnerAccess is false', () => {
      const middleware = requirePropertyStaff(false);
      const req = createMockReq(null, mockUsers.propertyOwner);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for property staff only.',
        userType: 'property_owner'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject platform staff', () => {
      const middleware = requirePropertyStaff();
      const req = createMockReq(null, mockUsers.platformStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. This endpoint is for property staff only.',
        userType: 'platform_staff'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject inactive property staff', () => {
      const inactiveStaff = {
        ...mockUsers.propertyStaff,
        isActive: false
      };
      const middleware = requirePropertyStaff();
      const req = createMockReq(null, inactiveStaff);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Your account has been deactivated.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      const middleware = requirePropertyStaff();
      const req = createMockReq(null, null);
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Middleware chaining: auth → role check → data scoping', () => {
    test('should properly chain protectInternal → requirePlatformRole', async () => {
      const token = jwt.sign({ id: '6' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();
      
      // First middleware: protectInternal
      await protectInternal(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      
      // Second middleware: requirePlatformRole
      mockNext.mockClear();
      const platformMiddleware = requirePlatformRole();
      platformMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should properly chain protectInternal → requirePropertyOwner', async () => {
      const token = jwt.sign({ id: '8' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();
      
      // First middleware: protectInternal
      await protectInternal(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      
      // Second middleware: requirePropertyOwner
      mockNext.mockClear();
      const ownerMiddleware = requirePropertyOwner();
      ownerMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should properly chain protectInternal → requirePropertyStaff', async () => {
      const token = jwt.sign({ id: '9' }, process.env.JWT_SECRET);
      const req = createMockReq(token);
      const res = createMockRes();
      
      // First middleware: protectInternal
      await protectInternal(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      
      // Second middleware: requirePropertyStaff
      mockNext.mockClear();
      const staffMiddleware = requirePropertyStaff();
      staffMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});

console.log('✅ All internal authentication middleware tests defined');
console.log('Run with: npm test -- internalAuth.test.js');
