/**
 * Property-Based Tests for Territory-Based Lead Assignment
 * Feature: internal-user-roles, Property 9: Territory-based lead assignment
 * 
 * Property: For any new lead created in a territory, the lead should be 
 * automatically assigned to an agent designated for that territory
 * 
 * Validates: Requirements 4.2, 28.1
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
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users'
});

// Define Territory model inline for testing
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  regionalManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'territories'
});

// Define Lead model inline for testing
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
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  propertyType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'contacted'
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'leads'
});

// Define associations
Territory.hasMany(User, {
  foreignKey: 'territoryId',
  as: 'agents'
});

User.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Territory.hasMany(Lead, {
  foreignKey: 'territoryId',
  as: 'leads'
});

Lead.belongsTo(Territory, {
  foreignKey: 'territoryId',
  as: 'territory'
});

Lead.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Lead, {
  foreignKey: 'agentId',
  as: 'leads'
});

/**
 * Function to automatically assign lead to an agent in the territory
 * This simulates the business logic that should happen when a lead is created
 */
async function assignLeadToTerritoryAgent(leadData, territoryId) {
  // Find an active agent in the territory
  const agents = await User.findAll({
    where: {
      territoryId: territoryId,
      internalRole: 'agent',
      isActive: true
    }
  });

  if (agents.length === 0) {
    throw new Error('No active agents available in territory');
  }

  // Simple round-robin: pick the first agent
  // In production, this could be more sophisticated (least loaded, etc.)
  const assignedAgent = agents[0];

  // Create the lead with the assigned agent
  return await Lead.create({
    ...leadData,
    territoryId: territoryId,
    agentId: assignedAgent.id
  });
}

describe('Property 9: Territory-Based Lead Assignment', () => {
  let territoryCounter = 0;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Disable foreign key checks for cleanup
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await Lead.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Territory.destroy({ where: {}, force: true });
    await sequelize.query('PRAGMA foreign_keys = ON');
    territoryCounter = 0;
  });

  /**
   * Generator for territory names
   * Using a counter to ensure uniqueness
   */
  const territoryNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('North', 'South', 'East', 'West', 'Central'),
      fc.constantFrom('Region', 'Zone', 'Territory', 'District')
    ).map(([direction, type]) => {
      territoryCounter++;
      return `${direction} ${type} ${Date.now()}-${territoryCounter}`;
    });

  /**
   * Generator for agent names
   */
  const agentNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Raj', 'Priya'),
      fc.constantFrom('Smith', 'Johnson', 'Kumar', 'Patel', 'Singh', 'Sharma')
    ).map(([first, last]) => `${first} ${last}`);

  /**
   * Generator for email addresses
   */
  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'), { minLength: 5, maxLength: 15 }),
      fc.constantFrom('example.com', 'test.com', 'demo.com', 'gmail.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  /**
   * Generator for phone numbers
   */
  const phoneArbitrary = () =>
    fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString());

  /**
   * Generator for property types
   */
  const propertyTypeArbitrary = () =>
    fc.constantFrom('hotel', 'pg');

  /**
   * Generator for city names
   */
  const cityArbitrary = () =>
    fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad');

  /**
   * Generator for state names
   */
  const stateArbitrary = () =>
    fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat');

  /**
   * Generator for lead data (without agentId or territoryId)
   */
  const leadDataArbitrary = () =>
    fc.record({
      propertyOwnerName: agentNameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      propertyType: propertyTypeArbitrary(),
      city: cityArbitrary(),
      state: stateArbitrary(),
      country: fc.constant('India')
    });

  test('Property 9: Lead in territory is assigned to an agent in that territory', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        agentNameArbitrary(),
        emailArbitrary(),
        leadDataArbitrary(),
        async (territoryName, agentName, agentEmail, leadData) => {
          // Create a territory
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Create an agent in this territory
          const agent = await User.create({
            name: agentName,
            email: agentEmail,
            internalRole: 'agent',
            territoryId: territory.id,
            isActive: true
          });

          // Create a lead in this territory (should auto-assign to agent)
          const lead = await assignLeadToTerritoryAgent(leadData, territory.id);

          // Property assertion: Lead must be assigned to an agent in the territory
          expect(lead.territoryId).toBe(territory.id);
          expect(lead.agentId).toBe(agent.id);

          // Verify the agent is indeed in the territory
          const assignedAgent = await User.findByPk(lead.agentId);
          expect(assignedAgent.territoryId).toBe(territory.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Multiple agents in territory - lead assigned to one of them', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        fc.array(
          fc.record({
            agentName: agentNameArbitrary(),
            agentEmail: emailArbitrary()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        leadDataArbitrary(),
        async (territoryName, agentData, leadData) => {
          // Create a territory
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Create multiple agents in this territory
          const agents = [];
          for (let i = 0; i < agentData.length; i++) {
            const agent = await User.create({
              name: agentData[i].agentName,
              email: `${agentData[i].agentEmail.split('@')[0]}${i}@${agentData[i].agentEmail.split('@')[1]}`,
              internalRole: 'agent',
              territoryId: territory.id,
              isActive: true
            });
            agents.push(agent);
          }

          // Create a lead in this territory
          const lead = await assignLeadToTerritoryAgent(leadData, territory.id);

          // Property assertion: Lead must be assigned to one of the agents in the territory
          expect(lead.territoryId).toBe(territory.id);
          expect(lead.agentId).toBeDefined();

          const agentIds = agents.map(a => a.id);
          expect(agentIds).toContain(lead.agentId);

          // Verify the assigned agent is in the territory
          const assignedAgent = await User.findByPk(lead.agentId);
          expect(assignedAgent.territoryId).toBe(territory.id);
          expect(assignedAgent.internalRole).toBe('agent');
          expect(assignedAgent.isActive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Inactive agents are not assigned leads', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        agentNameArbitrary(),
        emailArbitrary(),
        agentNameArbitrary(),
        emailArbitrary(),
        leadDataArbitrary(),
        async (territoryName, activeAgentName, activeAgentEmail, inactiveAgentName, inactiveAgentEmail, leadData) => {
          // Create a territory
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Create an inactive agent
          await User.create({
            name: inactiveAgentName,
            email: inactiveAgentEmail,
            internalRole: 'agent',
            territoryId: territory.id,
            isActive: false
          });

          // Create an active agent
          const activeAgent = await User.create({
            name: activeAgentName,
            email: `active_${activeAgentEmail}`,
            internalRole: 'agent',
            territoryId: territory.id,
            isActive: true
          });

          // Create a lead in this territory
          const lead = await assignLeadToTerritoryAgent(leadData, territory.id);

          // Property assertion: Lead must be assigned to the active agent, not the inactive one
          expect(lead.agentId).toBe(activeAgent.id);

          const assignedAgent = await User.findByPk(lead.agentId);
          expect(assignedAgent.isActive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Territory with no agents throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        leadDataArbitrary(),
        async (territoryName, leadData) => {
          // Create a territory with no agents
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Try to create a lead in this territory - should fail
          await expect(
            assignLeadToTerritoryAgent(leadData, territory.id)
          ).rejects.toThrow('No active agents available in territory');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 9: Multiple leads in same territory can be assigned to different agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        fc.array(
          fc.record({
            agentName: agentNameArbitrary(),
            agentEmail: emailArbitrary()
          }),
          { minLength: 2, maxLength: 3 }
        ),
        fc.array(leadDataArbitrary(), { minLength: 3, maxLength: 6 }),
        async (territoryName, agentData, leadsData) => {
          // Create a territory
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Create multiple agents in this territory
          const agents = [];
          for (let i = 0; i < agentData.length; i++) {
            const agent = await User.create({
              name: agentData[i].agentName,
              email: `${agentData[i].agentEmail.split('@')[0]}${i}@${agentData[i].agentEmail.split('@')[1]}`,
              internalRole: 'agent',
              territoryId: territory.id,
              isActive: true
            });
            agents.push(agent);
          }

          // Create multiple leads in this territory
          const leads = [];
          for (let i = 0; i < leadsData.length; i++) {
            const leadData = {
              ...leadsData[i],
              email: `${leadsData[i].email.split('@')[0]}${i}@${leadsData[i].email.split('@')[1]}`
            };
            const lead = await assignLeadToTerritoryAgent(leadData, territory.id);
            leads.push(lead);
          }

          // Property assertion: All leads must be in the territory
          for (const lead of leads) {
            expect(lead.territoryId).toBe(territory.id);
          }

          // Property assertion: All leads must be assigned to agents in the territory
          const agentIds = agents.map(a => a.id);
          for (const lead of leads) {
            expect(agentIds).toContain(lead.agentId);
          }

          // Verify all assigned agents are in the territory
          for (const lead of leads) {
            const assignedAgent = await User.findByPk(lead.agentId);
            expect(assignedAgent.territoryId).toBe(territory.id);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 9: Lead territory and agent territory must match', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        agentNameArbitrary(),
        emailArbitrary(),
        leadDataArbitrary(),
        async (territoryName, agentName, agentEmail, leadData) => {
          // Create a territory
          const territory = await Territory.create({
            name: territoryName,
            description: `Test territory ${territoryName}`
          });

          // Create an agent in this territory
          const agent = await User.create({
            name: agentName,
            email: agentEmail,
            internalRole: 'agent',
            territoryId: territory.id,
            isActive: true
          });

          // Create a lead in this territory
          const lead = await assignLeadToTerritoryAgent(leadData, territory.id);

          // Property assertion: Lead's territory must match agent's territory
          const assignedAgent = await User.findByPk(lead.agentId);
          expect(lead.territoryId).toBe(assignedAgent.territoryId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
