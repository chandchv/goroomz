/**
 * Property-Based Tests for Data Scoping Middleware
 * Feature: role-segregation-optimization
 * 
 * Tests the data scoping middleware that automatically filters database queries
 * based on user type and permissions.
 */

const fc = require('fast-check');
const { Sequelize, DataTypes, Op } = require('sequelize');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');

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
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  assignedPropertyId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'users',
  underscored: true
});

// Define Room model (representing properties)
const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'rooms',
  underscored: true
});

// Define PropertyAssignment model
const PropertyAssignment = sequelize.define('PropertyAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assignmentType: {
    type: DataTypes.ENUM('agent', 'staff', 'manager'),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'property_assignments',
  underscored: true
});

// Define Territory model
const Territory = sequelize.define('Territory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'territories',
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

User.prototype.getAccessiblePropertyIds = async function() {
  const userType = this.getUserType();
  
  if (userType === 'platform_staff') {
    // Superuser and platform_admin see all
    if (this.internalRole === 'superuser' || this.internalRole === 'platform_admin') {
      const properties = await Room.findAll({ attributes: ['id'] });
      return properties.map(p => p.id);
    }
    
    // Regional manager sees properties in their territory
    if (this.internalRole === 'regional_manager' && this.territoryId) {
      const properties = await Room.findAll({
        where: { territoryId: this.territoryId },
        attributes: ['id']
      });
      return properties.map(p => p.id);
    }
    
    // Agent sees assigned properties
    if (this.internalRole === 'agent') {
      const assignments = await PropertyAssignment.findAll({
        where: { userId: this.id, isActive: true },
        attributes: ['propertyId']
      });
      return assignments.map(a => a.propertyId);
    }
  }
  
  if (userType === 'property_owner') {
    const properties = await Room.findAll({
      where: { ownerId: this.id },
      attributes: ['id']
    });
    return properties.map(p => p.id);
  }
  
  if (userType === 'property_staff') {
    return this.assignedPropertyId ? [this.assignedPropertyId] : [];
  }
  
  return [];
};

// Define associations
User.hasMany(Room, { foreignKey: 'ownerId', as: 'ownedRooms' });
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(PropertyAssignment, { foreignKey: 'userId', as: 'propertyAssignments' });
PropertyAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
PropertyAssignment.belongsTo(Room, { foreignKey: 'propertyId', as: 'property' });
Room.hasMany(PropertyAssignment, { foreignKey: 'propertyId', as: 'assignments' });
User.belongsTo(Territory, { foreignKey: 'territoryId', as: 'territory' });
Territory.hasMany(User, { foreignKey: 'territoryId', as: 'agents' });
Room.belongsTo(Territory, { foreignKey: 'territoryId', as: 'territory' });
Territory.hasMany(Room, { foreignKey: 'territoryId', as: 'properties' });

describe('Data Scoping Middleware Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await PropertyAssignment.destroy({ where: {}, truncate: true, cascade: true });
    await Room.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Territory.destroy({ where: {}, truncate: true, cascade: true });
  });

  // Generators
  const uuidArbitrary = () => fc.uuid();
  
  const nameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'),
      fc.constantFrom('Property', 'Hotel', 'PG', 'Hostel', 'Lodge')
    ).map(([prefix, suffix]) => `${prefix} ${suffix}`);

  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'), { minLength: 5, maxLength: 10 }),
      fc.constantFrom('example.com', 'test.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  /**
   * Property 5: Property owner data scoping
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 12.1
   */
  describe('Property 5: Property owner data scoping', () => {
    test('Property owners only see their own properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of owners
          fc.integer({ min: 1, max: 3 }), // Properties per owner
          async (ownerCount, propertiesPerOwner) => {
            const owners = [];
            const allProperties = [];

            // Create owners and their properties
            for (let i = 0; i < ownerCount; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${i}@test.com`,
                role: 'owner'
              });
              owners.push(owner);

              for (let j = 0; j < propertiesPerOwner; j++) {
                const property = await Room.create({
                  name: `Property ${i}-${j}`,
                  ownerId: owner.id
                });
                allProperties.push(property);
              }
            }

            // Test each owner
            for (const owner of owners) {
              // Create mock request/response
              const req = { user: owner };
              const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
              };
              const next = jest.fn();

              // Apply scoping middleware
              await applyScopingMiddleware(req, res, next);

              // Verify middleware called next
              expect(next).toHaveBeenCalled();
              expect(req.dataScope).toBeDefined();
              expect(req.dataScope.userType).toBe('property_owner');
              expect(req.dataScope.canBypassScoping).toBe(false);

              // Verify accessible property IDs
              const accessibleIds = req.dataScope.propertyIds;
              expect(accessibleIds.length).toBe(propertiesPerOwner);

              // Verify all accessible properties belong to this owner
              const accessibleProperties = await Room.findAll({
                where: { id: { [Op.in]: accessibleIds } }
              });

              for (const prop of accessibleProperties) {
                expect(prop.ownerId).toBe(owner.id);
              }

              // Verify no properties from other owners are accessible
              const otherOwnerProperties = allProperties.filter(p => p.ownerId !== owner.id);
              for (const prop of otherOwnerProperties) {
                expect(accessibleIds).not.toContain(prop.id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('applyScopeToWhere filters properties correctly for owners', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 3 }),
          async (ownedCount, otherCount) => {
            // Create owner with properties
            const owner = await User.create({
              name: 'Test Owner',
              email: `owner${Date.now()}@test.com`,
              role: 'owner'
            });

            const ownedProperties = [];
            for (let i = 0; i < ownedCount; i++) {
              const prop = await Room.create({
                name: `Owned ${i}`,
                ownerId: owner.id
              });
              ownedProperties.push(prop);
            }

            // Create other owner's properties
            const otherOwner = await User.create({
              name: 'Other Owner',
              email: `other${Date.now()}@test.com`,
              role: 'owner'
            });

            for (let i = 0; i < otherCount; i++) {
              await Room.create({
                name: `Other ${i}`,
                ownerId: otherOwner.id
              });
            }

            // Get data scope
            const req = { user: owner };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Apply scope to where clause
            const scopedWhere = applyScopeToWhere(req.dataScope, {}, 'id');

            // Query with scoped where
            const results = await Room.findAll({ where: scopedWhere });

            // Verify only owned properties are returned
            expect(results.length).toBe(ownedCount);
            for (const result of results) {
              expect(result.ownerId).toBe(owner.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Superuser bypass
   * Validates: Requirements 3.1, 4.4, 12.5
   */
  describe('Property 6: Superuser bypass', () => {
    test('Superusers can bypass scoping and see all properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          async (ownerCount, propertiesPerOwner) => {
            // Clean up before this iteration
            await PropertyAssignment.destroy({ where: {}, truncate: true, cascade: true });
            await Room.destroy({ where: {}, truncate: true, cascade: true });
            await User.destroy({ where: {}, truncate: true, cascade: true });
            await Territory.destroy({ where: {}, truncate: true, cascade: true });

            // Create superuser
            const superuser = await User.create({
              name: 'Superuser',
              email: `superuser${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: 'superuser'
            });

            // Create multiple owners with properties
            let totalProperties = 0;
            for (let i = 0; i < ownerCount; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${Math.random()}${i}@test.com`,
                role: 'owner'
              });

              for (let j = 0; j < propertiesPerOwner; j++) {
                await Room.create({
                  name: `Property ${i}-${j}`,
                  ownerId: owner.id
                });
                totalProperties++;
              }
            }

            // Apply scoping middleware
            const req = { user: superuser };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Verify bypass is enabled
            expect(req.dataScope.canBypassScoping).toBe(true);
            expect(req.dataScope.userType).toBe('platform_staff');

            // Apply scope to where clause
            const scopedWhere = applyScopeToWhere(req.dataScope, {}, 'id');

            // Query should return all properties
            const results = await Room.findAll({ where: scopedWhere });
            expect(results.length).toBe(totalProperties);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Platform admins can bypass scoping', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (propertyCount) => {
            // Clean up before this iteration
            await PropertyAssignment.destroy({ where: {}, truncate: true, cascade: true });
            await Room.destroy({ where: {}, truncate: true, cascade: true });
            await User.destroy({ where: {}, truncate: true, cascade: true });
            await Territory.destroy({ where: {}, truncate: true, cascade: true });

            // Create platform admin
            const admin = await User.create({
              name: 'Platform Admin',
              email: `admin${Date.now()}${Math.random()}@test.com`,
              role: 'user',
              internalRole: 'platform_admin'
            });

            // Create properties
            for (let i = 0; i < propertyCount; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${Math.random()}${i}@test.com`,
                role: 'owner'
              });

              await Room.create({
                name: `Property ${i}`,
                ownerId: owner.id
              });
            }

            // Apply scoping middleware
            const req = { user: admin };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Verify bypass is enabled
            expect(req.dataScope.canBypassScoping).toBe(true);

            // Query should return all properties
            const scopedWhere = applyScopeToWhere(req.dataScope, {}, 'id');
            const results = await Room.findAll({ where: scopedWhere });
            expect(results.length).toBe(propertyCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Territory-based scoping
   * Validates: Requirements 3.2, 4.3, 12.2
   */
  describe('Property 7: Territory-based scoping', () => {
    test('Regional managers only see properties in their territory', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 4 }), // Number of territories
          fc.integer({ min: 1, max: 3 }), // Properties per territory
          async (territoryCount, propertiesPerTerritory) => {
            const territories = [];

            // Create territories with regional managers and properties
            for (let i = 0; i < territoryCount; i++) {
              const territory = await Territory.create({
                name: `Territory ${i}`
              });
              territories.push(territory);

              const regionalManager = await User.create({
                name: `RM ${i}`,
                email: `rm${Date.now()}${i}@test.com`,
                role: 'user',
                internalRole: 'regional_manager',
                territoryId: territory.id
              });

              // Create properties in this territory
              for (let j = 0; j < propertiesPerTerritory; j++) {
                const owner = await User.create({
                  name: `Owner ${i}-${j}`,
                  email: `owner${Date.now()}${i}${j}@test.com`,
                  role: 'owner'
                });

                await Room.create({
                  name: `Property ${i}-${j}`,
                  ownerId: owner.id,
                  territoryId: territory.id
                });
              }

              // Test regional manager scoping
              const req = { user: regionalManager };
              const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
              const next = jest.fn();
              await applyScopingMiddleware(req, res, next);

              expect(req.dataScope.canBypassScoping).toBe(false);
              expect(req.dataScope.propertyIds.length).toBe(propertiesPerTerritory);

              // Verify all accessible properties are in the correct territory
              const accessibleProperties = await Room.findAll({
                where: { id: { [Op.in]: req.dataScope.propertyIds } }
              });

              for (const prop of accessibleProperties) {
                expect(prop.territoryId).toBe(territory.id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Agent assignment scoping
   * Validates: Requirements 3.3
   */
  describe('Property 8: Agent assignment scoping', () => {
    test('Agents only see properties they are assigned to', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // Assigned properties
          fc.integer({ min: 1, max: 3 }), // Unassigned properties
          async (assignedCount, unassignedCount) => {
            // Create agent
            const agent = await User.create({
              name: 'Test Agent',
              email: `agent${Date.now()}@test.com`,
              role: 'user',
              internalRole: 'agent'
            });

            // Create assigned properties
            const assignedProperties = [];
            for (let i = 0; i < assignedCount; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${i}@test.com`,
                role: 'owner'
              });

              const property = await Room.create({
                name: `Assigned ${i}`,
                ownerId: owner.id
              });
              assignedProperties.push(property);

              await PropertyAssignment.create({
                userId: agent.id,
                propertyId: property.id,
                assignmentType: 'agent',
                isActive: true
              });
            }

            // Create unassigned properties
            for (let i = 0; i < unassignedCount; i++) {
              const owner = await User.create({
                name: `Other Owner ${i}`,
                email: `other${Date.now()}${i}@test.com`,
                role: 'owner'
              });

              await Room.create({
                name: `Unassigned ${i}`,
                ownerId: owner.id
              });
            }

            // Apply scoping middleware
            const req = { user: agent };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Verify only assigned properties are accessible
            expect(req.dataScope.propertyIds.length).toBe(assignedCount);

            const assignedIds = assignedProperties.map(p => p.id);
            for (const id of req.dataScope.propertyIds) {
              expect(assignedIds).toContain(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Property staff scoping
   * Validates: Requirements 7.2, 7.3, 12.3
   */
  describe('Property 14: Property staff scoping', () => {
    test('Property staff only see their assigned property', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager'),
          fc.integer({ min: 2, max: 5 }),
          async (staffRole, totalProperties) => {
            // Create multiple properties
            const properties = [];
            for (let i = 0; i < totalProperties; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${i}@test.com`,
                role: 'owner'
              });

              const property = await Room.create({
                name: `Property ${i}`,
                ownerId: owner.id
              });
              properties.push(property);
            }

            // Pick one property to assign to staff
            const assignedProperty = properties[0];

            // Create property staff
            const staff = await User.create({
              name: 'Test Staff',
              email: `staff${Date.now()}@test.com`,
              role: 'user',
              staffRole: staffRole,
              assignedPropertyId: assignedProperty.id
            });

            // Apply scoping middleware
            const req = { user: staff };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Verify only assigned property is accessible
            expect(req.dataScope.userType).toBe('property_staff');
            expect(req.dataScope.propertyIds.length).toBe(1);
            expect(req.dataScope.propertyIds[0]).toBe(assignedProperty.id);

            // Verify other properties are not accessible
            for (let i = 1; i < properties.length; i++) {
              expect(req.dataScope.propertyIds).not.toContain(properties[i].id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 22: Filter merging
   * Validates: Requirements 12.4
   */
  describe('Property 22: Filter merging', () => {
    test('Explicit filters are merged with scoping filters using AND logic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 4 }),
          fc.constantFrom('Alpha', 'Beta', 'Gamma', 'Delta'),
          async (propertyCount, namePrefix) => {
            // Create owner with properties
            const owner = await User.create({
              name: 'Test Owner',
              email: `owner${Date.now()}@test.com`,
              role: 'owner'
            });

            // Create properties with different names
            for (let i = 0; i < propertyCount; i++) {
              const prefix = i % 2 === 0 ? namePrefix : 'Other';
              await Room.create({
                name: `${prefix} Property ${i}`,
                ownerId: owner.id
              });
            }

            // Apply scoping middleware
            const req = { user: owner };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Apply scope with explicit filter
            const baseWhere = { name: { [Op.like]: `${namePrefix}%` } };
            const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'id');

            // Query with merged filters
            const results = await Room.findAll({ where: scopedWhere });

            // Verify results match both filters (owned by user AND name matches)
            for (const result of results) {
              expect(result.ownerId).toBe(owner.id);
              expect(result.name.startsWith(namePrefix)).toBe(true);
            }

            // Verify count is less than or equal to total properties
            expect(results.length).toBeLessThanOrEqual(propertyCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Empty property list results in no matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (propertyCount) => {
            // Create properties
            for (let i = 0; i < propertyCount; i++) {
              const owner = await User.create({
                name: `Owner ${i}`,
                email: `owner${Date.now()}${i}@test.com`,
                role: 'owner'
              });

              await Room.create({
                name: `Property ${i}`,
                ownerId: owner.id
              });
            }

            // Create user with no properties
            const userWithNoProperties = await User.create({
              name: 'No Properties',
              email: `noprops${Date.now()}@test.com`,
              role: 'owner'
            });

            // Apply scoping middleware
            const req = { user: userWithNoProperties };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            await applyScopingMiddleware(req, res, next);

            // Verify empty property list
            expect(req.dataScope.propertyIds.length).toBe(0);

            // Apply scope to where clause
            const scopedWhere = applyScopeToWhere(req.dataScope, {}, 'id');

            // Query should return no results
            const results = await Room.findAll({ where: scopedWhere });
            expect(results.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
