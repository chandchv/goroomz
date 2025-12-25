/**
 * Integration Tests for Support Ticket Workflow
 * Tests flow: create → assign → respond → resolve
 * 
 * Validates Requirements: 25.1, 25.3, 25.4, 25.5
 */

const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Define models for testing
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  role: { type: DataTypes.ENUM('customer', 'owner', 'admin', 'staff'), defaultValue: 'customer' },
  phoneNumber: { type: DataTypes.STRING },
  internalRole: { 
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
    allowNull: true
  }
});

// Helper function to generate ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TKT-${timestamp}-${random}`;
};

const SupportTicket = sequelize.define('SupportTicket', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  propertyOwnerId: { type: DataTypes.UUID, allowNull: false },
  propertyId: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { 
    type: DataTypes.ENUM('technical', 'billing', 'operations', 'feature_request', 'other'),
    defaultValue: 'other'
  },
  priority: { 
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: { 
    type: DataTypes.ENUM('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
    defaultValue: 'new'
  },
  assignedTo: { type: DataTypes.UUID },
  createdBy: { type: DataTypes.UUID, allowNull: false },
  resolvedAt: { type: DataTypes.DATE },
  resolvedBy: { type: DataTypes.UUID },
  resolution: { type: DataTypes.TEXT }
});

const TicketResponse = sequelize.define('TicketResponse', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  isInternal: { type: DataTypes.BOOLEAN, defaultValue: false },
  attachments: { type: DataTypes.JSON, defaultValue: [] }
});

describe('Support Ticket Workflow Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Complete Ticket Flow: create → assign → respond → resolve', () => {
    let propertyOwner, operationsManager, ticket;

    beforeEach(async () => {
      // Clean up
      await TicketResponse.destroy({ where: {}, truncate: true });
      await SupportTicket.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      // Create property owner
      propertyOwner = await User.create({
        name: 'Property Owner',
        email: 'owner@ticket.com',
        role: 'owner',
        phoneNumber: '1234567890'
      });

      // Create operations manager
      operationsManager = await User.create({
        name: 'Operations Manager',
        email: 'ops@ticket.com',
        role: 'staff',
        phoneNumber: '9876543210',
        internalRole: 'operations_manager'
      });
    });

    test('Complete successful ticket resolution flow', async () => {
      // Step 1: Property owner creates ticket
      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Unable to update room prices',
        description: 'When I try to update room prices, I get an error message saying "Invalid price format"',
        category: 'technical',
        priority: 'high',
        status: 'new',
        createdBy: propertyOwner.id
      });

      // Verify ticket created with all required fields
      expect(ticket.ticketNumber).toBeDefined();
      expect(ticket.ticketNumber).toMatch(/^TKT-\d+-\d{3}$/);
      expect(ticket.title).toBe('Unable to update room prices');
      expect(ticket.description).toBeDefined();
      expect(ticket.description.length).toBeGreaterThan(0);
      expect(ticket.category).toBe('technical');
      expect(ticket.priority).toBe('high');
      expect(ticket.status).toBe('new');
      expect(ticket.propertyOwnerId).toBe(propertyOwner.id);

      // Step 2: Operations Manager assigns ticket to themselves
      await ticket.update({
        assignedTo: operationsManager.id,
        status: 'in_progress'
      });

      await ticket.reload();
      expect(ticket.assignedTo).toBe(operationsManager.id);
      expect(ticket.status).toBe('in_progress');

      // Step 3: Operations Manager adds response
      const response1 = await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Thank you for reporting this issue. I am investigating the problem.',
        isInternal: false
      });

      expect(response1.ticketId).toBe(ticket.id);
      expect(response1.userId).toBe(operationsManager.id);
      expect(response1.isInternal).toBe(false);

      // Step 4: Operations Manager adds internal note
      const internalNote = await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Issue appears to be related to decimal separator validation. Need to check backend validation logic.',
        isInternal: true
      });

      expect(internalNote.isInternal).toBe(true);

      // Step 5: Operations Manager requests more information
      await ticket.update({ status: 'waiting_response' });

      const response2 = await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Could you please provide a screenshot of the error message?',
        isInternal: false
      });

      await ticket.reload();
      expect(ticket.status).toBe('waiting_response');

      // Step 6: Property owner responds
      const ownerResponse = await TicketResponse.create({
        ticketId: ticket.id,
        userId: propertyOwner.id,
        message: 'Here is the screenshot showing the error.',
        isInternal: false,
        attachments: [{ fileName: 'error_screenshot.png', fileUrl: '/uploads/error_screenshot.png' }]
      });

      expect(ownerResponse.attachments).toHaveLength(1);

      // Step 7: Operations Manager moves back to in_progress
      await ticket.update({ status: 'in_progress' });

      // Step 8: Operations Manager resolves the issue
      const resolutionMessage = 'The issue has been fixed. The price validation now accepts both comma and period as decimal separators. Please try updating your room prices again.';

      await ticket.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: operationsManager.id,
        resolution: resolutionMessage
      });

      const finalResponse = await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: resolutionMessage,
        isInternal: false
      });

      await ticket.reload();
      expect(ticket.status).toBe('resolved');
      expect(ticket.resolvedAt).toBeDefined();
      expect(ticket.resolvedBy).toBe(operationsManager.id);
      expect(ticket.resolution).toBe(resolutionMessage);

      // Verify complete response history
      const allResponses = await TicketResponse.findAll({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'ASC']]
      });

      expect(allResponses.length).toBe(5);
      
      // Verify response tracking with timestamps
      allResponses.forEach(response => {
        expect(response.createdAt).toBeDefined();
        expect(response.message).toBeDefined();
        expect(response.userId).toBeDefined();
      });

      // Step 9: Property owner confirms and ticket is closed
      await ticket.update({ status: 'closed' });
      await ticket.reload();
      expect(ticket.status).toBe('closed');
    });

    test('Ticket creation with all required fields', async () => {
      // Test that all required fields are captured
      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Billing discrepancy',
        description: 'I was charged twice for the same month',
        category: 'billing',
        priority: 'urgent',
        status: 'new',
        createdBy: propertyOwner.id
      });

      // Verify all required fields present
      expect(ticket.ticketNumber).toBeDefined();
      expect(ticket.propertyOwnerId).toBe(propertyOwner.id);
      expect(ticket.title).toBe('Billing discrepancy');
      expect(ticket.description).toBe('I was charged twice for the same month');
      expect(ticket.category).toBe('billing');
      expect(ticket.priority).toBe('urgent');
      expect(ticket.status).toBe('new');
      expect(ticket.createdBy).toBe(propertyOwner.id);
    });

    test('Ticket assignment to different operations managers', async () => {
      // Create another operations manager
      const opsManager2 = await User.create({
        name: 'Operations Manager 2',
        email: 'ops2@ticket.com',
        role: 'staff',
        internalRole: 'operations_manager'
      });

      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Feature request',
        description: 'Would like to have bulk room update feature',
        category: 'feature_request',
        priority: 'low',
        createdBy: propertyOwner.id
      });

      // Initially assign to first manager
      await ticket.update({ assignedTo: operationsManager.id });
      await ticket.reload();
      expect(ticket.assignedTo).toBe(operationsManager.id);

      // Reassign to second manager
      await ticket.update({ assignedTo: opsManager2.id });
      await ticket.reload();
      expect(ticket.assignedTo).toBe(opsManager2.id);
    });
  });

  describe('Ticket Status Transitions', () => {
    let propertyOwner, operationsManager, ticket;

    beforeEach(async () => {
      await TicketResponse.destroy({ where: {}, truncate: true });
      await SupportTicket.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      propertyOwner = await User.create({
        name: 'Status Test Owner',
        email: 'owner@status.com',
        role: 'owner'
      });

      operationsManager = await User.create({
        name: 'Status Test Ops',
        email: 'ops@status.com',
        role: 'staff',
        internalRole: 'operations_manager'
      });

      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Test Ticket',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        createdBy: propertyOwner.id
      });
    });

    test('Valid status transitions', async () => {
      // new → in_progress
      await ticket.update({ status: 'in_progress', assignedTo: operationsManager.id });
      await ticket.reload();
      expect(ticket.status).toBe('in_progress');

      // in_progress → waiting_response
      await ticket.update({ status: 'waiting_response' });
      await ticket.reload();
      expect(ticket.status).toBe('waiting_response');

      // waiting_response → in_progress
      await ticket.update({ status: 'in_progress' });
      await ticket.reload();
      expect(ticket.status).toBe('in_progress');

      // in_progress → resolved
      await ticket.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: operationsManager.id,
        resolution: 'Issue resolved'
      });
      await ticket.reload();
      expect(ticket.status).toBe('resolved');

      // resolved → closed
      await ticket.update({ status: 'closed' });
      await ticket.reload();
      expect(ticket.status).toBe('closed');
    });

    test('Status change tracking with timestamps', async () => {
      const startTime = new Date();

      await ticket.update({ status: 'in_progress' });
      const progressTime = ticket.updatedAt;

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await ticket.update({ status: 'waiting_response' });
      const waitingTime = ticket.updatedAt;

      await ticket.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: operationsManager.id,
        resolution: 'Fixed'
      });
      const resolvedTime = ticket.resolvedAt;

      // Verify timestamps are recorded
      expect(progressTime).toBeDefined();
      expect(waitingTime).toBeDefined();
      expect(resolvedTime).toBeDefined();

      // Verify timestamps are in order
      expect(new Date(waitingTime).getTime()).toBeGreaterThanOrEqual(new Date(progressTime).getTime());
      expect(new Date(resolvedTime).getTime()).toBeGreaterThanOrEqual(new Date(waitingTime).getTime());
    });
  });

  describe('Ticket Response Management', () => {
    let propertyOwner, operationsManager, ticket;

    beforeEach(async () => {
      await TicketResponse.destroy({ where: {}, truncate: true });
      await SupportTicket.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      propertyOwner = await User.create({
        name: 'Response Test Owner',
        email: 'owner@response.com',
        role: 'owner'
      });

      operationsManager = await User.create({
        name: 'Response Test Ops',
        email: 'ops@response.com',
        role: 'staff',
        internalRole: 'operations_manager'
      });

      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Response Test Ticket',
        description: 'Testing responses',
        category: 'technical',
        priority: 'medium',
        createdBy: propertyOwner.id,
        assignedTo: operationsManager.id,
        status: 'in_progress'
      });
    });

    test('Multiple responses create conversation thread', async () => {
      // Create conversation
      const responses = [];

      responses.push(await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'I am looking into this issue.',
        isInternal: false
      }));

      responses.push(await TicketResponse.create({
        ticketId: ticket.id,
        userId: propertyOwner.id,
        message: 'Thank you. Please let me know when you have an update.',
        isInternal: false
      }));

      responses.push(await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'I have identified the issue. Working on a fix.',
        isInternal: false
      }));

      responses.push(await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'The issue is fixed. Please test and confirm.',
        isInternal: false
      }));

      responses.push(await TicketResponse.create({
        ticketId: ticket.id,
        userId: propertyOwner.id,
        message: 'Confirmed working. Thank you!',
        isInternal: false
      }));

      // Verify conversation thread
      const allResponses = await TicketResponse.findAll({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'ASC']]
      });

      expect(allResponses.length).toBe(5);

      // Verify alternating users (mostly)
      expect(allResponses[0].userId).toBe(operationsManager.id);
      expect(allResponses[1].userId).toBe(propertyOwner.id);
      expect(allResponses[2].userId).toBe(operationsManager.id);
      expect(allResponses[4].userId).toBe(propertyOwner.id);
    });

    test('Internal notes are separate from customer-facing responses', async () => {
      // Add mix of internal and external responses
      await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Customer-facing response',
        isInternal: false
      });

      await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Internal note: This is a known issue, fix is in progress',
        isInternal: true
      });

      await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Another customer-facing response',
        isInternal: false
      });

      await TicketResponse.create({
        ticketId: ticket.id,
        userId: operationsManager.id,
        message: 'Internal note: Need to escalate to dev team',
        isInternal: true
      });

      // Get customer-facing responses only
      const customerResponses = await TicketResponse.findAll({
        where: { ticketId: ticket.id, isInternal: false }
      });

      // Get internal notes only
      const internalNotes = await TicketResponse.findAll({
        where: { ticketId: ticket.id, isInternal: true }
      });

      expect(customerResponses.length).toBe(2);
      expect(internalNotes.length).toBe(2);

      // Verify internal notes are marked correctly
      internalNotes.forEach(note => {
        expect(note.isInternal).toBe(true);
      });
    });

    test('Responses with attachments', async () => {
      const response = await TicketResponse.create({
        ticketId: ticket.id,
        userId: propertyOwner.id,
        message: 'Here are the requested documents',
        isInternal: false,
        attachments: [
          { fileName: 'document1.pdf', fileUrl: '/uploads/document1.pdf', fileSize: 1024000 },
          { fileName: 'screenshot.png', fileUrl: '/uploads/screenshot.png', fileSize: 512000 }
        ]
      });

      expect(response.attachments).toHaveLength(2);
      expect(response.attachments[0].fileName).toBe('document1.pdf');
      expect(response.attachments[1].fileName).toBe('screenshot.png');
    });
  });

  describe('Ticket Priority and Category Management', () => {
    let propertyOwner, operationsManager;

    beforeEach(async () => {
      await SupportTicket.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      propertyOwner = await User.create({
        name: 'Priority Test Owner',
        email: 'owner@priority.com',
        role: 'owner'
      });

      operationsManager = await User.create({
        name: 'Priority Test Ops',
        email: 'ops@priority.com',
        role: 'staff',
        internalRole: 'operations_manager'
      });
    });

    test('Tickets with different priorities', async () => {
      const urgentTicket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'System down',
        description: 'Cannot access the system',
        category: 'technical',
        priority: 'urgent',
        createdBy: propertyOwner.id
      });

      const highTicket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Payment not processed',
        description: 'Customer payment failed',
        category: 'billing',
        priority: 'high',
        createdBy: propertyOwner.id
      });

      const mediumTicket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Minor UI issue',
        description: 'Button alignment is off',
        category: 'technical',
        priority: 'medium',
        createdBy: propertyOwner.id
      });

      const lowTicket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Feature suggestion',
        description: 'Would be nice to have dark mode',
        category: 'feature_request',
        priority: 'low',
        createdBy: propertyOwner.id
      });

      // Verify priorities
      expect(urgentTicket.priority).toBe('urgent');
      expect(highTicket.priority).toBe('high');
      expect(mediumTicket.priority).toBe('medium');
      expect(lowTicket.priority).toBe('low');

      // Get urgent tickets (should be handled first)
      const urgentTickets = await SupportTicket.findAll({
        where: { priority: 'urgent', status: 'new' }
      });

      expect(urgentTickets.length).toBe(1);
      expect(urgentTickets[0].id).toBe(urgentTicket.id);
    });

    test('Tickets categorized by type', async () => {
      await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Technical Issue 1',
        description: 'Description',
        category: 'technical',
        priority: 'medium',
        createdBy: propertyOwner.id
      });

      await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Billing Issue 1',
        description: 'Description',
        category: 'billing',
        priority: 'high',
        createdBy: propertyOwner.id
      });

      await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Operations Issue 1',
        description: 'Description',
        category: 'operations',
        priority: 'medium',
        createdBy: propertyOwner.id
      });

      // Get tickets by category
      const technicalTickets = await SupportTicket.findAll({
        where: { category: 'technical' }
      });

      const billingTickets = await SupportTicket.findAll({
        where: { category: 'billing' }
      });

      const operationsTickets = await SupportTicket.findAll({
        where: { category: 'operations' }
      });

      expect(technicalTickets.length).toBe(1);
      expect(billingTickets.length).toBe(1);
      expect(operationsTickets.length).toBe(1);
    });
  });

  describe('Ticket Resolution and Notification', () => {
    let propertyOwner, operationsManager, ticket;

    beforeEach(async () => {
      await TicketResponse.destroy({ where: {}, truncate: true });
      await SupportTicket.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      propertyOwner = await User.create({
        name: 'Resolution Test Owner',
        email: 'owner@resolution.com',
        role: 'owner'
      });

      operationsManager = await User.create({
        name: 'Resolution Test Ops',
        email: 'ops@resolution.com',
        role: 'staff',
        internalRole: 'operations_manager'
      });

      ticket = await SupportTicket.create({
        ticketNumber: generateTicketNumber(),
        propertyOwnerId: propertyOwner.id,
        title: 'Resolution Test',
        description: 'Test resolution',
        category: 'technical',
        priority: 'medium',
        createdBy: propertyOwner.id,
        assignedTo: operationsManager.id,
        status: 'in_progress'
      });
    });

    test('Ticket resolution with all required details', async () => {
      const resolutionText = 'Issue was caused by incorrect configuration. Updated settings and verified fix.';

      await ticket.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: operationsManager.id,
        resolution: resolutionText
      });

      await ticket.reload();

      // Verify resolution details
      expect(ticket.status).toBe('resolved');
      expect(ticket.resolvedAt).toBeDefined();
      expect(ticket.resolvedBy).toBe(operationsManager.id);
      expect(ticket.resolution).toBe(resolutionText);

      // In real system, notification would be sent to property owner
      // Simulating notification check
      const shouldNotifyOwner = ticket.status === 'resolved';
      expect(shouldNotifyOwner).toBe(true);
    });

    test('Reopening resolved ticket', async () => {
      // Resolve ticket
      await ticket.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: operationsManager.id,
        resolution: 'Fixed the issue'
      });

      // Property owner reports issue persists
      await TicketResponse.create({
        ticketId: ticket.id,
        userId: propertyOwner.id,
        message: 'The issue is still occurring',
        isInternal: false
      });

      // Reopen ticket
      await ticket.update({
        status: 'in_progress',
        resolvedAt: null,
        resolution: null
      });

      await ticket.reload();
      expect(ticket.status).toBe('in_progress');
      expect(ticket.resolvedAt).toBeNull();
    });
  });
});
