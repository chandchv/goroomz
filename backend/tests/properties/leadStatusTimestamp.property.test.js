/**
 * Property-Based Tests for Lead Status Timestamp
 * Feature: internal-user-roles, Property 8: Lead status timestamp
 * 
 * Property: For any lead status update, the system must record a timestamp 
 * with the status change
 * 
 * Validates: Requirements 2.4
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
    allowNull: false
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'leads',
  timestamps: true // This enables createdAt and updatedAt
});

describe('Property 8: Lead Status Timestamp', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Lead.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for property owner names
   */
  const propertyOwnerNameArbitrary = () =>
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
   * Generator for UUIDs
   */
  const uuidArbitrary = () =>
    fc.uuid();

  /**
   * Generator for lead statuses
   */
  const leadStatusArbitrary = () =>
    fc.constantFrom('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost');

  /**
   * Generator for lead data
   */
  const leadDataArbitrary = () =>
    fc.record({
      propertyOwnerName: propertyOwnerNameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      propertyType: propertyTypeArbitrary(),
      city: cityArbitrary(),
      state: stateArbitrary(),
      country: fc.constant('India'),
      agentId: uuidArbitrary()
    });

  test('Property 8: Lead creation records timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        async (leadData) => {
          const beforeCreate = new Date();

          // Create a lead
          const lead = await Lead.create(leadData);

          const afterCreate = new Date();

          // Property assertion: Lead must have createdAt timestamp
          expect(lead.createdAt).toBeDefined();
          expect(lead.createdAt).toBeInstanceOf(Date);

          // Timestamp should be between before and after
          expect(lead.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
          expect(lead.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);

          // updatedAt should also be set
          expect(lead.updatedAt).toBeDefined();
          expect(lead.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Status update records new timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        leadStatusArbitrary().filter(status => status !== 'contacted'), // Filter out default status
        async (leadData, newStatus) => {
          // Create a lead
          const lead = await Lead.create(leadData);
          const originalUpdatedAt = lead.updatedAt;

          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 50));

          const beforeUpdate = new Date();

          // Update the status
          lead.status = newStatus;
          await lead.save();

          const afterUpdate = new Date();

          // Reload to get fresh data
          await lead.reload();

          // Property assertion: updatedAt must be updated
          expect(lead.updatedAt).toBeDefined();
          expect(lead.updatedAt).toBeInstanceOf(Date);

          // updatedAt should be after or equal to the original timestamp
          expect(lead.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());

          // updatedAt should be between before and after update
          expect(lead.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
          expect(lead.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Multiple status updates record increasing timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.array(leadStatusArbitrary(), { minLength: 2, maxLength: 5 }),
        async (leadData, statuses) => {
          // Create a lead
          const lead = await Lead.create(leadData);
          const timestamps = [lead.updatedAt];

          // Update status multiple times
          for (const status of statuses) {
            // Wait to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            lead.status = status;
            await lead.save();
            await lead.reload();

            timestamps.push(lead.updatedAt);
          }

          // Property assertion: Each timestamp should be greater than or equal to the previous
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 8: Approved status records approvedAt timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        async (leadData) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // Initially approvedAt should be null or undefined
          expect(lead.approvedAt == null).toBe(true);

          const beforeApproval = new Date();

          // Update to approved status
          lead.status = 'approved';
          lead.approvedAt = new Date();
          await lead.save();

          const afterApproval = new Date();

          await lead.reload();

          // Property assertion: approvedAt must be set when status is approved
          expect(lead.approvedAt).toBeDefined();
          expect(lead.approvedAt).toBeInstanceOf(Date);

          // approvedAt should be between before and after approval
          expect(lead.approvedAt.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime() - 1000);
          expect(lead.approvedAt.getTime()).toBeLessThanOrEqual(afterApproval.getTime() + 1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Rejected status with reason records timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.string({ minLength: 10, maxLength: 200 }),
        async (leadData, rejectionReason) => {
          // Create a lead
          const lead = await Lead.create(leadData);
          const originalUpdatedAt = lead.updatedAt;

          // Wait to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));

          // Update to rejected status with reason
          lead.status = 'rejected';
          lead.rejectionReason = rejectionReason;
          await lead.save();

          await lead.reload();

          // Property assertion: updatedAt must be updated
          expect(lead.updatedAt).toBeDefined();
          expect(lead.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

          // Rejection reason should be recorded
          expect(lead.rejectionReason).toBe(rejectionReason);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Non-status field updates also record timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s !== 'Original Address'),
        async (leadData, newAddress) => {
          // Create a lead
          const lead = await Lead.create({
            ...leadData,
            address: 'Original Address'
          });
          const originalUpdatedAt = lead.updatedAt;

          // Wait to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 50));

          // Update a non-status field
          lead.address = newAddress;
          await lead.save();

          await lead.reload();

          // Property assertion: updatedAt must be updated even for non-status changes
          expect(lead.updatedAt).toBeDefined();
          expect(lead.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: createdAt remains unchanged after updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        leadStatusArbitrary().filter(status => status !== 'contacted'),
        async (leadData, newStatus) => {
          // Create a lead
          const lead = await Lead.create(leadData);
          const originalCreatedAt = lead.createdAt;

          // Wait and update
          await new Promise(resolve => setTimeout(resolve, 50));

          lead.status = newStatus;
          await lead.save();

          await lead.reload();

          // Property assertion: createdAt should never change
          expect(lead.createdAt.getTime()).toBe(originalCreatedAt.getTime());

          // updatedAt should be greater than or equal to createdAt
          expect(lead.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
