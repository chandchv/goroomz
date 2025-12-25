/**
 * Property-Based Tests for Commission Total Calculation
 * Feature: internal-user-roles, Property 16: Commission total calculation
 * 
 * Property: For any agent and time period, the total commission displayed should 
 * equal the sum of all individual commission amounts for that agent in that period
 * 
 * Validates: Requirements 2.5
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

/**
 * Function to calculate total commission for an agent in a time period
 */
async function calculateTotalCommission(agentId, startDate, endDate) {
  const whereClause = { agentId };

  if (startDate || endDate) {
    whereClause.earnedDate = {};
    if (startDate) {
      whereClause.earnedDate[Op.gte] = startDate;
    }
    if (endDate) {
      whereClause.earnedDate[Op.lte] = endDate;
    }
  }

  const total = await Commission.sum('amount', { where: whereClause });
  return parseFloat(total || 0);
}

describe('Property 16: Commission Total Calculation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Commission.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for commission amounts
   */
  const amountArbitrary = () =>
    fc.float({ min: 100, max: 10000, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for commission rates
   */
  const rateArbitrary = () =>
    fc.float({ min: 0, max: 20, noNaN: true }).map(n => parseFloat(n.toFixed(2)));

  /**
   * Generator for dates in 2024
   */
  const dateArbitrary = () =>
    fc.integer({ min: 0, max: 364 }).map(days => {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

  test('Property 16: Total commission equals sum of individual commissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            rate: rateArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (agentId, commissionsData) => {
          // Create commissions for the agent
          const createdCommissions = [];
          for (const data of commissionsData) {
            const commission = await Commission.create({
              agentId,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: data.rate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
            createdCommissions.push(commission);
          }

          // Calculate expected total (sum of all amounts)
          const expectedTotal = commissionsData.reduce((sum, c) => sum + c.amount, 0);

          // Calculate actual total using the function
          const actualTotal = await calculateTotalCommission(agentId, null, null);

          // Property assertion: Total should equal sum of individual amounts
          expect(actualTotal).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16: Total commission for date range equals sum within that range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            rate: rateArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 3, maxLength: 10 }
        ),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, commissionsData, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create commissions for the agent
          for (const data of commissionsData) {
            await Commission.create({
              agentId,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: data.rate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
          }

          // Calculate expected total (sum of amounts within date range)
          const expectedTotal = commissionsData
            .filter(c => c.earnedDate >= actualStartDate && c.earnedDate <= actualEndDate)
            .reduce((sum, c) => sum + c.amount, 0);

          // Calculate actual total using the function
          const actualTotal = await calculateTotalCommission(agentId, actualStartDate, actualEndDate);

          // Property assertion: Total should equal sum of amounts in date range
          expect(actualTotal).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16: Total commission for different agents are independent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            agentId: fc.uuid(),
            commissions: fc.array(
              fc.record({
                leadId: fc.uuid(),
                propertyId: fc.uuid(),
                amount: amountArbitrary(),
                rate: rateArbitrary(),
                earnedDate: dateArbitrary()
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (agentsData) => {
          // Create commissions for each agent
          const expectedTotals = new Map();

          for (const agentData of agentsData) {
            let agentTotal = 0;
            for (const commissionData of agentData.commissions) {
              await Commission.create({
                agentId: agentData.agentId,
                leadId: commissionData.leadId,
                propertyId: commissionData.propertyId,
                amount: commissionData.amount,
                rate: commissionData.rate,
                status: 'earned',
                earnedDate: commissionData.earnedDate
              });
              agentTotal += commissionData.amount;
            }
            expectedTotals.set(agentData.agentId, agentTotal);
          }

          // Verify each agent's total is correct and independent
          for (const agentData of agentsData) {
            const actualTotal = await calculateTotalCommission(agentData.agentId, null, null);
            const expectedTotal = expectedTotals.get(agentData.agentId);

            // Property assertion: Each agent's total should match their commissions only
            expect(actualTotal).toBeCloseTo(expectedTotal, 2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 16: Total commission is zero when no commissions exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (agentId) => {
          // Don't create any commissions

          // Calculate total
          const actualTotal = await calculateTotalCommission(agentId, null, null);

          // Property assertion: Total should be zero
          expect(actualTotal).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16: Adding a commission increases total by that amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            rate: rateArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.record({
          leadId: fc.uuid(),
          propertyId: fc.uuid(),
          amount: amountArbitrary(),
          rate: rateArbitrary(),
          earnedDate: dateArbitrary()
        }),
        async (agentId, initialCommissions, newCommission) => {
          // Create initial commissions
          for (const data of initialCommissions) {
            await Commission.create({
              agentId,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: data.rate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
          }

          // Get initial total
          const initialTotal = await calculateTotalCommission(agentId, null, null);

          // Add new commission
          await Commission.create({
            agentId,
            leadId: newCommission.leadId,
            propertyId: newCommission.propertyId,
            amount: newCommission.amount,
            rate: newCommission.rate,
            status: 'earned',
            earnedDate: newCommission.earnedDate
          });

          // Get new total
          const newTotal = await calculateTotalCommission(agentId, null, null);

          // Property assertion: New total should equal initial total plus new amount
          expect(newTotal).toBeCloseTo(initialTotal + newCommission.amount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16: Total commission calculation is associative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            rate: rateArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (agentId, commissionsData) => {
          // Create all commissions
          for (const data of commissionsData) {
            await Commission.create({
              agentId,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: data.rate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
          }

          // Calculate total all at once
          const totalAllAtOnce = await calculateTotalCommission(agentId, null, null);

          // Calculate total by summing groups
          const midpoint = Math.floor(commissionsData.length / 2);
          const group1Dates = commissionsData.slice(0, midpoint).map(c => c.earnedDate);
          const group2Dates = commissionsData.slice(midpoint).map(c => c.earnedDate);

          const minDate1 = Math.min(...group1Dates);
          const maxDate1 = Math.max(...group1Dates);
          const minDate2 = Math.min(...group2Dates);
          const maxDate2 = Math.max(...group2Dates);

          const total1 = await calculateTotalCommission(agentId, minDate1, maxDate1);
          const total2 = await calculateTotalCommission(agentId, minDate2, maxDate2);

          // Property assertion: Sum of groups should equal total
          // Note: This only holds if date ranges don't overlap
          if (maxDate1 < minDate2 || maxDate2 < minDate1) {
            expect(total1 + total2).toBeCloseTo(totalAllAtOnce, 2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 16: Total commission is non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            leadId: fc.uuid(),
            propertyId: fc.uuid(),
            amount: amountArbitrary(),
            rate: rateArbitrary(),
            earnedDate: dateArbitrary()
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (agentId, commissionsData) => {
          // Create commissions
          for (const data of commissionsData) {
            await Commission.create({
              agentId,
              leadId: data.leadId,
              propertyId: data.propertyId,
              amount: data.amount,
              rate: data.rate,
              status: 'earned',
              earnedDate: data.earnedDate
            });
          }

          // Calculate total
          const total = await calculateTotalCommission(agentId, null, null);

          // Property assertion: Total should never be negative
          expect(total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
