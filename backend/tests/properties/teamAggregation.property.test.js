/**
 * Property-Based Tests for Team Aggregation
 * Feature: internal-user-roles, Property 22: Team aggregation
 * 
 * Property: For any team, the aggregate performance should equal the sum of 
 * individual agent performance
 * 
 * Validates: Requirements 24.5
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
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'users'
});

// Define AgentTarget model inline for testing
const AgentTarget = sequelize.define('AgentTarget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  period: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  targetProperties: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  targetRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  actualProperties: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  actualRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  setBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'agent_targets'
});

// Define associations
User.hasMany(AgentTarget, {
  foreignKey: 'agentId',
  as: 'targets'
});

AgentTarget.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

/**
 * Function to calculate team aggregate performance
 */
async function calculateTeamAggregatePerformance(managerId, startDate, endDate) {
  // Get all agents in the team
  const agents = await User.findAll({
    where: {
      managerId,
      internalRole: 'agent'
    }
  });

  const agentIds = agents.map(a => a.id);

  if (agentIds.length === 0) {
    return {
      totalTargetProperties: 0,
      totalActualProperties: 0,
      totalTargetRevenue: 0,
      totalActualRevenue: 0
    };
  }

  // Get all targets for these agents in the date range
  const whereClause = {
    agentId: agentIds
  };

  if (startDate) {
    whereClause.startDate = startDate;
  }
  if (endDate) {
    whereClause.endDate = endDate;
  }

  const targets = await AgentTarget.findAll({
    where: whereClause
  });

  // Aggregate the performance
  const aggregate = targets.reduce((acc, target) => {
    return {
      totalTargetProperties: acc.totalTargetProperties + target.targetProperties,
      totalActualProperties: acc.totalActualProperties + target.actualProperties,
      totalTargetRevenue: acc.totalTargetRevenue + parseFloat(target.targetRevenue),
      totalActualRevenue: acc.totalActualRevenue + parseFloat(target.actualRevenue)
    };
  }, {
    totalTargetProperties: 0,
    totalActualProperties: 0,
    totalTargetRevenue: 0,
    totalActualRevenue: 0
  });

  return aggregate;
}

describe('Property 22: Team Aggregation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await AgentTarget.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for target/actual properties count
   */
  const propertiesArbitrary = () =>
    fc.integer({ min: 0, max: 50 });

  /**
   * Generator for revenue amounts
   */
  const revenueArbitrary = () =>
    fc.float({ min: 0, max: 50000, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for dates in 2024
   */
  const dateArbitrary = () =>
    fc.integer({ min: 0, max: 364 }).map(days => {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

  test('Property 22: Team aggregate equals sum of individual agent performance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            agentName: fc.string({ minLength: 3, maxLength: 20 }),
            targetProperties: propertiesArbitrary(),
            actualProperties: propertiesArbitrary(),
            targetRevenue: revenueArbitrary(),
            actualRevenue: revenueArbitrary()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        dateArbitrary(),
        dateArbitrary(),
        async (managerId, agentsData, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create manager
          await User.create({
            id: managerId,
            name: 'Regional Manager',
            email: `manager-${managerId}@test.com`,
            internalRole: 'regional_manager',
            managerId: null
          });

          // Create agents and their targets
          let expectedTotalTargetProperties = 0;
          let expectedTotalActualProperties = 0;
          let expectedTotalTargetRevenue = 0;
          let expectedTotalActualRevenue = 0;

          for (let i = 0; i < agentsData.length; i++) {
            const agentData = agentsData[i];
            
            // Create agent
            const agent = await User.create({
              name: agentData.agentName,
              email: `agent-${i}-${Date.now()}-${Math.random()}@test.com`,
              internalRole: 'agent',
              managerId
            });

            // Create target for agent
            await AgentTarget.create({
              agentId: agent.id,
              territoryId: null,
              period: 'monthly',
              startDate: actualStartDate,
              endDate: actualEndDate,
              targetProperties: agentData.targetProperties,
              targetRevenue: agentData.targetRevenue,
              actualProperties: agentData.actualProperties,
              actualRevenue: agentData.actualRevenue,
              setBy: managerId
            });

            // Add to expected totals
            expectedTotalTargetProperties += agentData.targetProperties;
            expectedTotalActualProperties += agentData.actualProperties;
            expectedTotalTargetRevenue += agentData.targetRevenue;
            expectedTotalActualRevenue += agentData.actualRevenue;
          }

          // Calculate team aggregate
          const aggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Property assertion: Team aggregate should equal sum of individual performance
          expect(aggregate.totalTargetProperties).toBe(expectedTotalTargetProperties);
          expect(aggregate.totalActualProperties).toBe(expectedTotalActualProperties);
          expect(aggregate.totalTargetRevenue).toBeCloseTo(expectedTotalTargetRevenue, 2);
          expect(aggregate.totalActualRevenue).toBeCloseTo(expectedTotalActualRevenue, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: Team with no agents has zero aggregate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dateArbitrary(),
        dateArbitrary(),
        async (managerId, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create manager with no agents
          await User.create({
            id: managerId,
            name: 'Regional Manager',
            email: `manager-${managerId}@test.com`,
            internalRole: 'regional_manager',
            managerId: null
          });

          // Calculate team aggregate
          const aggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Property assertion: Empty team should have zero aggregate
          expect(aggregate.totalTargetProperties).toBe(0);
          expect(aggregate.totalActualProperties).toBe(0);
          expect(aggregate.totalTargetRevenue).toBe(0);
          expect(aggregate.totalActualRevenue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: Adding an agent increases team aggregate by that agent\'s performance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            agentName: fc.string({ minLength: 3, maxLength: 20 }),
            targetProperties: propertiesArbitrary(),
            actualProperties: propertiesArbitrary(),
            targetRevenue: revenueArbitrary(),
            actualRevenue: revenueArbitrary()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.record({
          agentName: fc.string({ minLength: 3, maxLength: 20 }),
          targetProperties: propertiesArbitrary(),
          actualProperties: propertiesArbitrary(),
          targetRevenue: revenueArbitrary(),
          actualRevenue: revenueArbitrary()
        }),
        dateArbitrary(),
        dateArbitrary(),
        async (managerId, initialAgents, newAgent, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create manager
          await User.create({
            id: managerId,
            name: 'Regional Manager',
            email: `manager-${managerId}@test.com`,
            internalRole: 'regional_manager',
            managerId: null
          });

          // Create initial agents and their targets
          for (let i = 0; i < initialAgents.length; i++) {
            const agentData = initialAgents[i];
            
            const agent = await User.create({
              name: agentData.agentName,
              email: `agent-${i}-${Date.now()}-${Math.random()}@test.com`,
              internalRole: 'agent',
              managerId
            });

            await AgentTarget.create({
              agentId: agent.id,
              territoryId: null,
              period: 'monthly',
              startDate: actualStartDate,
              endDate: actualEndDate,
              targetProperties: agentData.targetProperties,
              targetRevenue: agentData.targetRevenue,
              actualProperties: agentData.actualProperties,
              actualRevenue: agentData.actualRevenue,
              setBy: managerId
            });
          }

          // Get initial aggregate
          const initialAggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Add new agent
          const newAgentUser = await User.create({
            name: newAgent.agentName,
            email: `new-agent-${Date.now()}-${Math.random()}@test.com`,
            internalRole: 'agent',
            managerId
          });

          await AgentTarget.create({
            agentId: newAgentUser.id,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties: newAgent.targetProperties,
            targetRevenue: newAgent.targetRevenue,
            actualProperties: newAgent.actualProperties,
            actualRevenue: newAgent.actualRevenue,
            setBy: managerId
          });

          // Get new aggregate
          const newAggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Property assertion: New aggregate should equal initial plus new agent's performance
          expect(newAggregate.totalTargetProperties).toBe(
            initialAggregate.totalTargetProperties + newAgent.targetProperties
          );
          expect(newAggregate.totalActualProperties).toBe(
            initialAggregate.totalActualProperties + newAgent.actualProperties
          );
          expect(newAggregate.totalTargetRevenue).toBeCloseTo(
            initialAggregate.totalTargetRevenue + newAgent.targetRevenue,
            2
          );
          expect(newAggregate.totalActualRevenue).toBeCloseTo(
            initialAggregate.totalActualRevenue + newAgent.actualRevenue,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: Team aggregate is non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            agentName: fc.string({ minLength: 3, maxLength: 20 }),
            targetProperties: propertiesArbitrary(),
            actualProperties: propertiesArbitrary(),
            targetRevenue: revenueArbitrary(),
            actualRevenue: revenueArbitrary()
          }),
          { minLength: 0, maxLength: 10 }
        ),
        dateArbitrary(),
        dateArbitrary(),
        async (managerId, agentsData, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create manager
          await User.create({
            id: managerId,
            name: 'Regional Manager',
            email: `manager-${managerId}@test.com`,
            internalRole: 'regional_manager',
            managerId: null
          });

          // Create agents and their targets
          for (let i = 0; i < agentsData.length; i++) {
            const agentData = agentsData[i];
            
            const agent = await User.create({
              name: agentData.agentName,
              email: `agent-${i}-${Date.now()}-${Math.random()}@test.com`,
              internalRole: 'agent',
              managerId
            });

            await AgentTarget.create({
              agentId: agent.id,
              territoryId: null,
              period: 'monthly',
              startDate: actualStartDate,
              endDate: actualEndDate,
              targetProperties: agentData.targetProperties,
              targetRevenue: agentData.targetRevenue,
              actualProperties: agentData.actualProperties,
              actualRevenue: agentData.actualRevenue,
              setBy: managerId
            });
          }

          // Calculate team aggregate
          const aggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Property assertion: All aggregate values should be non-negative
          expect(aggregate.totalTargetProperties).toBeGreaterThanOrEqual(0);
          expect(aggregate.totalActualProperties).toBeGreaterThanOrEqual(0);
          expect(aggregate.totalTargetRevenue).toBeGreaterThanOrEqual(0);
          expect(aggregate.totalActualRevenue).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: Team aggregate is independent of agent order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            agentName: fc.string({ minLength: 3, maxLength: 20 }),
            targetProperties: propertiesArbitrary(),
            actualProperties: propertiesArbitrary(),
            targetRevenue: revenueArbitrary(),
            actualRevenue: revenueArbitrary()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        dateArbitrary(),
        dateArbitrary(),
        async (managerId, agentsData, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create manager
          await User.create({
            id: managerId,
            name: 'Regional Manager',
            email: `manager-${managerId}@test.com`,
            internalRole: 'regional_manager',
            managerId: null
          });

          // Create agents in original order
          for (let i = 0; i < agentsData.length; i++) {
            const agentData = agentsData[i];
            
            const agent = await User.create({
              name: agentData.agentName,
              email: `agent-${i}-${Date.now()}-${Math.random()}@test.com`,
              internalRole: 'agent',
              managerId
            });

            await AgentTarget.create({
              agentId: agent.id,
              territoryId: null,
              period: 'monthly',
              startDate: actualStartDate,
              endDate: actualEndDate,
              targetProperties: agentData.targetProperties,
              targetRevenue: agentData.targetRevenue,
              actualProperties: agentData.actualProperties,
              actualRevenue: agentData.actualRevenue,
              setBy: managerId
            });
          }

          // Calculate aggregate
          const aggregate = await calculateTeamAggregatePerformance(managerId, actualStartDate, actualEndDate);

          // Calculate expected totals (order-independent)
          const expectedTotalTargetProperties = agentsData.reduce((sum, a) => sum + a.targetProperties, 0);
          const expectedTotalActualProperties = agentsData.reduce((sum, a) => sum + a.actualProperties, 0);
          const expectedTotalTargetRevenue = agentsData.reduce((sum, a) => sum + a.targetRevenue, 0);
          const expectedTotalActualRevenue = agentsData.reduce((sum, a) => sum + a.actualRevenue, 0);

          // Property assertion: Aggregate should match expected totals regardless of order
          expect(aggregate.totalTargetProperties).toBe(expectedTotalTargetProperties);
          expect(aggregate.totalActualProperties).toBe(expectedTotalActualProperties);
          expect(aggregate.totalTargetRevenue).toBeCloseTo(expectedTotalTargetRevenue, 2);
          expect(aggregate.totalActualRevenue).toBeCloseTo(expectedTotalActualRevenue, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: Multiple teams have independent aggregates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            managerId: fc.uuid(),
            agents: fc.array(
              fc.record({
                agentName: fc.string({ minLength: 3, maxLength: 20 }),
                targetProperties: propertiesArbitrary(),
                actualProperties: propertiesArbitrary(),
                targetRevenue: revenueArbitrary(),
                actualRevenue: revenueArbitrary()
              }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          { minLength: 2, maxLength: 3 }
        ),
        dateArbitrary(),
        dateArbitrary(),
        async (teamsData, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          const expectedAggregates = new Map();

          // Create teams
          for (let t = 0; t < teamsData.length; t++) {
            const teamData = teamsData[t];
            
            // Create manager
            await User.create({
              id: teamData.managerId,
              name: `Manager ${t}`,
              email: `manager-${t}-${Date.now()}-${Math.random()}@test.com`,
              internalRole: 'regional_manager',
              managerId: null
            });

            let teamTargetProperties = 0;
            let teamActualProperties = 0;
            let teamTargetRevenue = 0;
            let teamActualRevenue = 0;

            // Create agents for this team
            for (let i = 0; i < teamData.agents.length; i++) {
              const agentData = teamData.agents[i];
              
              const agent = await User.create({
                name: agentData.agentName,
                email: `agent-${t}-${i}-${Date.now()}-${Math.random()}@test.com`,
                internalRole: 'agent',
                managerId: teamData.managerId
              });

              await AgentTarget.create({
                agentId: agent.id,
                territoryId: null,
                period: 'monthly',
                startDate: actualStartDate,
                endDate: actualEndDate,
                targetProperties: agentData.targetProperties,
                targetRevenue: agentData.targetRevenue,
                actualProperties: agentData.actualProperties,
                actualRevenue: agentData.actualRevenue,
                setBy: teamData.managerId
              });

              teamTargetProperties += agentData.targetProperties;
              teamActualProperties += agentData.actualProperties;
              teamTargetRevenue += agentData.targetRevenue;
              teamActualRevenue += agentData.actualRevenue;
            }

            expectedAggregates.set(teamData.managerId, {
              totalTargetProperties: teamTargetProperties,
              totalActualProperties: teamActualProperties,
              totalTargetRevenue: teamTargetRevenue,
              totalActualRevenue: teamActualRevenue
            });
          }

          // Verify each team's aggregate is correct and independent
          for (const teamData of teamsData) {
            const aggregate = await calculateTeamAggregatePerformance(teamData.managerId, actualStartDate, actualEndDate);
            const expected = expectedAggregates.get(teamData.managerId);

            // Property assertion: Each team's aggregate should match only their agents
            expect(aggregate.totalTargetProperties).toBe(expected.totalTargetProperties);
            expect(aggregate.totalActualProperties).toBe(expected.totalActualProperties);
            expect(aggregate.totalTargetRevenue).toBeCloseTo(expected.totalTargetRevenue, 2);
            expect(aggregate.totalActualRevenue).toBeCloseTo(expected.totalActualRevenue, 2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
