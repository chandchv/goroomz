/**
 * Property-Based Tests for Ticket Update Tracking
 * Feature: internal-user-roles, Property 39: Ticket update tracking
 * 
 * Property: For any ticket status change or response, the change must be 
 * recorded with a timestamp
 * 
 * Validates: Requirements 25.4
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
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'owner', 'category_owner', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  internalRole: {
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
    allowNull: true
  },
  internalPermissions: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users'
});

// Define SupportTicket model inline for testing
const SupportTicket = sequelize.define('SupportTicket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: () => `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('technical', 'billing', 'operations', 'feature_request', 'other'),
    defaultValue: 'other',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
    defaultValue: 'new',
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'support_tickets'
});

// Define TicketResponse model inline for testing
const TicketResponse = sequelize.define('TicketResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'ticket_responses'
});

// Define associations
SupportTicket.hasMany(TicketResponse, {
  foreignKey: 'ticketId',
  as: 'responses'
});

TicketResponse.belongsTo(SupportTicket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

describe('Property 39: Ticket Update Tracking', () => {
  let testUsers = [];

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Create test users for property testing
    const propertyOwner = await User.create({
      name: 'Test Property Owner',
      email: 'owner_ticket_tracking@test.com',
      phone: '1234567890',
      role: 'owner'
    });

    const operationsManager = await User.create({
      name: 'Test Operations Manager',
      email: 'ops_ticket_tracking@test.com',
      phone: '1234567891',
      role: 'admin',
      internalRole: 'operations_manager',
      internalPermissions: {
        canManageTickets: true
      }
    });

    testUsers = [propertyOwner, operationsManager];
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up tickets and responses after each test
    await TicketResponse.destroy({ where: {}, truncate: true });
    await SupportTicket.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for ticket status values
   */
  const ticketStatusArbitrary = () =>
    fc.constantFrom('new', 'in_progress', 'waiting_response', 'resolved', 'closed');

  /**
   * Generator for ticket response data
   */
  const ticketResponseArbitrary = () =>
    fc.record({
      message: fc.string({ minLength: 10, maxLength: 1000 }),
      isInternal: fc.boolean(),
      attachments: fc.option(
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        { nil: null }
      )
    });

  test('Property 39: Status changes are recorded with timestamps', () => {
    return fc.assert(
      fc.asyncProperty(
        ticketStatusArbitrary(),
        ticketStatusArbitrary(),
        async (initialStatus, newStatus) => {
          // Skip if status doesn't change (no update expected)
          fc.pre(initialStatus !== newStatus);

          // Create a ticket with initial status
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for status tracking',
            category: 'technical',
            priority: 'medium',
            status: initialStatus,
            createdBy: testUsers[1].id
          });

          // Record the creation timestamp
          const createdAt = ticket.createdAt;

          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));

          // Update the status
          const beforeUpdate = new Date();
          await ticket.update({ status: newStatus });
          const afterUpdate = new Date();

          // Reload to get fresh data
          await ticket.reload();

          // Property assertion: updatedAt must be recorded and be after createdAt
          expect(ticket.updatedAt).toBeDefined();
          expect(ticket.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
          expect(ticket.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
          expect(ticket.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
          expect(ticket.status).toBe(newStatus);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 39: Ticket responses are recorded with timestamps', () => {
    return fc.assert(
      fc.asyncProperty(
        ticketResponseArbitrary(),
        async (responseData) => {
          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for response tracking',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id
          });

          // Add a response
          const beforeResponse = new Date();
          const response = await TicketResponse.create({
            ticketId: ticket.id,
            userId: testUsers[1].id,
            message: responseData.message,
            isInternal: responseData.isInternal,
            attachments: responseData.attachments
          });
          const afterResponse = new Date();

          // Property assertion: Response must have createdAt timestamp
          expect(response.createdAt).toBeDefined();
          expect(response.createdAt.getTime()).toBeGreaterThanOrEqual(beforeResponse.getTime());
          expect(response.createdAt.getTime()).toBeLessThanOrEqual(afterResponse.getTime());
          expect(response.ticketId).toBe(ticket.id);
          expect(response.userId).toBe(testUsers[1].id);
          expect(response.message).toBe(responseData.message);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 39: Multiple status changes maintain chronological order', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(ticketStatusArbitrary(), { minLength: 2, maxLength: 5 }),
        async (statusSequence) => {
          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for multiple status changes',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id
          });

          const timestamps = [ticket.updatedAt];
          let previousStatus = 'new';

          // Apply status changes sequentially
          for (const status of statusSequence) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            await ticket.update({ status });
            await ticket.reload();
            
            // Only add timestamp if status actually changed
            if (status !== previousStatus) {
              timestamps.push(ticket.updatedAt);
              previousStatus = status;
            }
          }

          // Property assertion: Timestamps must be in chronological order
          // Only check if we have multiple timestamps (i.e., actual changes occurred)
          if (timestamps.length > 1) {
            for (let i = 1; i < timestamps.length; i++) {
              expect(timestamps[i].getTime()).toBeGreaterThan(timestamps[i - 1].getTime());
            }
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 39: Multiple responses maintain chronological order', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(ticketResponseArbitrary(), { minLength: 2, maxLength: 5 }),
        async (responseDataArray) => {
          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for multiple responses',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id
          });

          const responses = [];

          // Add multiple responses
          for (const responseData of responseDataArray) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            const response = await TicketResponse.create({
              ticketId: ticket.id,
              userId: testUsers[1].id,
              message: responseData.message,
              isInternal: responseData.isInternal,
              attachments: responseData.attachments
            });
            responses.push(response);
          }

          // Property assertion: Response timestamps must be in chronological order
          for (let i = 1; i < responses.length; i++) {
            expect(responses[i].createdAt.getTime()).toBeGreaterThan(
              responses[i - 1].createdAt.getTime()
            );
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 39: Assignment changes update ticket timestamp', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (shouldAssign) => {
          // Create a ticket with initial assignment
          const initialAssignment = shouldAssign ? null : testUsers[1].id;
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for assignment tracking',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id,
            assignedTo: initialAssignment
          });

          const initialUpdatedAt = ticket.updatedAt;

          // Wait a small amount
          await new Promise(resolve => setTimeout(resolve, 10));

          // Update assignment to a different value
          const assignedTo = shouldAssign ? testUsers[1].id : null;
          await ticket.update({ assignedTo });
          await ticket.reload();

          // Property assertion: updatedAt must be updated only if assignment actually changed
          if (initialAssignment !== assignedTo) {
            expect(ticket.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
          }
          expect(ticket.assignedTo).toBe(assignedTo);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 39: Resolution updates are tracked with timestamp', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 500 }),
        async (resolution) => {
          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for resolution tracking',
            category: 'technical',
            priority: 'medium',
            status: 'in_progress',
            createdBy: testUsers[1].id
          });

          // Wait a small amount
          await new Promise(resolve => setTimeout(resolve, 10));

          // Resolve the ticket
          const beforeResolve = new Date();
          await ticket.update({
            status: 'resolved',
            resolution: resolution,
            resolvedAt: new Date(),
            resolvedBy: testUsers[1].id
          });
          const afterResolve = new Date();

          await ticket.reload();

          // Property assertion: Resolution timestamp must be recorded
          expect(ticket.resolvedAt).toBeDefined();
          expect(ticket.resolvedAt.getTime()).toBeGreaterThanOrEqual(beforeResolve.getTime());
          expect(ticket.resolvedAt.getTime()).toBeLessThanOrEqual(afterResolve.getTime());
          expect(ticket.resolvedBy).toBe(testUsers[1].id);
          expect(ticket.resolution).toBe(resolution);
          expect(ticket.status).toBe('resolved');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 39: Ticket updates preserve historical data', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(ticketStatusArbitrary(), { minLength: 3, maxLength: 5 }),
        async (statusSequence) => {
          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for historical data',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id
          });

          const originalCreatedAt = ticket.createdAt;
          const originalId = ticket.id;

          // Apply multiple status changes
          for (const status of statusSequence) {
            await new Promise(resolve => setTimeout(resolve, 10));
            await ticket.update({ status });
            await ticket.reload();
          }

          // Property assertion: Historical data must be preserved
          expect(ticket.id).toBe(originalId);
          expect(ticket.createdAt.getTime()).toBe(originalCreatedAt.getTime());
          expect(ticket.propertyOwnerId).toBe(testUsers[0].id);
          expect(ticket.createdBy).toBe(testUsers[1].id);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 39: Response timestamps are independent of ticket timestamps', () => {
    return fc.assert(
      fc.asyncProperty(
        ticketResponseArbitrary(),
        ticketStatusArbitrary(),
        async (responseData, newStatus) => {
          // Skip if status doesn't change (no update expected)
          fc.pre(newStatus !== 'new');

          // Create a ticket
          const ticket = await SupportTicket.create({
            propertyOwnerId: testUsers[0].id,
            title: 'Test Ticket',
            description: 'Test description for independent timestamps',
            category: 'technical',
            priority: 'medium',
            status: 'new',
            createdBy: testUsers[1].id
          });

          // Add a response
          const response = await TicketResponse.create({
            ticketId: ticket.id,
            userId: testUsers[1].id,
            message: responseData.message,
            isInternal: responseData.isInternal,
            attachments: responseData.attachments
          });

          const responseCreatedAt = response.createdAt;

          // Wait and update ticket status
          await new Promise(resolve => setTimeout(resolve, 10));
          await ticket.update({ status: newStatus });
          await ticket.reload();

          // Reload response
          await response.reload();

          // Property assertion: Response timestamp should not change when ticket is updated
          expect(response.createdAt.getTime()).toBe(responseCreatedAt.getTime());
          expect(ticket.updatedAt.getTime()).toBeGreaterThan(responseCreatedAt.getTime());

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
