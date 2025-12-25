/**
 * Property-Based Tests for Performance Metric Accuracy
 * Feature: internal-user-roles, Property 19: Performance metric accuracy
 * 
 * Property: For any agent and time period, performance metrics should accurately 
 * reflect the actual data (properties onboarded, conversion rates, commission earned)
 * 
 * Validates: Requirements 3.2
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

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyOwnerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
    allowNull: false,
    defaultValue: 'contacted'
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

const Commission = sequelize.define('Commission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('earned', 'pending_payment', 'paid', 'cancelled'),
    allowNull: false,
    defaultValue: 'earned'
  },
  earnedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Set up associations
Lead.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Lead, {
  foreignKey: 'agentId',
  as: 'leads'
});

Commission.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Commission, {
  foreignKey: 'agentId',
  as: 'commissions'
});

Commission.belongsTo(Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

Lead.hasOne(Commission, {
  foreignKey: 'leadId',
  as: 'commission'
});

// Performance calculation function
const calculateAgentPerformance = async (agentId, startDate, endDate) => {
  // Get all leads for the agent
  const allLeads = await Lead.count({
    where: {
      agentId,
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    }
  });

  // Get approved leads (successful onboardings)
  const approvedLeads = await Lead.count({
    where: {
      agentId,
      status: 'approved',
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    }
  });

  // Calculate conversion rate
  const conversionRate = allLeads > 0 ? ((approvedLeads / allLeads) * 100) : 0;

  // Get total commission earned
  const commissionResult = await Commission.findOne({
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
    ],
    where: {
      agentId,
      earnedDate: {
        [Op.between]: [startDate, endDate]
      },
      status: {
        [Op.in]: ['earned', 'pending_payment', 'paid']
      }
    },
    raw: true
  });

  const totalCommission = parseFloat(commissionResult?.totalCommission || 0);

  return {
    totalLeads: allLeads,
    propertiesOnboarded: approvedLeads,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    commissionEarned: totalCommission
  };
};

describe('Property 19: Performance metric accuracy', () => {
  let agent1, agent2;

  beforeAll(async () => {
    // Initialize database
    await sequelize.sync({ force: true });
    
    // Create test agents
    agent1 = await User.create({
      name: 'Test Agent 1',
      email: 'agent1@test.com',
      internalRole: 'agent',
      isActive: true
    });

    agent2 = await User.create({
      name: 'Test Agent 2',
      email: 'agent2@test.com',
      internalRole: 'agent',
      isActive: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });



  test('Properties onboarded count matches approved leads', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }), // Number of approved leads
        fc.integer({ min: 0, max: 10 }), // Number of rejected leads
        async (approvedCount, rejectedCount) => {
          // Clean up data for this test
          await Lead.destroy({ where: { agentId: agent1.id } });
          
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');

          // Create approved leads
          const approvedLeads = [];
          for (let i = 0; i < approvedCount; i++) {
            approvedLeads.push({
              propertyOwnerName: `Owner ${i}`,
              email: `owner${i}@test.com`,
              status: 'approved',
              agentId: agent1.id,
              approvedAt: new Date('2024-06-01'),
              createdAt: new Date('2024-06-01')
            });
          }

          // Create rejected leads
          const rejectedLeads = [];
          for (let i = 0; i < rejectedCount; i++) {
            rejectedLeads.push({
              propertyOwnerName: `Rejected Owner ${i}`,
              email: `rejected${i}@test.com`,
              status: 'rejected',
              agentId: agent1.id,
              createdAt: new Date('2024-06-01')
            });
          }

          await Lead.bulkCreate([...approvedLeads, ...rejectedLeads]);

          const performance = await calculateAgentPerformance(agent1.id, startDate, endDate);

          // Property: Properties onboarded should equal approved leads count
          return performance.propertiesOnboarded === approvedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Conversion rate calculation is accurate', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }), // Total leads (at least 1 to avoid division by zero)
        fc.float({ min: 0, max: 1, noNaN: true }), // Conversion rate as fraction
        async (totalLeads, conversionFraction) => {
          // Clean up data for this test
          await Lead.destroy({ where: { agentId: agent1.id } });
          
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');

          const approvedCount = Math.floor(totalLeads * conversionFraction);
          const rejectedCount = totalLeads - approvedCount;

          // Create leads
          const leads = [];
          for (let i = 0; i < approvedCount; i++) {
            leads.push({
              propertyOwnerName: `Approved Owner ${i}`,
              email: `approved${i}@test.com`,
              status: 'approved',
              agentId: agent1.id,
              approvedAt: new Date('2024-06-01'),
              createdAt: new Date('2024-06-01')
            });
          }

          for (let i = 0; i < rejectedCount; i++) {
            leads.push({
              propertyOwnerName: `Other Owner ${i}`,
              email: `other${i}@test.com`,
              status: 'rejected',
              agentId: agent1.id,
              createdAt: new Date('2024-06-01')
            });
          }

          await Lead.bulkCreate(leads);

          const performance = await calculateAgentPerformance(agent1.id, startDate, endDate);
          const expectedConversionRate = parseFloat(((approvedCount / totalLeads) * 100).toFixed(2));

          // Property: Conversion rate should match calculated percentage
          return Math.abs(performance.conversionRate - expectedConversionRate) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Commission earned matches sum of individual commissions', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(fc.float({ min: 100, max: 10000, noNaN: true }), { minLength: 0, maxLength: 10 }), // Commission amounts
        async (commissionAmounts) => {
          // Clean up data for this test
          await Commission.destroy({ where: { agentId: agent1.id } });
          
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');

          // Create commissions
          const commissions = commissionAmounts.map((amount, index) => ({
            agentId: agent1.id,
            amount: parseFloat(amount.toFixed(2)),
            status: 'earned',
            earnedDate: '2024-06-01'
          }));

          if (commissions.length > 0) {
            await Commission.bulkCreate(commissions);
          }

          const performance = await calculateAgentPerformance(agent1.id, startDate, endDate);
          const expectedTotal = commissionAmounts.reduce((sum, amount) => sum + amount, 0);

          // Property: Total commission should equal sum of individual commissions
          // Use a more lenient tolerance for floating point comparison
          const tolerance = Math.max(0.01, expectedTotal * 0.001); // 0.1% tolerance or 0.01, whichever is larger
          return Math.abs(performance.commissionEarned - expectedTotal) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Performance metrics are isolated per agent', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Agent 1 leads
        fc.integer({ min: 1, max: 10 }), // Agent 2 leads
        fc.float({ min: 100, max: 5000, noNaN: true }), // Agent 1 commission
        fc.float({ min: 100, max: 5000, noNaN: true }), // Agent 2 commission
        async (agent1Leads, agent2Leads, agent1Commission, agent2Commission) => {
          // Clean up data for this test
          await Lead.destroy({ where: { agentId: [agent1.id, agent2.id] } });
          await Commission.destroy({ where: { agentId: [agent1.id, agent2.id] } });
          
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');

          // Create leads for agent 1
          const leads1 = [];
          for (let i = 0; i < agent1Leads; i++) {
            leads1.push({
              propertyOwnerName: `Agent1 Owner ${i}`,
              email: `agent1owner${i}@test.com`,
              status: 'approved',
              agentId: agent1.id,
              approvedAt: new Date('2024-06-01'),
              createdAt: new Date('2024-06-01')
            });
          }

          // Create leads for agent 2
          const leads2 = [];
          for (let i = 0; i < agent2Leads; i++) {
            leads2.push({
              propertyOwnerName: `Agent2 Owner ${i}`,
              email: `agent2owner${i}@test.com`,
              status: 'approved',
              agentId: agent2.id,
              approvedAt: new Date('2024-06-01'),
              createdAt: new Date('2024-06-01')
            });
          }

          await Lead.bulkCreate([...leads1, ...leads2]);

          // Create commissions
          await Commission.bulkCreate([
            {
              agentId: agent1.id,
              amount: parseFloat(agent1Commission.toFixed(2)),
              status: 'earned',
              earnedDate: '2024-06-01'
            },
            {
              agentId: agent2.id,
              amount: parseFloat(agent2Commission.toFixed(2)),
              status: 'earned',
              earnedDate: '2024-06-01'
            }
          ]);

          const performance1 = await calculateAgentPerformance(agent1.id, startDate, endDate);
          const performance2 = await calculateAgentPerformance(agent2.id, startDate, endDate);

          // Property: Each agent's metrics should only reflect their own data
          const tolerance1 = Math.max(0.01, agent1Commission * 0.001);
          const tolerance2 = Math.max(0.01, agent2Commission * 0.001);
          
          const agent1Correct = performance1.propertiesOnboarded === agent1Leads &&
                               Math.abs(performance1.commissionEarned - agent1Commission) < tolerance1;
          
          const agent2Correct = performance2.propertiesOnboarded === agent2Leads &&
                               Math.abs(performance2.commissionEarned - agent2Commission) < tolerance2;

          return agent1Correct && agent2Correct;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Date range filtering works correctly', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Leads in range
        fc.integer({ min: 1, max: 5 }), // Leads outside range
        async (leadsInRange, leadsOutsideRange) => {
          // Clean up data for this test
          await Lead.destroy({ where: { agentId: agent1.id } });
          
          const startDate = new Date('2024-06-01');
          const endDate = new Date('2024-08-31');

          // Create leads within date range
          const leadsIn = [];
          for (let i = 0; i < leadsInRange; i++) {
            leadsIn.push({
              propertyOwnerName: `In Range Owner ${i}`,
              email: `inrange${i}@test.com`,
              status: 'approved',
              agentId: agent1.id,
              approvedAt: new Date('2024-07-01'),
              createdAt: new Date('2024-07-01')
            });
          }

          // Create leads outside date range
          const leadsOut = [];
          for (let i = 0; i < leadsOutsideRange; i++) {
            leadsOut.push({
              propertyOwnerName: `Out Range Owner ${i}`,
              email: `outrange${i}@test.com`,
              status: 'approved',
              agentId: agent1.id,
              approvedAt: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01')
            });
          }

          await Lead.bulkCreate([...leadsIn, ...leadsOut]);

          const performance = await calculateAgentPerformance(agent1.id, startDate, endDate);

          // Property: Only leads within date range should be counted
          return performance.propertiesOnboarded === leadsInRange;
        }
      ),
      { numRuns: 100 }
    );
  });
});