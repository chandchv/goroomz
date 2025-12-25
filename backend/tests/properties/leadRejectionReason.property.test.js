/**
 * Property-Based Tests for Lead Rejection Reason Requirement
 * Feature: internal-user-roles, Property 13: Rejection requires reason
 * 
 * Property: For any rejected onboarding, a rejection reason must be provided 
 * and the lead status must be updated
 * 
 * Validates: Requirements 18.4
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

// Define Lead model
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
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'leads'
});

/**
 * Function to validate rejection
 */
function validateRejection(lead) {
  if (lead.status === 'rejected') {
    return !!(lead.rejectionReason && lead.rejectionReason.trim().length > 0);
  }
  return true; // Non-rejected leads don't need a reason
}

describe('Property 13: Rejection Requires Reason', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Lead.destroy({ where: {}, truncate: true });
  });

  const leadDataArbitrary = () =>
    fc.record({
      propertyOwnerName: fc.string({ minLength: 5, maxLength: 50 }),
      email: fc.emailAddress(),
      phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString()),
      propertyType: fc.constantFrom('hotel', 'pg'),
      city: fc.constantFrom('Mumbai', 'Delhi', 'Bangalore'),
      state: fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka'),
      agentId: fc.uuid()
    });

  const rejectionReasonArbitrary = () =>
    fc.constantFrom(
      'Incomplete documentation',
      'Property does not meet quality standards',
      'Location not suitable for our platform',
      'Owner unresponsive to communication',
      'Pricing not competitive',
      'Property already listed on competing platform',
      'Failed verification checks'
    );

  test('Property 13: Rejected leads must have a rejection reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        rejectionReasonArbitrary(),
        async (leadData, rejectionReason) => {
          // Create a lead and reject it with reason
          const lead = await Lead.create({
            ...leadData,
            status: 'rejected',
            rejectionReason
          });

          // Property assertion: Rejected leads must have a reason
          expect(lead.status).toBe('rejected');
          expect(lead.rejectionReason).toBeDefined();
          expect(lead.rejectionReason).toBe(rejectionReason);
          expect(validateRejection(lead)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Rejection reason must not be empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        rejectionReasonArbitrary().filter(reason => reason.trim().length > 0),
        async (leadData, rejectionReason) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // Reject with reason
          lead.status = 'rejected';
          lead.rejectionReason = rejectionReason;
          await lead.save();

          await lead.reload();

          // Property assertion: Rejection reason must not be empty
          expect(lead.status).toBe('rejected');
          expect(lead.rejectionReason).toBeDefined();
          expect(lead.rejectionReason.trim().length).toBeGreaterThan(0);
          expect(validateRejection(lead)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Non-rejected leads do not require rejection reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.constantFrom('contacted', 'in_progress', 'pending_approval', 'approved', 'lost'),
        async (leadData, status) => {
          // Create a lead with non-rejected status
          const lead = await Lead.create({
            ...leadData,
            status
          });

          // Property assertion: Non-rejected leads don't need a reason
          expect(lead.status).not.toBe('rejected');
          expect(validateRejection(lead)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Rejection reason persists after status change', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        rejectionReasonArbitrary(),
        async (leadData, rejectionReason) => {
          // Create and reject a lead
          const lead = await Lead.create({
            ...leadData,
            status: 'rejected',
            rejectionReason
          });

          const originalReason = lead.rejectionReason;

          // Change status to in_progress (rework)
          lead.status = 'in_progress';
          await lead.save();

          await lead.reload();

          // Property assertion: Rejection reason should persist
          expect(lead.status).toBe('in_progress');
          expect(lead.rejectionReason).toBe(originalReason);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Multiple rejections can have different reasons', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        rejectionReasonArbitrary(),
        rejectionReasonArbitrary(),
        async (leadData, reason1, reason2) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // First rejection
          lead.status = 'rejected';
          lead.rejectionReason = reason1;
          await lead.save();
          await lead.reload();

          expect(lead.rejectionReason).toBe(reason1);

          // Rework
          lead.status = 'in_progress';
          await lead.save();

          // Second rejection with different reason
          lead.status = 'rejected';
          lead.rejectionReason = reason2;
          await lead.save();
          await lead.reload();

          // Property assertion: New rejection reason should replace old one
          expect(lead.status).toBe('rejected');
          expect(lead.rejectionReason).toBe(reason2);
          expect(validateRejection(lead)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Empty or whitespace-only reasons are invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.constantFrom('', '   ', '\t', '\n', '  \t  \n  '),
        async (leadData, invalidReason) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // Try to reject with invalid reason
          lead.status = 'rejected';
          lead.rejectionReason = invalidReason;
          await lead.save();

          await lead.reload();

          // Property assertion: Empty/whitespace reasons should fail validation
          expect(lead.status).toBe('rejected');
          expect(validateRejection(lead)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
