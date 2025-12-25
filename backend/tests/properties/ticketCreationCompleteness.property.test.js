const fc = require('fast-check');
const { SupportTicket, User } = require('../../models');
const { sequelize } = require('../../config/database');

/**
 * Feature: internal-user-roles, Property 38: Ticket creation completeness
 * For any support ticket creation, all required fields (description, priority, category) must be captured
 * Validates: Requirements 25.1
 */

describe('Property 38: Ticket creation completeness', () => {
  let testUsers = [];

  beforeAll(async () => {
    // Create test users for property testing
    const propertyOwner = await User.create({
      name: 'Test Property Owner',
      email: 'owner@test.com',
      phone: '1234567890',
      role: 'owner'
    });

    const operationsManager = await User.create({
      name: 'Test Operations Manager',
      email: 'ops@test.com',
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
    // Clean up test data
    await SupportTicket.destroy({ where: {} });
    await User.destroy({ where: { email: { [require('sequelize').Op.in]: ['owner@test.com', 'ops@test.com'] } } });
  });

  afterEach(async () => {
    // Clean up tickets after each test
    await SupportTicket.destroy({ where: {} });
  });

  // Generator for valid ticket data
  const validTicketDataGenerator = () => fc.record({
    propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
    title: fc.string({ minLength: 5, maxLength: 200 }),
    description: fc.string({ minLength: 10, maxLength: 1000 }),
    category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
    propertyId: fc.option(fc.uuid(), { nil: null })
  });

  // Generator for invalid ticket data (missing required fields)
  const invalidTicketDataGenerator = () => fc.oneof(
    // Missing propertyOwnerId
    fc.record({
      title: fc.string({ minLength: 5, maxLength: 200 }),
      description: fc.string({ minLength: 10, maxLength: 1000 }),
      category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
      priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
    }),
    // Missing title
    fc.record({
      propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
      description: fc.string({ minLength: 10, maxLength: 1000 }),
      category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
      priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
    }),
    // Missing description
    fc.record({
      propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
      title: fc.string({ minLength: 5, maxLength: 200 }),
      category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
      priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
    }),
    // Empty title
    fc.record({
      propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
      title: fc.constant(''),
      description: fc.string({ minLength: 10, maxLength: 1000 }),
      category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
      priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
    }),
    // Empty description
    fc.record({
      propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
      title: fc.string({ minLength: 5, maxLength: 200 }),
      description: fc.constant(''),
      category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
      priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
    })
  );

  test('valid ticket data should create ticket successfully', () => {
    return fc.assert(
      fc.asyncProperty(
        validTicketDataGenerator(),
        async (ticketData) => {
          // Attempt to create ticket with valid data
          const ticket = await SupportTicket.create({
            ...ticketData,
            createdBy: testUsers[1].id, // operations manager
            status: 'new'
          });

          // Verify ticket was created with all required fields
          expect(ticket).toBeDefined();
          expect(ticket.id).toBeDefined();
          expect(ticket.ticketNumber).toBeDefined();
          expect(ticket.propertyOwnerId).toBe(ticketData.propertyOwnerId);
          expect(ticket.title).toBe(ticketData.title);
          expect(ticket.description).toBe(ticketData.description);
          expect(ticket.category).toBe(ticketData.category);
          expect(ticket.priority).toBe(ticketData.priority);
          expect(ticket.status).toBe('new');
          expect(ticket.createdBy).toBe(testUsers[1].id);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('invalid ticket data should fail validation', () => {
    return fc.assert(
      fc.asyncProperty(
        invalidTicketDataGenerator(),
        async (ticketData) => {
          // Attempt to create ticket with invalid data should throw error
          await expect(
            SupportTicket.create({
              ...ticketData,
              createdBy: testUsers[1].id,
              status: 'new'
            })
          ).rejects.toThrow();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ticket creation should generate unique ticket number', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(validTicketDataGenerator(), { minLength: 2, maxLength: 10 }),
        async (ticketDataArray) => {
          // Create multiple tickets
          const tickets = [];
          for (const ticketData of ticketDataArray) {
            const ticket = await SupportTicket.create({
              ...ticketData,
              createdBy: testUsers[1].id,
              status: 'new'
            });
            tickets.push(ticket);
          }

          // Verify all ticket numbers are unique
          const ticketNumbers = tickets.map(t => t.ticketNumber);
          const uniqueTicketNumbers = [...new Set(ticketNumbers)];
          
          expect(uniqueTicketNumbers.length).toBe(ticketNumbers.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('ticket creation should set default values correctly', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
          title: fc.string({ minLength: 5, maxLength: 200 }),
          description: fc.string({ minLength: 10, maxLength: 1000 })
          // Omit category and priority to test defaults
        }),
        async (ticketData) => {
          const ticket = await SupportTicket.create({
            ...ticketData,
            createdBy: testUsers[1].id,
            status: 'new'
          });

          // Verify default values are set
          expect(ticket.category).toBe('other'); // default category
          expect(ticket.priority).toBe('medium'); // default priority
          expect(ticket.status).toBe('new');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ticket creation should validate title length constraints', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
          title: fc.oneof(
            fc.string({ maxLength: 4 }), // too short
            fc.string({ minLength: 201, maxLength: 300 }) // too long
          ),
          description: fc.string({ minLength: 10, maxLength: 1000 })
        }),
        async (ticketData) => {
          // Should fail validation for title length
          await expect(
            SupportTicket.create({
              ...ticketData,
              createdBy: testUsers[1].id,
              status: 'new'
            })
          ).rejects.toThrow();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ticket creation should validate enum values', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          propertyOwnerId: fc.constantFrom(...testUsers.map(u => u.id)),
          title: fc.string({ minLength: 5, maxLength: 200 }),
          description: fc.string({ minLength: 10, maxLength: 1000 }),
          category: fc.string().filter(s => !['technical', 'billing', 'operations', 'feature_request', 'other'].includes(s)),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
        }),
        async (ticketData) => {
          // Should fail validation for invalid category
          await expect(
            SupportTicket.create({
              ...ticketData,
              createdBy: testUsers[1].id,
              status: 'new'
            })
          ).rejects.toThrow();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});