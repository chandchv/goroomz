/**
 * Property-Based Tests for Filter Result Matching
 * Feature: internal-user-roles, Property 24: Filter result matching
 * 
 * Property: For any applied filters (region, property type, date range, status), 
 * all returned results should match all filter criteria
 * 
 * Validates: Requirements 5.5, 14.5, 29.3
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
    allowNull: false
  }
}, {
  tableName: 'leads'
});

/**
 * Function to apply filters to leads
 */
async function applyFilters(filters) {
  const whereClause = {};

  // Filter by status
  if (filters.status) {
    whereClause.status = filters.status;
  }

  // Filter by property type
  if (filters.propertyType) {
    whereClause.propertyType = filters.propertyType;
  }

  // Filter by city (region)
  if (filters.city) {
    whereClause.city = filters.city;
  }

  // Filter by state (region)
  if (filters.state) {
    whereClause.state = filters.state;
  }

  // Filter by date range
  if (filters.startDate || filters.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) {
      whereClause.createdAt[Op.gte] = new Date(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.createdAt[Op.lte] = new Date(filters.endDate);
    }
  }

  const results = await Lead.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']]
  });

  return results;
}

/**
 * Function to verify all results match the filters
 */
function verifyFilterResults(filters, results) {
  for (const result of results) {
    // Check status filter
    if (filters.status && result.status !== filters.status) {
      return {
        isValid: false,
        error: `Lead ${result.id} has status "${result.status}" but filter requires "${filters.status}"`
      };
    }

    // Check property type filter
    if (filters.propertyType && result.propertyType !== filters.propertyType) {
      return {
        isValid: false,
        error: `Lead ${result.id} has propertyType "${result.propertyType}" but filter requires "${filters.propertyType}"`
      };
    }

    // Check city filter
    if (filters.city && result.city !== filters.city) {
      return {
        isValid: false,
        error: `Lead ${result.id} has city "${result.city}" but filter requires "${filters.city}"`
      };
    }

    // Check state filter
    if (filters.state && result.state !== filters.state) {
      return {
        isValid: false,
        error: `Lead ${result.id} has state "${result.state}" but filter requires "${filters.state}"`
      };
    }

    // Check date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      const resultDate = new Date(result.createdAt);
      if (resultDate < startDate) {
        return {
          isValid: false,
          error: `Lead ${result.id} was created at ${resultDate.toISOString()} which is before start date ${startDate.toISOString()}`
        };
      }
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      const resultDate = new Date(result.createdAt);
      if (resultDate > endDate) {
        return {
          isValid: false,
          error: `Lead ${result.id} was created at ${resultDate.toISOString()} which is after end date ${endDate.toISOString()}`
        };
      }
    }
  }

  return { isValid: true };
}

describe('Property 24: Filter Result Matching', () => {
  let emailCounter = 0;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Lead.destroy({ where: {}, force: true });
    emailCounter = 0;
  });

  afterEach(async () => {
    await Lead.destroy({ where: {}, force: true });
  });

  /**
   * Generator for lead status
   */
  const statusArbitrary = () =>
    fc.constantFrom('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost');

  /**
   * Generator for property type
   */
  const propertyTypeArbitrary = () =>
    fc.constantFrom('hotel', 'pg');

  /**
   * Generator for city
   */
  const cityArbitrary = () =>
    fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai');

  /**
   * Generator for state
   */
  const stateArbitrary = () =>
    fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu');

  /**
   * Generator for lead data
   */
  const leadArbitrary = () =>
    fc.record({
      propertyOwnerName: fc.constantFrom('John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Kumar'),
      email: fc.constant(''), // Will be set uniquely
      phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString()),
      propertyType: propertyTypeArbitrary(),
      city: cityArbitrary(),
      state: stateArbitrary(),
      status: statusArbitrary()
    });

  test('Property 24: Filter by status returns only leads with matching status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 5, maxLength: 10 }),
        statusArbitrary(),
        async (leadsData, filterStatus) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails
          for (const leadData of leadsData) {
            await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`
            });
          }

          // Apply status filter
          const filters = { status: filterStatus };
          const results = await applyFilters(filters);

          // Verify all results match the filter
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Verify all results have the correct status
          for (const result of results) {
            expect(result.status).toBe(filterStatus);
          }

          // Verify we got the expected number of results
          const expectedCount = leadsData.filter(l => l.status === filterStatus).length;
          expect(results.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: Filter by property type returns only leads with matching type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 5, maxLength: 10 }),
        propertyTypeArbitrary(),
        async (leadsData, filterType) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails
          for (const leadData of leadsData) {
            await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`
            });
          }

          // Apply property type filter
          const filters = { propertyType: filterType };
          const results = await applyFilters(filters);

          // Verify all results match the filter
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Verify all results have the correct property type
          for (const result of results) {
            expect(result.propertyType).toBe(filterType);
          }

          // Verify we got the expected number of results
          const expectedCount = leadsData.filter(l => l.propertyType === filterType).length;
          expect(results.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: Filter by region (city) returns only leads in that city', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 5, maxLength: 10 }),
        cityArbitrary(),
        async (leadsData, filterCity) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails
          for (const leadData of leadsData) {
            await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`
            });
          }

          // Apply city filter
          const filters = { city: filterCity };
          const results = await applyFilters(filters);

          // Verify all results match the filter
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Verify all results have the correct city
          for (const result of results) {
            expect(result.city).toBe(filterCity);
          }

          // Verify we got the expected number of results
          const expectedCount = leadsData.filter(l => l.city === filterCity).length;
          expect(results.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: Multiple filters return only leads matching all criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 10, maxLength: 20 }),
        statusArbitrary(),
        propertyTypeArbitrary(),
        cityArbitrary(),
        async (leadsData, filterStatus, filterType, filterCity) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails
          for (const leadData of leadsData) {
            await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`
            });
          }

          // Apply multiple filters
          const filters = {
            status: filterStatus,
            propertyType: filterType,
            city: filterCity
          };
          const results = await applyFilters(filters);

          // Verify all results match all filters
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Verify all results match all criteria
          for (const result of results) {
            expect(result.status).toBe(filterStatus);
            expect(result.propertyType).toBe(filterType);
            expect(result.city).toBe(filterCity);
          }

          // Verify we got the expected number of results
          const expectedCount = leadsData.filter(l => 
            l.status === filterStatus &&
            l.propertyType === filterType &&
            l.city === filterCity
          ).length;
          expect(results.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: Date range filter returns only leads within the range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 5, maxLength: 10 }),
        async (leadsData) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails and different creation dates
          const now = new Date();
          const leads = [];
          for (let i = 0; i < leadsData.length; i++) {
            const leadData = leadsData[i];
            const createdAt = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); // Each lead 1 day apart
            const lead = await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`,
              createdAt
            });
            leads.push(lead);
          }

          // Apply date range filter (last 3 days)
          const startDate = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
          const filters = { startDate: startDate.toISOString() };
          const results = await applyFilters(filters);

          // Verify all results match the filter
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Verify all results are within the date range
          for (const result of results) {
            const resultDate = new Date(result.createdAt);
            expect(resultDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          }

          // Verify we got leads from the last 3 days only
          expect(results.length).toBeLessThanOrEqual(4); // 0, 1, 2, 3 days ago
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 24: Empty filters return all leads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArbitrary(), { minLength: 3, maxLength: 8 }),
        async (leadsData) => {
          // Clear data from previous iteration
          await Lead.destroy({ where: {}, force: true });

          // Create leads with unique emails
          for (const leadData of leadsData) {
            await Lead.create({
              ...leadData,
              email: `lead${emailCounter++}${Date.now()}@test.com`
            });
          }

          // Apply no filters
          const filters = {};
          const results = await applyFilters(filters);

          // Verify all results match the filter (should be all leads)
          const verification = verifyFilterResults(filters, results);
          expect(verification.isValid).toBe(true);

          // Should return all leads
          expect(results.length).toBe(leadsData.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
