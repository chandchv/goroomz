/**
 * Property-Based Tests for Historical Commission Immutability
 * Feature: internal-user-roles, Property 17: Historical commission immutability
 * 
 * Property: For any commission rate update, existing commission records must 
 * remain unchanged with their original rates
 * 
 * Validates: Requirements 8.2
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
Commission.belongsTo(User, {
  foreignKey: 'agentId',
  as: 'agent'
});

User.hasMany(Commission, {
  foreignKey: 'agentId',
  as: 'commissions'
});

/**
 * Function to update agent's commission rate
 */
async function updateAgentCommissionRate(agentId, newRate) {
  const agent = await User.findByPk(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }
  agent.commissionRate = newRate;
  await agent.save();
  return agent;
}

describe('Property 17: Historical Commission Immutability', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Commission.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for names
   */
  const nameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'),
      fc.constantFrom('Smith', 'Johnson', 'Kumar', 'Patel')
    ).map(([first, last]) => `${first} ${last}`);

  /**
   * Generator for email addresses
   */
  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), { minLength: 5, maxLength: 10 }),
      fc.constantFrom('example.com', 'test.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  /**
   * Generator for commission rates (0-20%)
   */
  const commissionRateArbitrary = () =>
    fc.float({ min: 0, max: 20, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for commission amounts
   */
  const amountArbitrary = () =>
    fc.float({ min: 100, max: 10000, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for dates
   */
  const dateArbitrary = () =>
    fc.integer({ min: 0, max: 364 }).map(days => {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

  test('Property 17: Existing commission rates remain unchanged when agent rate is updated', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        commissionRateArbitrary(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (agentName, agentEmail, initialRate, newRate, commissionsData) => {
          // Ensure unique email
          const uniqueEmail = `${Date.now()}_${agentEmail}`;

          // Create an agent with initial commission rate
          const agent = await User.create({
            name: agentName,
            email: uniqueEmail,
            internalRole: 'agent',
            commissionRate: initialRate
          });

          // Create commissions with the initial rate
          const createdCommissions = [];
          for (const data of commissionsData) {
            const commission = await Commission.create({
              agentId: agent.id,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: initialRate, // Use agent's current rate
              status: 'earned',
              earnedDate: data.earnedDate
            });
            createdCommissions.push(commission);
          }

          // Store original commission rates
          const originalRates = createdCommissions.map(c => parseFloat(c.rate));

          // Update agent's commission rate
          await updateAgentCommissionRate(agent.id, newRate);

          // Reload commissions from database
          const reloadedCommissions = await Commission.findAll({
            where: { agentId: agent.id }
          });

          // Property assertion: All existing commission rates should remain unchanged
          for (let i = 0; i < reloadedCommissions.length; i++) {
            expect(parseFloat(reloadedCommissions[i].rate)).toBe(originalRates[i]);
            expect(parseFloat(reloadedCommissions[i].rate)).toBe(initialRate);
            
            // Only check that rate is not the new rate if they're different
            if (initialRate !== newRate) {
              expect(parseFloat(reloadedCommissions[i].rate)).not.toBe(newRate);
            }
          }

          // Verify agent's rate was updated
          await agent.reload();
          expect(parseFloat(agent.commissionRate)).toBe(newRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 17: Multiple rate updates do not affect historical commissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        fc.array(commissionRateArbitrary(), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (agentName, agentEmail, initialRate, newRates, commissionsData) => {
          // Ensure unique email
          const uniqueEmail = `${Date.now()}_${agentEmail}`;

          // Create an agent with initial commission rate
          const agent = await User.create({
            name: agentName,
            email: uniqueEmail,
            internalRole: 'agent',
            commissionRate: initialRate
          });

          // Create commissions with the initial rate
          const createdCommissions = [];
          for (const data of commissionsData) {
            const commission = await Commission.create({
              agentId: agent.id,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: initialRate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
            createdCommissions.push(commission);
          }

          // Store original commission rates
          const originalRates = createdCommissions.map(c => parseFloat(c.rate));

          // Update agent's commission rate multiple times
          for (const newRate of newRates) {
            await updateAgentCommissionRate(agent.id, newRate);
          }

          // Reload commissions from database
          const reloadedCommissions = await Commission.findAll({
            where: { agentId: agent.id }
          });

          // Property assertion: All existing commission rates should still be the original rate
          for (let i = 0; i < reloadedCommissions.length; i++) {
            expect(parseFloat(reloadedCommissions[i].rate)).toBe(originalRates[i]);
            expect(parseFloat(reloadedCommissions[i].rate)).toBe(initialRate);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 17: New commissions use updated rate, old commissions keep original rate', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        commissionRateArbitrary(),
        fc.record({
          leadId: fc.uuid(),
          propertyId: fc.uuid(),
          amount: amountArbitrary(),
          earnedDate: dateArbitrary()
        }),
        fc.record({
          leadId: fc.uuid(),
          propertyId: fc.uuid(),
          amount: amountArbitrary(),
          earnedDate: dateArbitrary()
        }),
        async (agentName, agentEmail, initialRate, newRate, oldCommissionData, newCommissionData) => {
          // Ensure unique email
          const uniqueEmail = `${Date.now()}_${agentEmail}`;

          // Create an agent with initial commission rate
          const agent = await User.create({
            name: agentName,
            email: uniqueEmail,
            internalRole: 'agent',
            commissionRate: initialRate
          });

          // Create a commission with the initial rate
          const oldCommission = await Commission.create({
            agentId: agent.id,
            leadId: oldCommissionData.leadId,
            propertyId: oldCommissionData.propertyId,
            amount: oldCommissionData.amount,
            rate: initialRate,
            status: 'earned',
            earnedDate: oldCommissionData.earnedDate
          });

          // Update agent's commission rate
          await updateAgentCommissionRate(agent.id, newRate);

          // Create a new commission with the new rate
          const newCommission = await Commission.create({
            agentId: agent.id,
            leadId: newCommissionData.leadId,
            propertyId: newCommissionData.propertyId,
            amount: newCommissionData.amount,
            rate: newRate, // Use new rate
            status: 'earned',
            earnedDate: newCommissionData.earnedDate
          });

          // Reload both commissions
          await oldCommission.reload();
          await newCommission.reload();

          // Property assertion: Old commission should keep original rate
          expect(parseFloat(oldCommission.rate)).toBe(initialRate);

          // Property assertion: New commission should have new rate
          expect(parseFloat(newCommission.rate)).toBe(newRate);

          // Property assertion: Rates should be different (unless they happen to be the same)
          if (initialRate !== newRate) {
            expect(parseFloat(oldCommission.rate)).not.toBe(parseFloat(newCommission.rate));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 17: Commission amounts remain unchanged when rate is updated', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        commissionRateArbitrary(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (agentName, agentEmail, initialRate, newRate, commissionsData) => {
          // Ensure unique email
          const uniqueEmail = `${Date.now()}_${agentEmail}`;

          // Create an agent with initial commission rate
          const agent = await User.create({
            name: agentName,
            email: uniqueEmail,
            internalRole: 'agent',
            commissionRate: initialRate
          });

          // Create commissions with the initial rate
          const createdCommissions = [];
          for (const data of commissionsData) {
            const commission = await Commission.create({
              agentId: agent.id,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: initialRate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
            createdCommissions.push(commission);
          }

          // Store original commission amounts
          const originalAmounts = createdCommissions.map(c => parseFloat(c.amount));

          // Update agent's commission rate
          await updateAgentCommissionRate(agent.id, newRate);

          // Reload commissions from database
          const reloadedCommissions = await Commission.findAll({
            where: { agentId: agent.id }
          });

          // Property assertion: All commission amounts should remain unchanged
          for (let i = 0; i < reloadedCommissions.length; i++) {
            expect(parseFloat(reloadedCommissions[i].amount)).toBe(originalAmounts[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 17: Historical commission data is completely immutable', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        commissionRateArbitrary(),
        commissionRateArbitrary(),
        fc.record({
          leadId: fc.uuid(),
          propertyId: fc.uuid(),
          amount: amountArbitrary(),
          earnedDate: dateArbitrary()
        }),
        async (agentName, agentEmail, initialRate, newRate, commissionData) => {
          // Ensure unique email
          const uniqueEmail = `${Date.now()}_${agentEmail}`;

          // Create an agent with initial commission rate
          const agent = await User.create({
            name: agentName,
            email: uniqueEmail,
            internalRole: 'agent',
            commissionRate: initialRate
          });

          // Create a commission
          const commission = await Commission.create({
            agentId: agent.id,
            leadId: commissionData.leadId,
            propertyId: commissionData.propertyId,
            amount: commissionData.amount,
            rate: initialRate,
            status: 'earned',
            earnedDate: commissionData.earnedDate
          });

          // Store all original commission data
          const originalData = {
            id: commission.id,
            agentId: commission.agentId,
            leadId: commission.leadId,
            propertyId: commission.propertyId,
            amount: parseFloat(commission.amount),
            rate: parseFloat(commission.rate),
            status: commission.status,
            earnedDate: commission.earnedDate
          };

          // Update agent's commission rate
          await updateAgentCommissionRate(agent.id, newRate);

          // Reload commission
          await commission.reload();

          // Property assertion: All commission fields should remain unchanged
          expect(commission.id).toBe(originalData.id);
          expect(commission.agentId).toBe(originalData.agentId);
          expect(commission.leadId).toBe(originalData.leadId);
          expect(commission.propertyId).toBe(originalData.propertyId);
          expect(parseFloat(commission.amount)).toBe(originalData.amount);
          expect(parseFloat(commission.rate)).toBe(originalData.rate);
          expect(commission.status).toBe(originalData.status);
          expect(commission.earnedDate).toBe(originalData.earnedDate);
        }
      ),
      { numRuns: 100 }
    );
  });
});
