/**
 * Property-Based Test for Platform Route Protection
 * Feature: role-segregation-optimization, Property 9: Platform route protection
 * Validates: Requirements 3.4, 6.2, 6.3, 6.5
 * 
 * Tests that platform routes (prefixed with /platform/) are only accessible
 * to users with internalRole (platform staff), and that property owners
 * and other user types are properly denied access.
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');
const { requirePlatformRole } = require('../../middleware/internalAuth');

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
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  underscored: true
});

// Add helper methods to User model
User.prototype.isPropertyOwner = function() {
  return (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') 
    && !this.internalRole;
};

User.prototype.isPlatformStaff = function() {
  return !!this.internalRole;
};

User.prototype.isPropertyStaff = function() {
  return !!this.staffRole && !this.internalRole;
};

User.prototype.getUserType = function() {
  if (this.isPlatformStaff()) return 'platform_staff';
  if (this.isPropertyOwner()) return 'property_owner';
  if (this.isPropertyStaff()) return 'property_staff';
  return 'external_user';
};

describe('Platform Route Protection Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // Generators
  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

  const propertyOwnerRoleArbitrary = () =>
    fc.constantFrom('owner', 'category_owner', 'admin');

  const staffRoleArbitrary = () =>
    fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager');

  /**
   * Property 9: Platform route protection
   * Validates: Requirements 3.4, 6.2, 6.3, 6.5
   */
  describe('Property 9: Platform route protection', () => {
    test('Property owners without internalRole are denied access to platform routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          propertyOwnerRoleArbitrary(),
          async (ownerRole) => {
            // Create property owner (no internalRole)
            const owner = await User.create({
              name: 'Property Owner',
              email: `owner${Date.now()}${Math.random()}@test.com`,
              role: ownerRole,
              internalRole: null,
              isActive: true
            });

            // Create mock request/response
            const req = { user: owner };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is denied
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: expect.stringContaining('platform staff only')
              })
            );
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property staff without internalRole are denied access to platform routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          staffRoleArbitrary(),
          async (staffRole) => {
            // Create property staff (no internalRole)
            const staff = await User.create({
              name: 'Property Staff',
              email: `staff${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              staffRole: staffRole,
              internalRole: null,
              isActive: true
            });

            // Create mock request/response
            const req = { user: staff };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is denied
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: expect.stringContaining('platform staff only')
              })
            );
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('External users are denied access to platform routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('user'),
          async (role) => {
            // Create external user (no internalRole, no staffRole)
            const externalUser = await User.create({
              name: 'External User',
              email: `external${Date.now()}${Math.random()}@test.com`,
              role: role,
              internalRole: null,
              staffRole: null,
              isActive: true
            });

            // Create mock request/response
            const req = { user: externalUser };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is denied
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: expect.stringContaining('platform staff only')
              })
            );
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Platform staff with internalRole are granted access to platform routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          internalRoleArbitrary(),
          async (internalRole) => {
            // Create platform staff with internalRole
            const platformStaff = await User.create({
              name: 'Platform Staff',
              email: `platform${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: internalRole,
              isActive: true
            });

            // Create mock request/response
            const req = { user: platformStaff };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is granted
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Inactive platform staff are denied access to platform routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          internalRoleArbitrary(),
          async (internalRole) => {
            // Create inactive platform staff
            const inactiveStaff = await User.create({
              name: 'Inactive Staff',
              email: `inactive${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: internalRole,
              isActive: false
            });

            // Create mock request/response
            const req = { user: inactiveStaff };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is denied
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: expect.stringContaining('deactivated')
              })
            );
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('requirePlatformRole with specific roles only allows those roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('superuser', 'platform_admin'),
          internalRoleArbitrary(),
          async (allowedRole, userRole) => {
            // Create platform staff
            const platformStaff = await User.create({
              name: 'Platform Staff',
              email: `staff${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: userRole,
              isActive: true
            });

            // Create mock request/response
            const req = { user: platformStaff };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware with specific role requirement
            const middleware = requirePlatformRole(allowedRole);
            middleware(req, res, next);

            // Verify access based on role match
            if (userRole === allowedRole) {
              // Access should be granted
              expect(next).toHaveBeenCalled();
              expect(res.status).not.toHaveBeenCalled();
            } else {
              // Access should be denied
              expect(res.status).toHaveBeenCalledWith(403);
              expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: false,
                  message: expect.stringContaining('Required platform roles')
                })
              );
              expect(next).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('requirePlatformRole with multiple allowed roles grants access to any matching role', async () => {
      await fc.assert(
        fc.asyncProperty(
          internalRoleArbitrary(),
          async (userRole) => {
            // Create platform staff
            const platformStaff = await User.create({
              name: 'Platform Staff',
              email: `staff${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: userRole,
              isActive: true
            });

            // Create mock request/response
            const req = { user: platformStaff };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware with multiple allowed roles
            const allowedRoles = ['superuser', 'platform_admin', 'operations_manager'];
            const middleware = requirePlatformRole(...allowedRoles);
            middleware(req, res, next);

            // Verify access based on role match
            if (allowedRoles.includes(userRole)) {
              // Access should be granted
              expect(next).toHaveBeenCalled();
              expect(res.status).not.toHaveBeenCalled();
            } else {
              // Access should be denied
              expect(res.status).toHaveBeenCalledWith(403);
              expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: false,
                  message: expect.stringContaining('Required platform roles')
                })
              );
              expect(next).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Users with both owner role and internalRole are treated as platform staff', async () => {
      await fc.assert(
        fc.asyncProperty(
          propertyOwnerRoleArbitrary(),
          internalRoleArbitrary(),
          async (ownerRole, internalRole) => {
            // Create user with both owner role and internalRole
            // Note: This violates role conflict prevention (Property 4), but we test the behavior
            const hybridUser = await User.create({
              name: 'Hybrid User',
              email: `hybrid${Date.now()}${Math.random()}@test.com`,
              role: ownerRole,
              internalRole: internalRole,
              isActive: true
            });

            // Create mock request/response
            const req = { user: hybridUser };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is granted (internalRole takes priority)
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
            
            // Verify user is classified as platform staff
            expect(hybridUser.isPlatformStaff()).toBe(true);
            expect(hybridUser.getUserType()).toBe('platform_staff');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Unauthenticated requests (no user) are denied access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Create mock request/response with no user
            const req = { user: null };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();

            // Apply requirePlatformRole middleware
            const middleware = requirePlatformRole();
            middleware(req, res, next);

            // Verify access is denied
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: expect.stringContaining('Authentication required')
              })
            );
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
