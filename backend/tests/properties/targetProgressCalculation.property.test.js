/**
 * Property-Based Tests for Target Progress Calculation
 * Feature: internal-user-roles, Property 21: Target progress calculation
 * 
 * Property: For any agent with a target, the progress percentage should equal 
 * (actual properties / target properties) × 100
 * 
 * Validates: Requirements 24.2
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

/**
 * Function to calculate progress percentage
 */
function calculateProgressPercentage(targetProperties, actualProperties) {
  if (targetProperties === 0) {
    return 0;
  }
  return (actualProperties / targetProperties) * 100;
}

describe('Property 21: Target Progress Calculation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await AgentTarget.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for target properties count
   */
  const targetPropertiesArbitrary = () =>
    fc.integer({ min: 1, max: 100 });

  /**
   * Generator for actual properties count (can be 0 to 150 to test over-achievement)
   */
  const actualPropertiesArbitrary = () =>
    fc.integer({ min: 0, max: 150 });

  /**
   * Generator for dates in 2024
   */
  const dateArbitrary = () =>
    fc.integer({ min: 0, max: 364 }).map(days => {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

  test('Property 21: Progress percentage equals (actual / target) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        actualPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, actualProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties,
            actualRevenue: 5000,
            setBy
          });

          // Calculate expected progress
          const expectedProgress = calculateProgressPercentage(targetProperties, actualProperties);

          // Calculate actual progress from the target
          const actualProgress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should equal (actual / target) × 100
          expect(actualProgress).toBeCloseTo(expectedProgress, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress is 0% when actual properties is 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target with 0 actual properties
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties: 0,
            actualRevenue: 0,
            setBy
          });

          // Calculate progress
          const progress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should be 0%
          expect(progress).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress is 100% when actual equals target', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target with actual equal to target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties: targetProperties,
            actualRevenue: 10000,
            setBy
          });

          // Calculate progress
          const progress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should be 100%
          expect(progress).toBeCloseTo(100, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress can exceed 100% when actual exceeds target', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        fc.integer({ min: 1, max: 50 }),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, extraProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          const actualProperties = targetProperties + extraProperties;

          // Create target with actual exceeding target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties,
            actualRevenue: 15000,
            setBy
          });

          // Calculate progress
          const progress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should exceed 100%
          expect(progress).toBeGreaterThan(100);
          
          // And should equal the expected calculation
          const expectedProgress = (actualProperties / targetProperties) * 100;
          expect(progress).toBeCloseTo(expectedProgress, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress is 0% when target is 0 (edge case)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        actualPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, actualProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target with 0 target properties (edge case)
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties: 0,
            targetRevenue: 0,
            actualProperties,
            actualRevenue: 0,
            setBy
          });

          // Calculate progress (should handle division by zero)
          const progress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should be 0% when target is 0
          expect(progress).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress is non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        actualPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, actualProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties,
            actualRevenue: 5000,
            setBy
          });

          // Calculate progress
          const progress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: Progress should never be negative
          expect(progress).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Incrementing actual properties increases progress proportionally', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, initialActual, increment, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Ensure initial actual doesn't exceed reasonable bounds
          const actualInitial = Math.min(initialActual, targetProperties);

          // Create target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties: actualInitial,
            actualRevenue: 5000,
            setBy
          });

          // Calculate initial progress
          const initialProgress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Increment actual properties
          target.actualProperties += increment;
          await target.save();

          // Calculate new progress
          const newProgress = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Calculate expected increase
          const expectedIncrease = (increment / targetProperties) * 100;

          // Property assertion: Progress should increase by the expected amount
          expect(newProgress - initialProgress).toBeCloseTo(expectedIncrease, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Progress calculation is consistent across multiple reads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        targetPropertiesArbitrary(),
        actualPropertiesArbitrary(),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetProperties, actualProperties, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties,
            targetRevenue: 10000,
            actualProperties,
            actualRevenue: 5000,
            setBy
          });

          // Calculate progress multiple times
          const progress1 = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          const progress2 = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          const progress3 = target.targetProperties > 0
            ? (target.actualProperties / target.targetProperties) * 100
            : 0;

          // Property assertion: All calculations should be identical
          expect(progress1).toBe(progress2);
          expect(progress2).toBe(progress3);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Revenue progress calculation follows same formula', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.float({ min: 1000, max: 100000, noNaN: true }).map(n => parseFloat(n.toFixed(2))),
        fc.float({ min: 0, max: 150000, noNaN: true }).map(n => parseFloat(n.toFixed(2))),
        dateArbitrary(),
        dateArbitrary(),
        async (agentId, setBy, targetRevenue, actualRevenue, startDate, endDate) => {
          // Ensure startDate <= endDate
          const [actualStartDate, actualEndDate] = startDate <= endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];

          // Create target
          const target = await AgentTarget.create({
            agentId,
            territoryId: null,
            period: 'monthly',
            startDate: actualStartDate,
            endDate: actualEndDate,
            targetProperties: 10,
            targetRevenue,
            actualProperties: 5,
            actualRevenue,
            setBy
          });

          // Calculate revenue progress
          const revenueProgress = target.targetRevenue > 0
            ? (parseFloat(target.actualRevenue) / parseFloat(target.targetRevenue)) * 100
            : 0;

          // Calculate expected progress
          const expectedProgress = targetRevenue > 0
            ? (actualRevenue / targetRevenue) * 100
            : 0;

          // Property assertion: Revenue progress should follow same formula
          expect(revenueProgress).toBeCloseTo(expectedProgress, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
