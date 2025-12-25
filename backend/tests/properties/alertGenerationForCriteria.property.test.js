const fc = require('fast-check');
const { 
  Alert, 
  Notification, 
  Room, 
  Booking, 
  Payment, 
  SupportTicket, 
  User 
} = require('../../models');
const alertService = require('../../services/alertService');

/**
 * **Feature: internal-user-roles, Property 35: Alert generation for criteria**
 * **Validates: Requirements 14.1, 14.2, 14.3**
 * 
 * For any property meeting alert criteria (zero occupancy > 7 days, payment failures, 
 * high-priority tickets), an alert must be created for the Operations Manager
 */

describe('Property 35: Alert generation for criteria', () => {
  beforeEach(async () => {
    // Clean up test data
    await Alert.destroy({ where: {}, force: true });
    await Notification.destroy({ where: {}, force: true });
    await Payment.destroy({ where: {}, force: true });
    await Booking.destroy({ where: {}, force: true });
    await SupportTicket.destroy({ where: {}, force: true });
    await Room.destroy({ where: {}, force: true });
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: '%test%' } }, force: true });
  });

  // Generator for test users
  const userGenerator = () => fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    internalRole: fc.constantFrom('operations_manager', 'platform_admin', 'superuser'),
    isActive: fc.constant(true)
  });

  // Generator for test properties
  const propertyGenerator = () => fc.record({
    title: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ minLength: 20, maxLength: 500 }),
    price: fc.float({ min: 100, max: 10000 }),
    location: fc.constant({ city: 'Test City', state: 'Test State' }),
    category: fc.constantFrom('PG', 'Hotel Room'),
    isActive: fc.constant(true)
  });

  // Generator for support tickets
  const supportTicketGenerator = () => fc.record({
    title: fc.string({ minLength: 5, maxLength: 200 }),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    category: fc.constantFrom('technical', 'billing', 'operations'),
    priority: fc.constantFrom('high', 'urgent'),
    status: fc.constant('new')
  });

  test('Zero occupancy properties generate alerts after 7 days', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator(),
        propertyGenerator(),
        fc.integer({ min: 8, max: 30 }), // Days without occupancy
        async (userData, propertyData, daysWithoutOccupancy) => {
          // Create test user (property owner)
          const user = await User.create({
            ...userData,
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            internalRole: null // Property owner, not internal user
          });

          // Create operations manager
          const opsManager = await User.create({
            name: 'Test Ops Manager',
            email: `ops-${Date.now()}-${Math.random()}@example.com`,
            phone: '1234567890',
            internalRole: 'operations_manager',
            isActive: true
          });

          // Create property
          const property = await Room.create({
            ...propertyData,
            ownerId: user.id
          });

          // Create old booking that ended more than 7 days ago
          const oldCheckOut = new Date();
          oldCheckOut.setDate(oldCheckOut.getDate() - daysWithoutOccupancy);

          const oldBooking = await Booking.create({
            roomId: property.id,
            userId: user.id,
            ownerId: user.id,
            checkIn: new Date(oldCheckOut.getTime() - 24 * 60 * 60 * 1000), // 1 day before checkout
            checkOut: oldCheckOut,
            guests: 1,
            totalAmount: 1000,
            status: 'completed',
            contactInfo: { phone: '1234567890', email: user.email }
          });

          // Generate zero occupancy alerts
          const alerts = await alertService.generateZeroOccupancyAlerts();

          // Verify alert was created for this property
          const propertyAlert = alerts.find(alert => alert.propertyId === property.id);
          
          if (daysWithoutOccupancy > 7) {
            // Should have alert
            expect(propertyAlert).toBeDefined();
            expect(propertyAlert.type).toBe('zero_occupancy');
            expect(propertyAlert.severity).toBe('high');
            expect(propertyAlert.ownerId).toBe(user.id);
            
            // Verify notification was created for operations manager
            const notification = await Notification.findOne({
              where: {
                userId: opsManager.id,
                type: 'alert',
                'metadata.alertId': propertyAlert.id
              }
            });
            expect(notification).toBeDefined();
            expect(notification.priority).toBe('high');
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Payment failures generate alerts when threshold exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator(),
        propertyGenerator(),
        fc.integer({ min: 1, max: 10 }), // Number of failed payments
        async (userData, propertyData, failureCount) => {
          // Create test user (property owner)
          const user = await User.create({
            ...userData,
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            internalRole: null
          });

          // Create operations manager
          const opsManager = await User.create({
            name: 'Test Ops Manager',
            email: `ops-${Date.now()}-${Math.random()}@example.com`,
            phone: '1234567890',
            internalRole: 'operations_manager',
            isActive: true
          });

          // Create property
          const property = await Room.create({
            ...propertyData,
            ownerId: user.id
          });

          // Create booking
          const booking = await Booking.create({
            roomId: property.id,
            userId: user.id,
            ownerId: user.id,
            checkIn: new Date(),
            checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000),
            guests: 1,
            totalAmount: 1000,
            status: 'confirmed',
            contactInfo: { phone: '1234567890', email: user.email }
          });

          // Create failed payments within last 24 hours
          const recentTime = new Date();
          for (let i = 0; i < failureCount; i++) {
            await Payment.create({
              bookingId: booking.id,
              amount: 100,
              paymentDate: recentTime,
              paymentMethod: 'card',
              status: 'failed',
              recordedBy: user.id
            });
          }

          // Generate payment failure alerts
          const alerts = await alertService.generatePaymentFailureAlerts();

          // Verify alert creation based on threshold (5 failures)
          const propertyAlert = alerts.find(alert => 
            alert.propertyId === property.id && alert.type === 'payment_failure'
          );

          if (failureCount >= 5) {
            // Should have alert
            expect(propertyAlert).toBeDefined();
            expect(propertyAlert.type).toBe('payment_failure');
            expect(propertyAlert.severity).toBe('high');
            expect(propertyAlert.metadata.failureCount).toBe(failureCount);
            
            // Verify notification was created for operations manager
            const notification = await Notification.findOne({
              where: {
                userId: opsManager.id,
                type: 'alert',
                'metadata.alertId': propertyAlert.id
              }
            });
            expect(notification).toBeDefined();
          } else {
            // Should not have alert
            expect(propertyAlert).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('High priority tickets generate immediate alerts', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator(),
        supportTicketGenerator(),
        async (userData, ticketData) => {
          // Create test user (property owner)
          const user = await User.create({
            ...userData,
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            internalRole: null
          });

          // Create operations manager
          const opsManager = await User.create({
            name: 'Test Ops Manager',
            email: `ops-${Date.now()}-${Math.random()}@example.com`,
            phone: '1234567890',
            internalRole: 'operations_manager',
            isActive: true
          });

          // Create high priority ticket
          const ticket = await SupportTicket.create({
            ...ticketData,
            propertyOwnerId: user.id,
            createdBy: user.id,
            ticketNumber: `TKT-${Date.now()}-${Math.random().toString().substr(2, 3)}`
          });

          // Generate high priority ticket alerts
          const alerts = await alertService.generateHighPriorityTicketAlerts();

          // Verify alert was created for high/urgent priority tickets
          const ticketAlert = alerts.find(alert => alert.ticketId === ticket.id);
          
          if (ticketData.priority === 'high' || ticketData.priority === 'urgent') {
            expect(ticketAlert).toBeDefined();
            expect(ticketAlert.type).toBe('high_priority_ticket');
            expect(ticketAlert.severity).toBe(ticketData.priority === 'urgent' ? 'critical' : 'high');
            expect(ticketAlert.ticketId).toBe(ticket.id);
            
            // Verify notification was created for operations manager
            const notification = await Notification.findOne({
              where: {
                userId: opsManager.id,
                type: 'alert',
                'metadata.ticketId': ticket.id
              }
            });
            expect(notification).toBeDefined();
            expect(notification.priority).toBe(ticketData.priority === 'urgent' ? 'urgent' : 'high');
            
            // Urgent tickets should have email delivery
            if (ticketData.priority === 'urgent') {
              expect(notification.deliveryMethod).toContain('email');
            }
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('System errors generate alerts when affecting multiple properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }), // Number of affected properties
        fc.constantFrom('database_error', 'api_timeout', 'payment_gateway_failure'),
        fc.constantFrom('medium', 'high', 'critical'),
        async (affectedCount, errorType, severity) => {
          // Create operations manager
          const opsManager = await User.create({
            name: 'Test Ops Manager',
            email: `ops-${Date.now()}-${Math.random()}@example.com`,
            phone: '1234567890',
            internalRole: 'operations_manager',
            isActive: true
          });

          // Generate fake property IDs
          const affectedProperties = Array.from({ length: affectedCount }, (_, i) => 
            `prop-${Date.now()}-${i}`
          );

          // Generate system error alert
          const alert = await alertService.generateSystemErrorAlerts({
            errorType,
            errorMessage: `Test ${errorType} affecting ${affectedCount} properties`,
            affectedProperties,
            severity
          });

          // Verify alert creation based on threshold (10 properties) or critical severity
          if (affectedCount >= 10 || severity === 'critical') {
            expect(alert).toBeDefined();
            expect(alert.type).toBe('system_error');
            expect(alert.metadata.affectedPropertiesCount).toBe(affectedCount);
            expect(alert.metadata.errorType).toBe(errorType);
            
            // Verify notification was created for operations manager
            const notification = await Notification.findOne({
              where: {
                userId: opsManager.id,
                type: 'alert',
                'metadata.alertId': alert.id
              }
            });
            expect(notification).toBeDefined();
            
            // Critical errors should have email delivery
            if (severity === 'critical') {
              expect(notification.deliveryMethod).toContain('email');
            }
          } else {
            expect(alert).toBeNull();
          }

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('Duplicate alerts are not created for same criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator(),
        propertyGenerator(),
        async (userData, propertyData) => {
          // Create test user (property owner)
          const user = await User.create({
            ...userData,
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            internalRole: null
          });

          // Create operations manager
          const opsManager = await User.create({
            name: 'Test Ops Manager',
            email: `ops-${Date.now()}-${Math.random()}@example.com`,
            phone: '1234567890',
            internalRole: 'operations_manager',
            isActive: true
          });

          // Create property with zero occupancy
          const property = await Room.create({
            ...propertyData,
            ownerId: user.id
          });

          // Generate alerts twice
          const firstRun = await alertService.generateZeroOccupancyAlerts();
          const secondRun = await alertService.generateZeroOccupancyAlerts();

          // Count alerts for this property
          const alertCount = await Alert.count({
            where: {
              type: 'zero_occupancy',
              propertyId: property.id,
              status: ['new', 'in_progress']
            }
          });

          // Should only have one alert, not duplicates
          expect(alertCount).toBeLessThanOrEqual(1);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});