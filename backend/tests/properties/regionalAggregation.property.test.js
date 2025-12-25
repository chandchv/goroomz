/**
 * Property-Based Tests for Regional Aggregation
 * Feature: internal-user-roles, Property 20: Regional aggregation
 * 
 * Property: For any region, the total properties, occupancy, and revenue should 
 * equal the sum of individual property values in that region
 * 
 * Validates: Requirements 3.3
 */

const fc = require('fast-check');
const { Sequelize, DataTypes, Op } = require('sequelize');

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

// Define models inline for testing
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
  internalRole: {
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'owner', 'category_owner', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
});

const Territory = sequelize.define('Territory', {
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
  regionalManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
});

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  currentStatus: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
    defaultValue: 'vacant_clean',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
});

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Set up associations
Territory.belongsTo(User, {
  foreignKey: 'regionalManagerId',
  as: 'regionalManager'
});

User.hasMany(Territory, {
  foreignKey: 'regionalManagerId',
  as: 'managedTerritories'
});

User.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Territory.hasMany(User, {
  foreignKey: 'territoryId',
  as: 'agents'
});

Room.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

User.hasMany(Room, {
  foreignKey: 'ownerId',
  as: 'ownedRooms'
});

Payment.belongsTo(User, {
  foreignKey: 'propertyOwnerId',
  as: 'propertyOwner'
});

User.hasMany(Payment, {
  foreignKey: 'propertyOwnerId',
  as: 'payments'
});

// Regional aggregation calculation function
const calculateRegionalAggregation = async (territoryId) => {
  // Get all agents in this territory
  const agents = await User.findAll({
    where: {
      territoryId: territoryId,
      internalRole: 'agent',
      isActive: true
    }
  });

  const agentIds = agents.map(a => a.id);

  // Get all property owners onboarded by agents in this territory
  // In a real system, this would be through Lead records, but for this test we'll use a direct association
  const propertyOwners = await User.findAll({
    where: {
      role: {
        [Op.in]: ['owner', 'category_owner']
      },
      territoryId: territoryId, // For testing purposes, we assign property owners to territories
      isActive: true
    }
  });

  const propertyOwnerIds = propertyOwners.map(p => p.id);

  // Get total properties (rooms) in the region
  const totalProperties = await Room.count({
    where: {
      ownerId: {
        [Op.in]: propertyOwnerIds
      },
      isActive: true
    }
  });

  // Get occupied rooms for occupancy calculation
  const occupiedRooms = await Room.count({
    where: {
      ownerId: {
        [Op.in]: propertyOwnerIds
      },
      currentStatus: 'occupied',
      isActive: true
    }
  });

  // Calculate occupancy rate
  const occupancyRate = totalProperties > 0 ? ((occupiedRooms / totalProperties) * 100) : 0;

  // Get total revenue from property owners in this region
  const revenueResult = await Payment.findOne({
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalRevenue']
    ],
    where: {
      propertyOwnerId: {
        [Op.in]: propertyOwnerIds
      },
      status: 'completed'
    },
    raw: true
  });

  const totalRevenue = parseFloat(revenueResult?.totalRevenue || 0);

  return {
    totalProperties,
    occupiedRooms,
    occupancyRate: parseFloat(occupancyRate.toFixed(2)),
    totalRevenue,
    agentCount: agents.length,
    propertyOwnerCount: propertyOwners.length
  };
};

// Individual property calculation for verification
const calculateIndividualPropertyMetrics = async (propertyOwnerIds) => {
  const results = await Promise.all(
    propertyOwnerIds.map(async (ownerId) => {
      const properties = await Room.count({
        where: {
          ownerId: ownerId,
          isActive: true
        }
      });

      const occupied = await Room.count({
        where: {
          ownerId: ownerId,
          currentStatus: 'occupied',
          isActive: true
        }
      });

      const revenueResult = await Payment.findOne({
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'revenue']
        ],
        where: {
          propertyOwnerId: ownerId,
          status: 'completed'
        },
        raw: true
      });

      const revenue = parseFloat(revenueResult?.revenue || 0);

      return {
        properties,
        occupied,
        revenue
      };
    })
  );

  return results.reduce(
    (totals, individual) => ({
      totalProperties: totals.totalProperties + individual.properties,
      totalOccupied: totals.totalOccupied + individual.occupied,
      totalRevenue: totals.totalRevenue + individual.revenue
    }),
    { totalProperties: 0, totalOccupied: 0, totalRevenue: 0 }
  );
};

describe('Property 20: Regional aggregation', () => {
  let territory1, territory2;
  let regionalManager;

  beforeAll(async () => {
    // Initialize database
    await sequelize.sync({ force: true });
    
    // Create regional manager
    regionalManager = await User.create({
      name: 'Regional Manager',
      email: 'rm@test.com',
      internalRole: 'regional_manager',
      isActive: true
    });

    // Create territories
    territory1 = await Territory.create({
      name: 'Territory 1',
      regionalManagerId: regionalManager.id,
      isActive: true
    });

    territory2 = await Territory.create({
      name: 'Territory 2',
      regionalManagerId: regionalManager.id,
      isActive: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });



  test('Regional property count equals sum of individual property counts', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 5 }), // Properties per owner
        async (propertiesPerOwner) => {
          // Clean up data for this specific test iteration
          await Payment.destroy({ where: {} });
          await Room.destroy({ where: {} });
          await User.destroy({ 
            where: { 
              role: {
                [Op.in]: ['owner', 'category_owner']
              }
            } 
          });
          
          // Create property owners in territory1
          const propertyOwners = [];
          const timestamp = Date.now() + Math.random();
          for (let i = 0; i < propertiesPerOwner.length; i++) {
            const owner = await User.create({
              name: `Property Owner ${i}`,
              email: `owner${i}-${timestamp}@test.com`,
              role: 'owner',
              territoryId: territory1.id,
              isActive: true
            });
            propertyOwners.push(owner);

            // Create rooms for this owner
            for (let j = 0; j < propertiesPerOwner[i]; j++) {
              await Room.create({
                roomNumber: `${i}-${j}`,
                ownerId: owner.id,
                currentStatus: j % 2 === 0 ? 'occupied' : 'vacant_clean',
                isActive: true
              });
            }
          }

          const regionalAggregation = await calculateRegionalAggregation(territory1.id);
          const individualSum = await calculateIndividualPropertyMetrics(
            propertyOwners.map(o => o.id)
          );

          // Property: Regional total should equal sum of individual properties
          return regionalAggregation.totalProperties === individualSum.totalProperties;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Regional occupancy calculation matches individual room statuses', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            totalRooms: fc.integer({ min: 1, max: 20 }),
            occupiedRooms: fc.integer({ min: 0, max: 20 })
          }).filter(({ totalRooms, occupiedRooms }) => occupiedRooms <= totalRooms),
          { minLength: 1, maxLength: 3 }
        ),
        async (ownerData) => {
          // Clean up data for this specific test iteration
          await Payment.destroy({ where: {} });
          await Room.destroy({ where: {} });
          await User.destroy({ 
            where: { 
              role: {
                [Op.in]: ['owner', 'category_owner']
              }
            } 
          });
          
          // Create property owners and their rooms
          const propertyOwners = [];
          let totalExpectedOccupied = 0;
          let totalExpectedRooms = 0;
          const timestamp = Date.now() + Math.random();

          for (let i = 0; i < ownerData.length; i++) {
            const { totalRooms, occupiedRooms } = ownerData[i];
            
            const owner = await User.create({
              name: `Property Owner ${i}`,
              email: `owner${i}-${timestamp}@test.com`,
              role: 'owner',
              territoryId: territory1.id,
              isActive: true
            });
            propertyOwners.push(owner);

            // Create occupied rooms
            for (let j = 0; j < occupiedRooms; j++) {
              await Room.create({
                roomNumber: `${i}-occupied-${j}`,
                ownerId: owner.id,
                currentStatus: 'occupied',
                isActive: true
              });
            }

            // Create vacant rooms
            for (let j = 0; j < totalRooms - occupiedRooms; j++) {
              await Room.create({
                roomNumber: `${i}-vacant-${j}`,
                ownerId: owner.id,
                currentStatus: 'vacant_clean',
                isActive: true
              });
            }

            totalExpectedOccupied += occupiedRooms;
            totalExpectedRooms += totalRooms;
          }

          const regionalAggregation = await calculateRegionalAggregation(territory1.id);
          const individualSum = await calculateIndividualPropertyMetrics(
            propertyOwners.map(o => o.id)
          );

          // Property: Regional occupied count should equal sum of individual occupied rooms
          const occupiedMatch = regionalAggregation.occupiedRooms === individualSum.totalOccupied;
          const totalMatch = regionalAggregation.totalProperties === individualSum.totalProperties;
          
          // Verify against expected values
          const expectedMatch = regionalAggregation.occupiedRooms === totalExpectedOccupied &&
                               regionalAggregation.totalProperties === totalExpectedRooms;

          return occupiedMatch && totalMatch && expectedMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Regional revenue equals sum of individual property revenues', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(fc.float({ min: 100, max: 5000, noNaN: true }), { minLength: 0, maxLength: 5 }),
          { minLength: 1, maxLength: 3 }
        ), // Payments per property owner
        async (paymentsPerOwner) => {
          // Clean up data for this specific test iteration
          await Payment.destroy({ where: {} });
          await Room.destroy({ where: {} });
          await User.destroy({ 
            where: { 
              role: {
                [Op.in]: ['owner', 'category_owner']
              }
            } 
          });
          
          // Create property owners and their payments
          const propertyOwners = [];
          let totalExpectedRevenue = 0;
          const timestamp = Date.now() + Math.random();

          for (let i = 0; i < paymentsPerOwner.length; i++) {
            const owner = await User.create({
              name: `Property Owner ${i}`,
              email: `owner${i}-${timestamp}@test.com`,
              role: 'owner',
              territoryId: territory1.id,
              isActive: true
            });
            propertyOwners.push(owner);

            // Create at least one room for the owner
            await Room.create({
              roomNumber: `${i}-1`,
              ownerId: owner.id,
              currentStatus: 'occupied',
              isActive: true
            });

            // Create payments for this owner
            for (let j = 0; j < paymentsPerOwner[i].length; j++) {
              const amount = parseFloat(paymentsPerOwner[i][j].toFixed(2));
              await Payment.create({
                amount: amount,
                status: 'completed',
                paymentDate: new Date(),
                propertyOwnerId: owner.id
              });
              totalExpectedRevenue += amount;
            }
          }

          const regionalAggregation = await calculateRegionalAggregation(territory1.id);
          const individualSum = await calculateIndividualPropertyMetrics(
            propertyOwners.map(o => o.id)
          );

          // Property: Regional revenue should equal sum of individual revenues
          const tolerance = Math.max(0.01, totalExpectedRevenue * 0.001);
          const revenueMatch = Math.abs(regionalAggregation.totalRevenue - individualSum.totalRevenue) < tolerance;
          const expectedMatch = Math.abs(regionalAggregation.totalRevenue - totalExpectedRevenue) < tolerance;

          return revenueMatch && expectedMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Regional aggregation is isolated per territory', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Properties in territory 1
        fc.integer({ min: 1, max: 5 }), // Properties in territory 2
        fc.float({ min: 1000, max: 10000, noNaN: true }), // Revenue in territory 1
        fc.float({ min: 1000, max: 10000, noNaN: true }), // Revenue in territory 2
        async (props1, props2, revenue1, revenue2) => {
          // Clean up data for this specific test iteration
          await Payment.destroy({ where: {} });
          await Room.destroy({ where: {} });
          await User.destroy({ 
            where: { 
              role: {
                [Op.in]: ['owner', 'category_owner']
              }
            } 
          });
          
          const timestamp = Date.now() + Math.random();
          
          // Create property owner in territory 1
          const owner1 = await User.create({
            name: 'Territory 1 Owner',
            email: `owner1-${timestamp}@test.com`,
            role: 'owner',
            territoryId: territory1.id,
            isActive: true
          });

          // Create property owner in territory 2
          const owner2 = await User.create({
            name: 'Territory 2 Owner',
            email: `owner2-${timestamp}@test.com`,
            role: 'owner',
            territoryId: territory2.id,
            isActive: true
          });

          // Create rooms for territory 1
          for (let i = 0; i < props1; i++) {
            await Room.create({
              roomNumber: `T1-${i}`,
              ownerId: owner1.id,
              currentStatus: 'occupied',
              isActive: true
            });
          }

          // Create rooms for territory 2
          for (let i = 0; i < props2; i++) {
            await Room.create({
              roomNumber: `T2-${i}`,
              ownerId: owner2.id,
              currentStatus: 'occupied',
              isActive: true
            });
          }

          // Create payments
          await Payment.create({
            amount: parseFloat(revenue1.toFixed(2)),
            status: 'completed',
            paymentDate: new Date(),
            propertyOwnerId: owner1.id
          });

          await Payment.create({
            amount: parseFloat(revenue2.toFixed(2)),
            status: 'completed',
            paymentDate: new Date(),
            propertyOwnerId: owner2.id
          });

          const territory1Aggregation = await calculateRegionalAggregation(territory1.id);
          const territory2Aggregation = await calculateRegionalAggregation(territory2.id);

          // Property: Each territory should only show its own data
          const territory1Correct = territory1Aggregation.totalProperties === props1 &&
                                   Math.abs(territory1Aggregation.totalRevenue - revenue1) < 0.01;
          
          const territory2Correct = territory2Aggregation.totalProperties === props2 &&
                                   Math.abs(territory2Aggregation.totalRevenue - revenue2) < 0.01;

          return territory1Correct && territory2Correct;
        }
      ),
      { numRuns: 100 }
    );
  });
});