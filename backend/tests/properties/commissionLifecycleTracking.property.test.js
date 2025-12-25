/**
 * Property-Based Tests for Commission Lifecycle Tracking
 * Feature: internal-user-roles, Property 14: Commission lifecycle tracking
 * 
 * Property: For any approved property onboarding, a commission record must be created 
 * with the agent ID, property ID, amount, rate, and earned date
 * 
 * Validates: Requirements 1.4, 17.2
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
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 5.0
  }
}, {
  tableName: 'users'
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
  status: {
    type: DataTypes.STRING,
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
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'leads'
});

// Define Commission model inline for testing
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
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'earned'
  },
  earnedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'commissions'
});

// Define associations
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

Lead.hasMany(Commission, {
  foreignKey: 'leadId',
  as: 'commissions'
});

/**
 * Function to simulate property onboarding approval and commission creation
 */
async function approveOnboardingAndCreateCommission(lead, approverId, propertyId, baseAmount) {
  // Update lead status to approved
  lead.status = 'approved';
  lead.approvedAt = new Date();
  lead.approvedBy = approverId;
  await lead.save();

  // Get agent's commission rate
  const agent = await User.findByPk(lead.agentId);
  const commissionRate = agent.commissionRate !== null && agent.commissionRate !== undefined 
    ? agent.commissionRate 
    : 5.0;

  // Calculate commission amount
  const commissionAmount = (baseAmount * commissionRate) / 100;

  // Create commission record
  const commission = await Commission.create({
    agentId: lead.agentId,
    leadId: lead.id,
    propertyId: propertyId,
    amount: commissionAmount,
    rate: commissionRate,
    status: 'earned',
    earnedDate: new Date()
  });

  return commission;
}

describe('Property 14: Commission Lifecycle Tracking', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Commission.destroy({ where: {}, truncate: true });
    await Lead.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for names
   */
  const nameArbitrary = () =>
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
   * Generator for commission rates (0-20%)
   */
  const commissionRateArbitrary = () =>
    fc.float({ min: 0, max: 20, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for base amounts (property value)
   */
  const baseAmountArbitrary = () =>
    fc.float({ min: 10000, max: 1000000, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for lead data
   */
  const leadDataArbitrary = () =>
    fc.record({
      propertyOwnerName: nameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      propertyType: propertyTypeArbitrary(),
      city: cityArbitrary(),
      state: stateArbitrary()
    });

  test('Property 14: Commission record is created when lead is approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        leadDataArbitrary(),
        baseAmountArbitrary(),
        async (agentName, agentEmail, commissionRate, leadData, baseAmount) => {
          // Ensure unique emails
          const uniqueAgentEmail = `agent_${Date.now()}_${agentEmail}`;
          const uniqueLeadEmail = `lead_${Date.now()}_${leadData.email}`;

          // Create an agent
          const agent = await User.create({
            name: agentName,
            email: uniqueAgentEmail,
            internalRole: 'agent',
            commissionRate: commissionRate
          });

          // Create a regional manager (approver)
          const approver = await User.create({
            name: 'Regional Manager',
            email: `rm_${Date.now()}_${agentEmail}`,
            internalRole: 'regional_manager'
          });

          // Create a lead
          const lead = await Lead.create({
            ...leadData,
            email: uniqueLeadEmail,
            agentId: agent.id,
            status: 'pending_approval'
          });

          // Generate a property ID
          const propertyId = fc.sample(fc.uuid(), 1)[0];

          // Approve onboarding and create commission
          const commission = await approveOnboardingAndCreateCommission(
            lead,
            approver.id,
            propertyId,
            baseAmount
          );

          // Property assertion: Commission record must be created
          expect(commission).toBeDefined();
          expect(commission.id).toBeDefined();

          // Property assertion: Commission must have agent ID
          expect(commission.agentId).toBe(agent.id);

          // Property assertion: Commission must have lead ID
          expect(commission.leadId).toBe(lead.id);

          // Property assertion: Commission must have property ID
          expect(commission.propertyId).toBe(propertyId);

          // Property assertion: Commission must have amount
          expect(commission.amount).toBeDefined();
          expect(parseFloat(commission.amount)).toBeGreaterThanOrEqual(0);

          // Property assertion: Commission must have rate
          expect(commission.rate).toBeDefined();
          expect(parseFloat(commission.rate)).toBe(commissionRate);

          // Property assertion: Commission must have earned date
          expect(commission.earnedDate).toBeDefined();

          // Property assertion: Commission status should be 'earned'
          expect(commission.status).toBe('earned');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14: Commission amount is calculated correctly based on rate', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        leadDataArbitrary(),
        baseAmountArbitrary(),
        async (agentName, agentEmail, commissionRate, leadData, baseAmount) => {
          // Ensure unique emails
          const uniqueAgentEmail = `agent_${Date.now()}_${agentEmail}`;
          const uniqueLeadEmail = `lead_${Date.now()}_${leadData.email}`;

          // Create an agent
          const agent = await User.create({
            name: agentName,
            email: uniqueAgentEmail,
            internalRole: 'agent',
            commissionRate: commissionRate
          });

          // Create a regional manager (approver)
          const approver = await User.create({
            name: 'Regional Manager',
            email: `rm_${Date.now()}_${agentEmail}`,
            internalRole: 'regional_manager'
          });

          // Create a lead
          const lead = await Lead.create({
            ...leadData,
            email: uniqueLeadEmail,
            agentId: agent.id,
            status: 'pending_approval'
          });

          // Generate a property ID
          const propertyId = fc.sample(fc.uuid(), 1)[0];

          // Approve onboarding and create commission
          const commission = await approveOnboardingAndCreateCommission(
            lead,
            approver.id,
            propertyId,
            baseAmount
          );

          // Calculate expected commission amount
          const expectedAmount = (baseAmount * commissionRate) / 100;

          // Property assertion: Commission amount should match calculation
          expect(parseFloat(commission.amount)).toBeCloseTo(expectedAmount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14: Multiple approved leads create multiple commission records', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        fc.array(leadDataArbitrary(), { minLength: 2, maxLength: 5 }),
        fc.array(baseAmountArbitrary(), { minLength: 2, maxLength: 5 }),
        async (agentName, agentEmail, commissionRate, leadsData, baseAmounts) => {
          // Create an agent
          const agent = await User.create({
            name: agentName,
            email: agentEmail,
            internalRole: 'agent',
            commissionRate: commissionRate
          });

          // Create a regional manager (approver)
          const approver = await User.create({
            name: 'Regional Manager',
            email: `rm_${agentEmail}`,
            internalRole: 'regional_manager'
          });

          // Create and approve multiple leads
          const commissions = [];
          const numLeads = Math.min(leadsData.length, baseAmounts.length);

          for (let i = 0; i < numLeads; i++) {
            const leadData = {
              ...leadsData[i],
              email: `${leadsData[i].email.split('@')[0]}${i}@${leadsData[i].email.split('@')[1]}`
            };

            const lead = await Lead.create({
              ...leadData,
              agentId: agent.id,
              status: 'pending_approval'
            });

            const propertyId = fc.sample(fc.uuid(), 1)[0];

            const commission = await approveOnboardingAndCreateCommission(
              lead,
              approver.id,
              propertyId,
              baseAmounts[i]
            );

            commissions.push(commission);
          }

          // Property assertion: Number of commissions should match number of approved leads
          expect(commissions.length).toBe(numLeads);

          // Property assertion: All commissions should have the same agent ID
          for (const commission of commissions) {
            expect(commission.agentId).toBe(agent.id);
          }

          // Property assertion: All commissions should have unique lead IDs
          const leadIds = commissions.map(c => c.leadId);
          const uniqueLeadIds = new Set(leadIds);
          expect(uniqueLeadIds.size).toBe(numLeads);

          // Verify agent has all commissions
          const agentWithCommissions = await User.findByPk(agent.id, {
            include: [{ model: Commission, as: 'commissions' }]
          });

          expect(agentWithCommissions.commissions).toHaveLength(numLeads);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 14: Commission record persists after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        leadDataArbitrary(),
        baseAmountArbitrary(),
        async (agentName, agentEmail, commissionRate, leadData, baseAmount) => {
          // Ensure unique emails
          const uniqueAgentEmail = `agent_${Date.now()}_${agentEmail}`;
          const uniqueLeadEmail = `lead_${Date.now()}_${leadData.email}`;

          // Create an agent
          const agent = await User.create({
            name: agentName,
            email: uniqueAgentEmail,
            internalRole: 'agent',
            commissionRate: commissionRate
          });

          // Create a regional manager (approver)
          const approver = await User.create({
            name: 'Regional Manager',
            email: `rm_${Date.now()}_${agentEmail}`,
            internalRole: 'regional_manager'
          });

          // Create a lead
          const lead = await Lead.create({
            ...leadData,
            email: uniqueLeadEmail,
            agentId: agent.id,
            status: 'pending_approval'
          });

          // Generate a property ID
          const propertyId = fc.sample(fc.uuid(), 1)[0];

          // Approve onboarding and create commission
          const commission = await approveOnboardingAndCreateCommission(
            lead,
            approver.id,
            propertyId,
            baseAmount
          );

          const commissionId = commission.id;

          // Retrieve the commission from database
          const retrievedCommission = await Commission.findByPk(commissionId);

          // Property assertion: Commission should be retrievable
          expect(retrievedCommission).toBeDefined();
          expect(retrievedCommission.id).toBe(commissionId);
          expect(retrievedCommission.agentId).toBe(agent.id);
          expect(retrievedCommission.leadId).toBe(lead.id);
          expect(retrievedCommission.propertyId).toBe(propertyId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14: Commission has all required fields populated', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        leadDataArbitrary(),
        baseAmountArbitrary(),
        async (agentName, agentEmail, commissionRate, leadData, baseAmount) => {
          // Ensure unique emails
          const uniqueAgentEmail = `agent_${Date.now()}_${agentEmail}`;
          const uniqueLeadEmail = `lead_${Date.now()}_${leadData.email}`;

          // Create an agent
          const agent = await User.create({
            name: agentName,
            email: uniqueAgentEmail,
            internalRole: 'agent',
            commissionRate: commissionRate
          });

          // Create a regional manager (approver)
          const approver = await User.create({
            name: 'Regional Manager',
            email: `rm_${Date.now()}_${agentEmail}`,
            internalRole: 'regional_manager'
          });

          // Create a lead
          const lead = await Lead.create({
            ...leadData,
            email: uniqueLeadEmail,
            agentId: agent.id,
            status: 'pending_approval'
          });

          // Generate a property ID
          const propertyId = fc.sample(fc.uuid(), 1)[0];

          // Approve onboarding and create commission
          const commission = await approveOnboardingAndCreateCommission(
            lead,
            approver.id,
            propertyId,
            baseAmount
          );

          // Property assertion: All required fields must be populated
          expect(commission.agentId).toBeDefined();
          expect(commission.agentId).not.toBeNull();

          expect(commission.leadId).toBeDefined();
          expect(commission.leadId).not.toBeNull();

          expect(commission.propertyId).toBeDefined();
          expect(commission.propertyId).not.toBeNull();

          expect(commission.amount).toBeDefined();
          expect(commission.amount).not.toBeNull();
          expect(parseFloat(commission.amount)).toBeGreaterThanOrEqual(0);

          expect(commission.rate).toBeDefined();
          expect(commission.rate).not.toBeNull();
          expect(parseFloat(commission.rate)).toBeGreaterThanOrEqual(0);
          expect(parseFloat(commission.rate)).toBeLessThanOrEqual(100);

          expect(commission.earnedDate).toBeDefined();
          expect(commission.earnedDate).not.toBeNull();

          expect(commission.status).toBeDefined();
          expect(commission.status).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
