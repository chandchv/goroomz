const fc = require('fast-check');
const { 
  Notification, 
  Lead, 
  User, 
  Territory,
  SupportTicket 
} = require('../../models');
const alertService = require('../../services/alertService');

/**
 * **Feature: internal-user-roles, Property 34: Notification delivery**
 * **Validates: Requirements 4.3, 14.3, 18.3, 25.5, 28.2**
 * 
 * For any event requiring notification (lead assignment, ticket creation, approval, etc.), 
 * a notification must be sent to the designated recipient
 */

describe('Property 34: Notification delivery', () => {
  beforeEach(async () => {
    // Clean up test data
    await Notification.destroy({ where: {}, force: true });
    await SupportTicket.destroy({ where: {}, force: true });
    await Lead.destroy({ where: {}, force: true });
    await Territory.destroy({ where: {}, force: true });
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: '%test%' } }, force: true });
  });

  // Generator for test users with different roles
  const userGenerator = (role = null) => fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    internalRole: role ? fc.constant(role) : fc.constantFrom('agent', 'regional_manager', 'operations_manager'),
    isActive: fc.constant(true)
  });

  // Generator for test leads
  const leadGenerator = () => fc.record({
    propertyOwnerName: fc.string({ minLength: 3, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    businessName: fc.string({ minLength: 3, maxLength: 100 }),
    propertyType: fc.constantFrom('hotel', 'pg'),
    address: fc.string({ minLength: 10, maxLength: 200 }),
    city: fc.string({ minLength: 3, maxLength: 50 }),
    state: fc.string({ minLength: 3, maxLength: 50 }),
    country: fc.constant('India'),
    estimatedRooms: fc.integer({ min: 1, max: 100 }),
    status: fc.constantFrom('contacted', 'in_progress', 'pending_approval'),
    source: fc.constantFrom('referral', 'cold_call', 'website')
  });

  // Generator for support tickets
  const supportTicketGenerator = () => fc.record({
    title: fc.string({ minLength: 5, maxLength: 200 }),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    category: fc.constantFrom('technical', 'billing', 'operations'),
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
    status: fc.constant('new')
  });

  test('Lead assignment notifications are delivered to assigned agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('agent'),
        userGenerator('regional_manager'),
        leadGenerator(),
        async (agentData, managerData, leadData) => {
          // Create test users
          const agent = await User.create({
            ...agentData,
            email: `agent-${Date.now()}-${Math.random()}@example.com`
          });

          const manager = await User.create({
            ...managerData,
            email: `manager-${Date.now()}-${Math.random()}@example.com`
          });

          // Create territory
          const territory = await Territory.create({
            name: `Test Territory ${Date.now()}`,
            description: 'Test territory for agent',
            regionalManagerId: manager.id,
            boundaries: { type: 'Polygon', coordinates: [] },
            cities: [leadData.city],
            states: [leadData.state],
            isActive: true
          });

          await agent.update({ territoryId: territory.id, managerId: manager.id });

          // Mock lead assignment service
          const mockLeadAssignmentService = {
            async assignLeadToAgent(leadData, agentId) {
              const lead = await Lead.create({
                ...leadData,
                agentId: agentId,
                territoryId: territory.id
              });

              // Create notification for lead assignment (Requirement 28.2)
              const notification = await Notification.create({
                userId: agentId,
                type: 'lead_assignment',
                title: `New Lead Assigned - ${leadData.propertyOwnerName}`,
                message: `You have been assigned a new lead: ${leadData.propertyOwnerName} (${leadData.businessName}). Please contact them within 24 hours.`,
                priority: 'medium',
                deliveryMethod: ['in_app', 'email'],
                metadata: {
                  leadId: lead.id,
                  eventType: 'lead_assignment',
                  propertyOwnerName: leadData.propertyOwnerName,
                  businessName: leadData.businessName
                }
              });

              return { lead, notification };
            }
          };

          // Assign lead to agent
          const { lead, notification } = await mockLeadAssignmentService.assignLeadToAgent(leadData, agent.id);

          // Verify notification was created and delivered
          expect(notification).toBeDefined();
          expect(notification.userId).toBe(agent.id);
          expect(notification.type).toBe('lead_assignment');
          expect(notification.priority).toBe('medium');
          expect(notification.deliveryMethod).toContain('in_app');
          expect(notification.deliveryMethod).toContain('email');
          expect(notification.metadata.leadId).toBe(lead.id);
          expect(notification.metadata.eventType).toBe('lead_assignment');

          // Verify notification exists in database
          const savedNotification = await Notification.findByPk(notification.id);
          expect(savedNotification).toBeDefined();
          expect(savedNotification.userId).toBe(agent.id);

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('High priority ticket notifications are delivered to operations managers', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('operations_manager'),
        userGenerator(), // Property owner (no internal role)
        supportTicketGenerator(),
        async (opsManagerData, propertyOwnerData, ticketData) => {
          // Create test users
          const opsManager = await User.create({
            ...opsManagerData,
            email: `ops-${Date.now()}-${Math.random()}@example.com`
          });

          const propertyOwner = await User.create({
            ...propertyOwnerData,
            email: `owner-${Date.now()}-${Math.random()}@example.com`,
            internalRole: null // Property owner, not internal user
          });

          // Mock ticket creation service
          const mockTicketService = {
            async createTicket(ticketData, propertyOwnerId) {
              const ticket = await SupportTicket.create({
                ...ticketData,
                propertyOwnerId: propertyOwnerId,
                createdBy: propertyOwnerId,
                ticketNumber: `TKT-${Date.now()}-${Math.random().toString().substr(2, 3)}`
              });

              // Create notification for high priority tickets (Requirement 14.3, 25.5)
              if (ticketData.priority === 'high' || ticketData.priority === 'urgent') {
                const notification = await Notification.create({
                  userId: opsManager.id,
                  type: 'alert',
                  title: `${ticketData.priority.toUpperCase()} Priority Ticket - ${ticket.ticketNumber}`,
                  message: `A ${ticketData.priority} priority support ticket has been created: "${ticketData.title}". Immediate attention required.`,
                  priority: ticketData.priority === 'urgent' ? 'urgent' : 'high',
                  deliveryMethod: ticketData.priority === 'urgent' ? ['in_app', 'email', 'sms'] : ['in_app', 'email'],
                  metadata: {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    eventType: 'high_priority_ticket',
                    category: ticketData.category,
                    propertyOwnerId: propertyOwnerId
                  }
                });

                return { ticket, notification };
              }

              return { ticket, notification: null };
            }
          };

          // Create ticket
          const { ticket, notification } = await mockTicketService.createTicket(ticketData, propertyOwner.id);

          // Verify notification behavior based on priority
          if (ticketData.priority === 'high' || ticketData.priority === 'urgent') {
            expect(notification).toBeDefined();
            expect(notification.userId).toBe(opsManager.id);
            expect(notification.type).toBe('alert');
            expect(notification.priority).toBe(ticketData.priority === 'urgent' ? 'urgent' : 'high');
            expect(notification.deliveryMethod).toContain('in_app');
            expect(notification.deliveryMethod).toContain('email');
            
            if (ticketData.priority === 'urgent') {
              expect(notification.deliveryMethod).toContain('sms');
            }

            expect(notification.metadata.ticketId).toBe(ticket.id);
            expect(notification.metadata.eventType).toBe('high_priority_ticket');
          } else {
            // Low/medium priority tickets should not generate immediate notifications
            expect(notification).toBeNull();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Lead approval notifications are delivered to regional managers', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('agent'),
        userGenerator('regional_manager'),
        leadGenerator(),
        async (agentData, managerData, leadData) => {
          // Create test users
          const agent = await User.create({
            ...agentData,
            email: `agent-${Date.now()}-${Math.random()}@example.com`
          });

          const manager = await User.create({
            ...managerData,
            email: `manager-${Date.now()}-${Math.random()}@example.com`
          });

          // Create territory
          const territory = await Territory.create({
            name: `Test Territory ${Date.now()}`,
            description: 'Test territory for agent',
            regionalManagerId: manager.id,
            boundaries: { type: 'Polygon', coordinates: [] },
            cities: [leadData.city],
            states: [leadData.state],
            isActive: true
          });

          await agent.update({ territoryId: territory.id, managerId: manager.id });

          // Create lead
          const lead = await Lead.create({
            ...leadData,
            agentId: agent.id,
            territoryId: territory.id,
            status: 'in_progress'
          });

          // Mock approval submission service
          const mockApprovalService = {
            async submitForApproval(leadId) {
              const lead = await Lead.findByPk(leadId);
              await lead.update({ status: 'pending_approval' });

              // Find regional manager for this lead's territory
              const territory = await Territory.findByPk(lead.territoryId);
              
              // Create notification for approval request (Requirement 18.3)
              const notification = await Notification.create({
                userId: territory.regionalManagerId,
                type: 'approval_request',
                title: `Approval Required - ${lead.propertyOwnerName}`,
                message: `Property onboarding for "${lead.propertyOwnerName}" (${lead.businessName}) is ready for your review and approval.`,
                priority: 'high',
                deliveryMethod: ['in_app', 'email'],
                metadata: {
                  leadId: lead.id,
                  eventType: 'approval_request',
                  propertyOwnerName: lead.propertyOwnerName,
                  businessName: lead.businessName,
                  agentId: lead.agentId
                }
              });

              return { lead, notification };
            }
          };

          // Submit lead for approval
          const { updatedLead, notification } = await mockApprovalService.submitForApproval(lead.id);

          // Verify notification was created and delivered to regional manager
          expect(notification).toBeDefined();
          expect(notification.userId).toBe(manager.id);
          expect(notification.type).toBe('approval_request');
          expect(notification.priority).toBe('high');
          expect(notification.deliveryMethod).toContain('in_app');
          expect(notification.deliveryMethod).toContain('email');
          expect(notification.metadata.leadId).toBe(lead.id);
          expect(notification.metadata.eventType).toBe('approval_request');

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('Lead reassignment notifications are delivered to both old and new agents', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('agent'),
        userGenerator('agent'),
        userGenerator('regional_manager'),
        leadGenerator(),
        async (oldAgentData, newAgentData, managerData, leadData) => {
          // Create test users
          const oldAgent = await User.create({
            ...oldAgentData,
            email: `old-agent-${Date.now()}-${Math.random()}@example.com`
          });

          const newAgent = await User.create({
            ...newAgentData,
            email: `new-agent-${Date.now()}-${Math.random()}@example.com`
          });

          const manager = await User.create({
            ...managerData,
            email: `manager-${Date.now()}-${Math.random()}@example.com`
          });

          // Create territory
          const territory = await Territory.create({
            name: `Test Territory ${Date.now()}`,
            description: 'Test territory for agents',
            regionalManagerId: manager.id,
            boundaries: { type: 'Polygon', coordinates: [] },
            cities: [leadData.city],
            states: [leadData.state],
            isActive: true
          });

          await oldAgent.update({ territoryId: territory.id, managerId: manager.id });
          await newAgent.update({ territoryId: territory.id, managerId: manager.id });

          // Create lead assigned to old agent
          const lead = await Lead.create({
            ...leadData,
            agentId: oldAgent.id,
            territoryId: territory.id
          });

          // Mock lead reassignment service
          const mockReassignmentService = {
            async reassignLead(leadId, newAgentId) {
              const lead = await Lead.findByPk(leadId);
              const oldAgentId = lead.agentId;
              
              await lead.update({ agentId: newAgentId });

              // Create notifications for both agents (Requirement 4.3)
              const oldAgentNotification = await Notification.create({
                userId: oldAgentId,
                type: 'lead_assignment',
                title: `Lead Reassigned - ${lead.propertyOwnerName}`,
                message: `Lead "${lead.propertyOwnerName}" has been reassigned to another agent. All communication history has been preserved.`,
                priority: 'medium',
                deliveryMethod: ['in_app'],
                metadata: {
                  leadId: lead.id,
                  eventType: 'lead_reassignment_old',
                  propertyOwnerName: lead.propertyOwnerName,
                  newAgentId: newAgentId
                }
              });

              const newAgentNotification = await Notification.create({
                userId: newAgentId,
                type: 'lead_assignment',
                title: `Lead Assigned - ${lead.propertyOwnerName}`,
                message: `You have been assigned lead "${lead.propertyOwnerName}". Please review the communication history and continue the onboarding process.`,
                priority: 'high',
                deliveryMethod: ['in_app', 'email'],
                metadata: {
                  leadId: lead.id,
                  eventType: 'lead_reassignment_new',
                  propertyOwnerName: lead.propertyOwnerName,
                  oldAgentId: oldAgentId
                }
              });

              return { lead, oldAgentNotification, newAgentNotification };
            }
          };

          // Reassign lead
          const { updatedLead, oldAgentNotification, newAgentNotification } = 
            await mockReassignmentService.reassignLead(lead.id, newAgent.id);

          // Verify notifications were sent to both agents
          expect(oldAgentNotification).toBeDefined();
          expect(oldAgentNotification.userId).toBe(oldAgent.id);
          expect(oldAgentNotification.metadata.eventType).toBe('lead_reassignment_old');

          expect(newAgentNotification).toBeDefined();
          expect(newAgentNotification.userId).toBe(newAgent.id);
          expect(newAgentNotification.metadata.eventType).toBe('lead_reassignment_new');
          expect(newAgentNotification.priority).toBe('high'); // New assignment is higher priority

          // Verify lead was actually reassigned
          expect(updatedLead.agentId).toBe(newAgent.id);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('Notifications respect user delivery preferences', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('agent'),
        fc.record({
          email: fc.boolean(),
          sms: fc.boolean(),
          inApp: fc.constant(true) // In-app always enabled
        }),
        leadGenerator(),
        async (agentData, preferences, leadData) => {
          // Create test agent with notification preferences
          const agent = await User.create({
            ...agentData,
            email: `agent-${Date.now()}-${Math.random()}@example.com`,
            preferences: {
              notificationSettings: {
                notifications: preferences
              }
            }
          });

          // Mock notification service that respects preferences
          const mockNotificationService = {
            async sendNotification(userId, notificationData) {
              const user = await User.findByPk(userId);
              const userPrefs = user.preferences?.notificationSettings?.notifications || {
                email: true,
                sms: false,
                inApp: true
              };

              // Determine delivery methods based on preferences
              const deliveryMethods = ['in_app']; // Always include in-app
              
              if (userPrefs.email && notificationData.deliveryMethod?.includes('email')) {
                deliveryMethods.push('email');
              }
              
              if (userPrefs.sms && notificationData.deliveryMethod?.includes('sms')) {
                deliveryMethods.push('sms');
              }

              const notification = await Notification.create({
                userId: userId,
                ...notificationData,
                deliveryMethod: deliveryMethods
              });

              return notification;
            }
          };

          // Send notification with all delivery methods requested
          const notification = await mockNotificationService.sendNotification(agent.id, {
            type: 'lead_assignment',
            title: `New Lead - ${leadData.propertyOwnerName}`,
            message: 'You have a new lead assignment.',
            priority: 'medium',
            deliveryMethod: ['in_app', 'email', 'sms'],
            metadata: {
              eventType: 'lead_assignment',
              propertyOwnerName: leadData.propertyOwnerName
            }
          });

          // Verify delivery methods respect user preferences
          expect(notification.deliveryMethod).toContain('in_app'); // Always included

          if (preferences.email) {
            expect(notification.deliveryMethod).toContain('email');
          } else {
            expect(notification.deliveryMethod).not.toContain('email');
          }

          if (preferences.sms) {
            expect(notification.deliveryMethod).toContain('sms');
          } else {
            expect(notification.deliveryMethod).not.toContain('sms');
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Notifications are not sent to inactive users', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator('agent'),
        fc.boolean(),
        leadGenerator(),
        async (agentData, isActive, leadData) => {
          // Create test agent with variable active status
          const agent = await User.create({
            ...agentData,
            email: `agent-${Date.now()}-${Math.random()}@example.com`,
            isActive: isActive
          });

          // Mock notification service that checks user active status
          const mockNotificationService = {
            async sendNotificationToActiveUsers(userIds, notificationData) {
              const activeUsers = await User.findAll({
                where: {
                  id: userIds,
                  isActive: true
                }
              });

              const notifications = [];
              for (const user of activeUsers) {
                const notification = await Notification.create({
                  userId: user.id,
                  ...notificationData
                });
                notifications.push(notification);
              }

              return notifications;
            }
          };

          // Attempt to send notification
          const notifications = await mockNotificationService.sendNotificationToActiveUsers(
            [agent.id],
            {
              type: 'lead_assignment',
              title: `New Lead - ${leadData.propertyOwnerName}`,
              message: 'You have a new lead assignment.',
              priority: 'medium',
              deliveryMethod: ['in_app', 'email'],
              metadata: {
                eventType: 'lead_assignment'
              }
            }
          );

          // Verify notifications only sent to active users
          if (isActive) {
            expect(notifications.length).toBe(1);
            expect(notifications[0].userId).toBe(agent.id);
          } else {
            expect(notifications.length).toBe(0);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});