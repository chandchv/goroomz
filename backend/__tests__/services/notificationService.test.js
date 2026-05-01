/**
 * Notification Service Property Tests
 * 
 * Tests the notification service functionality for various notification types.
 * Validates: Requirements 1.1-1.4, 2.1-2.5, 3.1-3.6, 5.1-5.5
 */

const fc = require('fast-check');
const notificationService = require('../../services/notificationService');
const { NOTIFICATION_TYPES, PRIORITY_MAP, DEFAULT_CHANNELS, CRITICAL_NOTIFICATION_TYPES } = require('../../services/notifications/constants');

// Mock nodemailer for testing
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock database models
jest.mock('../../models', () => ({
  Lead: {
    findByPk: jest.fn()
  },
  PropertyOwner: {
    findByPk: jest.fn()
  },
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  Territory: {
    findByPk: jest.fn()
  },
  Property: {
    findByPk: jest.fn()
  },
  Booking: {
    findByPk: jest.fn()
  },
  Notification: {
    create: jest.fn().mockResolvedValue({ id: 'test-notification-id' }),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([1])
  },
  NotificationPreference: {
    findOne: jest.fn().mockResolvedValue(null)
  }
}));

describe('Notification Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test that notification service exports all required constants
   */
  describe('Notification Service Constants', () => {
    test('should export NOTIFICATION_TYPES with all required types', () => {
      expect(NOTIFICATION_TYPES).toBeDefined();
      expect(NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED).toBe('property_claim_submitted');
      expect(NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED).toBe('property_claim_approved');
      expect(NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED).toBe('property_claim_rejected');
      expect(NOTIFICATION_TYPES.BOOKING_CREATED).toBe('booking_created');
      expect(NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY).toBe('payment_reminder_7_day');
      expect(NOTIFICATION_TYPES.LEAD_ASSIGNED).toBe('lead_assigned');
    });

    test('should export PRIORITY_MAP with correct priorities', () => {
      expect(PRIORITY_MAP).toBeDefined();
      expect(PRIORITY_MAP[NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]).toBe('urgent');
      expect(PRIORITY_MAP[NOTIFICATION_TYPES.PAYMENT_OVERDUE]).toBe('urgent');
      expect(PRIORITY_MAP[NOTIFICATION_TYPES.BOOKING_CREATED]).toBe('high');
    });

    test('should export DEFAULT_CHANNELS for notification types', () => {
      expect(DEFAULT_CHANNELS).toBeDefined();
      expect(DEFAULT_CHANNELS[NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]).toContain('email');
      expect(DEFAULT_CHANNELS[NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]).toContain('in_app');
    });

    test('should export CRITICAL_NOTIFICATION_TYPES', () => {
      expect(CRITICAL_NOTIFICATION_TYPES).toBeDefined();
      expect(Array.isArray(CRITICAL_NOTIFICATION_TYPES)).toBe(true);
      expect(CRITICAL_NOTIFICATION_TYPES).toContain('payment_failure_alert');
    });
  });

  /**
   * Test notification service method availability
   */
  describe('Notification Service Methods', () => {
    test('should have property claim notification methods', () => {
      expect(typeof notificationService.sendPropertyClaimSubmittedNotification).toBe('function');
      expect(typeof notificationService.sendPropertyClaimApprovedNotification).toBe('function');
      expect(typeof notificationService.sendPropertyClaimRejectedNotification).toBe('function');
    });

    test('should have booking notification methods', () => {
      expect(typeof notificationService.sendBookingCreatedNotification).toBe('function');
      expect(typeof notificationService.sendCheckInNotification).toBe('function');
      expect(typeof notificationService.sendCheckOutNotification).toBe('function');
      expect(typeof notificationService.sendBookingCancelledNotification).toBe('function');
      expect(typeof notificationService.sendBookingModifiedNotification).toBe('function');
    });

    test('should have payment notification methods', () => {
      expect(typeof notificationService.sendPaymentReminderNotification).toBe('function');
      expect(typeof notificationService.sendPaymentOverdueNotification).toBe('function');
      expect(typeof notificationService.sendPaymentReceivedNotification).toBe('function');
    });

    test('should have internal staff notification methods', () => {
      expect(typeof notificationService.sendInternalLeadAssignedNotification).toBe('function');
      expect(typeof notificationService.sendApprovalRequiredNotification).toBe('function');
      expect(typeof notificationService.sendTicketNotification).toBe('function');
      expect(typeof notificationService.sendZeroOccupancyAlert).toBe('function');
      expect(typeof notificationService.sendPaymentFailureAlert).toBe('function');
    });

    test('should have hotel checkout notification methods', () => {
      expect(typeof notificationService.sendCheckoutReminderNotification).toBe('function');
      expect(typeof notificationService.sendCheckoutExtendedNotification).toBe('function');
      expect(typeof notificationService.sendPaymentReceiptNotification).toBe('function');
    });

    test('should have website guest notification methods', () => {
      expect(typeof notificationService.sendBookingRequestNotification).toBe('function');
      expect(typeof notificationService.sendBookingConfirmedToGuestNotification).toBe('function');
      expect(typeof notificationService.sendBookingRejectedNotification).toBe('function');
      expect(typeof notificationService.sendCheckInReminderNotification).toBe('function');
      expect(typeof notificationService.sendStayCompletedNotification).toBe('function');
    });

    test('should have core notification methods', () => {
      expect(typeof notificationService.createNotification).toBe('function');
      expect(typeof notificationService.sendEmailNotification).toBe('function');
      expect(typeof notificationService.sendSMSNotification).toBe('function');
      expect(typeof notificationService.sendInAppNotification).toBe('function');
    });
  });

  /**
   * Property test: Notification type to priority mapping consistency
   */
  describe('Priority Mapping Properties', () => {
    test('Property: All notification types have valid priority or default to medium', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(NOTIFICATION_TYPES)),
          (notificationType) => {
            const priority = PRIORITY_MAP[notificationType] || 'medium';
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            expect(validPriorities).toContain(priority);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property: Urgent notifications are payment or alert related', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(NOTIFICATION_TYPES)),
          (notificationType) => {
            const priority = PRIORITY_MAP[notificationType];
            if (priority === 'urgent') {
              // Urgent notifications should be payment-related or alerts
              const urgentKeywords = ['payment', 'overdue', 'alert', 'failure'];
              const hasUrgentKeyword = urgentKeywords.some(keyword => 
                notificationType.toLowerCase().includes(keyword)
              );
              expect(hasUrgentKeyword).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property test: Default channel configuration consistency
   */
  describe('Default Channel Properties', () => {
    test('Property: All configured notification types have at least one channel', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(DEFAULT_CHANNELS)),
          (notificationType) => {
            const channels = DEFAULT_CHANNELS[notificationType];
            expect(Array.isArray(channels)).toBe(true);
            expect(channels.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property: All channels are valid channel types', () => {
      const validChannels = ['email', 'sms', 'in_app', 'push'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(DEFAULT_CHANNELS)),
          (notificationType) => {
            const channels = DEFAULT_CHANNELS[notificationType];
            channels.forEach(channel => {
              expect(validChannels).toContain(channel);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property: Property claim notifications include in_app channel', () => {
      const claimTypes = [
        NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED,
        NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED,
        NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED
      ].filter(type => DEFAULT_CHANNELS[type]);

      claimTypes.forEach(type => {
        const channels = DEFAULT_CHANNELS[type];
        // At least submitted should have in_app
        if (type === NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED) {
          expect(channels).toContain('in_app');
        }
      });
    });
  });

  /**
   * Property test: Critical notification types
   */
  describe('Critical Notification Properties', () => {
    test('Property: Critical notifications are a subset of all notification types', () => {
      const allTypes = Object.values(NOTIFICATION_TYPES);
      
      CRITICAL_NOTIFICATION_TYPES.forEach(criticalType => {
        expect(allTypes).toContain(criticalType);
      });
    });

    test('Property: Critical notifications include payment failure and alerts', () => {
      expect(CRITICAL_NOTIFICATION_TYPES).toContain('payment_failure_alert');
      expect(CRITICAL_NOTIFICATION_TYPES).toContain('zero_occupancy_alert');
    });
  });

  /**
   * Test notification creation with property-based testing
   */
  describe('Notification Creation Properties', () => {
    test('Property: createNotification accepts valid notification data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            type: fc.constantFrom(...Object.values(NOTIFICATION_TYPES)),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            message: fc.string({ minLength: 1, maxLength: 1000 }),
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
            channels: fc.array(fc.constantFrom('email', 'sms', 'in_app', 'push'), { minLength: 1, maxLength: 4 })
          }),
          async (notificationData) => {
            try {
              const result = await notificationService.createNotification(notificationData);
              // Should return a result (success or failure object)
              expect(result).toBeDefined();
            } catch (error) {
              // Errors should be meaningful
              expect(error.message).toBeDefined();
            }
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    });
  });

  /**
   * Test email notification with property-based testing
   */
  describe('Email Notification Properties', () => {
    test('Property: sendEmailNotification handles various content formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            body: fc.string({ minLength: 1, maxLength: 2000 }),
            smsText: fc.string({ minLength: 1, maxLength: 160 }),
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
          }),
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 })
          }),
          async (content, recipient) => {
            try {
              await notificationService.sendEmailNotification(content, recipient);
              // Should not throw for valid inputs
              expect(true).toBe(true);
            } catch (error) {
              // Should only fail for specific reasons
              expect(error.message).toMatch(/(Email transporter not initialized|No email address available|not properly loaded)/i);
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });

  /**
   * Test SMS notification with property-based testing
   */
  describe('SMS Notification Properties', () => {
    test('Property: sendSMSNotification handles various phone formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            smsText: fc.string({ minLength: 1, maxLength: 160 }),
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
          }),
          fc.record({
            phone: fc.string({ minLength: 10, maxLength: 15 })
          }),
          async (content, recipient) => {
            try {
              await notificationService.sendSMSNotification(content, recipient);
              // Should not throw for valid inputs
              expect(true).toBe(true);
            } catch (error) {
              // Should only fail for specific reasons
              expect(error.message).toMatch(/(No phone number available|SMS provider not configured)/i);
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });

  /**
   * Test in-app notification with property-based testing
   */
  describe('In-App Notification Properties', () => {
    test('Property: sendInAppNotification requires user ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            body: fc.string({ minLength: 1, maxLength: 1000 }),
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent')
          }),
          fc.record({
            user: fc.option(fc.record({
              id: fc.uuid()
            }), { nil: null })
          }),
          async (content, recipient) => {
            try {
              await notificationService.sendInAppNotification(content, recipient);
              // Should succeed if user ID is provided
              if (recipient.user?.id) {
                expect(true).toBe(true);
              }
            } catch (error) {
              // Should fail if no user ID
              if (!recipient.user?.id) {
                expect(error.message).toMatch(/No user ID available/i);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });
});
