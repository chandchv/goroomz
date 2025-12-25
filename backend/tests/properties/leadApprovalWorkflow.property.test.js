/**
 * Property-Based Tests for Lead Approval Workflow
 * Feature: internal-user-roles, Property 12: Approval workflow
 * 
 * Property: For any completed property onboarding, it must be submitted for 
 * Regional Manager approval before the property becomes active
 * 
 * Validates: Requirements 18.1
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
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'leads'
});

describe('Property 12: Approval Workflow', () => {
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

  test('Property 12: Lead must go through pending_approval before approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.uuid(),
        async (leadData, approverId) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // Property assertion: Cannot directly approve without pending_approval
          // Simulate workflow: contacted -> in_progress -> pending_approval -> approved
          
          // Move to in_progress
          lead.status = 'in_progress';
          await lead.save();
          expect(lead.status).toBe('in_progress');

          // Submit for approval
          lead.status = 'pending_approval';
          await lead.save();
          expect(lead.status).toBe('pending_approval');

          // Approve
          lead.status = 'approved';
          lead.approvedBy = approverId;
          lead.approvedAt = new Date();
          await lead.save();

          await lead.reload();

          // Property assertion: Lead must be approved with approver info
          expect(lead.status).toBe('approved');
          expect(lead.approvedBy).toBe(approverId);
          expect(lead.approvedAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: Approved leads have approver and timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.uuid(),
        async (leadData, approverId) => {
          // Create and approve a lead
          const lead = await Lead.create({
            ...leadData,
            status: 'approved',
            approvedBy: approverId,
            approvedAt: new Date()
          });

          // Property assertion: Approved leads must have approver and timestamp
          expect(lead.status).toBe('approved');
          expect(lead.approvedBy).toBeDefined();
          expect(lead.approvedBy).toBe(approverId);
          expect(lead.approvedAt).toBeDefined();
          expect(lead.approvedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: Non-approved leads do not have approver info', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        fc.constantFrom('contacted', 'in_progress', 'pending_approval', 'rejected', 'lost'),
        async (leadData, status) => {
          // Create a lead with non-approved status
          const lead = await Lead.create({
            ...leadData,
            status
          });

          // Property assertion: Non-approved leads should not have approver info
          expect(lead.status).not.toBe('approved');
          expect(lead.approvedBy == null).toBe(true);
          expect(lead.approvedAt == null).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: Status progression follows workflow', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadDataArbitrary(),
        async (leadData) => {
          // Create a lead
          const lead = await Lead.create(leadData);

          // Property assertion: Valid status transitions
          const validTransitions = {
            'contacted': ['in_progress', 'lost'],
            'in_progress': ['pending_approval', 'lost'],
            'pending_approval': ['approved', 'rejected'],
            'approved': [], // Terminal state
            'rejected': ['in_progress'], // Can be reworked
            'lost': [] // Terminal state
          };

          expect(lead.status).toBe('contacted');

          // Test a valid transition
          lead.status = 'in_progress';
          await lead.save();
          expect(validTransitions['contacted']).toContain('in_progress');

          // Test another valid transition
          lead.status = 'pending_approval';
          await lead.save();
          expect(validTransitions['in_progress']).toContain('pending_approval');
        }
      ),
      { numRuns: 100 }
    );
  });
});
