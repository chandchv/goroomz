/**
 * Integration Tests for Notification Flows
 * 
 * Tests the complete notification flows:
 * - Property claim → notification flow (Requirements: 1.1)
 * - Booking → notification flow (Requirements: 2.1)
 * - Payment → reminder flow (Requirements: 3.1)
 */

const { v4: uuidv4 } = require('uuid');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock database models
jest.mock('../../models', () => {
  const { v4: mockUuidv4 } = require('uuid');
  
  return {
    User: {
      findByPk: jest.fn(),
      findAll: jest.fn()
    },
    Property: {
      findByPk: jest.fn()
    },
    Room: {
      findByPk: jest.fn()
    },
    Booking: {
      findByPk: jest.fn()
    },
    Notification: {
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        id: mockUuidv4(),
        save: jest.fn().mockResolvedValue(true),
        updateDeliveryStatus: jest.fn().mockResolvedValue(true)
      })),
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue([1])
    },
    NotificationPreference: {
      findOne: jest.fn().mockResolvedValue(null)
    }
  };
});


// Import notification service after mocks
const notificationService = require('../../services/notificationService');
const { User, Property, Room, Booking, Notification } = require('../../models');

// Test data generators
const createMockUser = (overrides = {}) => ({
  id: uuidv4(),
  name: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  role: 'property_owner',
  ...overrides
});

const createMockProperty = (overrides = {}) => ({
  id: uuidv4(),
  name: 'Test Property',
  address: '123 Test Street',
  city: 'Test City',
  ...overrides
});

const createMockRoom = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Room 101',
  roomNumber: '101',
  price: 1000,
  currentStatus: 'vacant_clean',
  ...overrides
});

const createMockBooking = (overrides = {}) => ({
  id: uuidv4(),
  bookingNumber: `GR-${Date.now()}-TEST`,
  checkIn: new Date('2026-01-15'),
  checkOut: new Date('2026-01-18'),
  totalAmount: 3000,
  paidAmount: 0,
  status: 'pending',
  contactInfo: {
    name: 'Test Guest',
    phone: '9876543210',
    email: 'guest@example.com'
  },
  ...overrides
});

const createMockPropertyClaim = (overrides = {}) => ({
  id: uuidv4(),
  propertyId: uuidv4(),
  claimantName: 'Test Claimant',
  claimantEmail: 'claimant@example.com',
  claimantPhone: '9876543210',
  status: 'pending',
  ...overrides
});

const createMockPayment = (overrides = {}) => ({
  id: uuidv4(),
  amount: 1000,
  paymentMethod: 'upi',
  paymentDate: new Date(),
  ...overrides
});


describe('Notification Flows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property Claim → Notification Flow
   * Requirements: 1.1
   * Tests that property claim submission triggers notifications to all admins
   */
  describe('Property Claim → Notification Flow', () => {
    test('should send notifications to all admins when property claim is submitted', async () => {
      // Setup: Create mock admins
      const mockAdmins = [
        createMockUser({ id: uuidv4(), role: 'admin', email: 'admin1@example.com' }),
        createMockUser({ id: uuidv4(), role: 'superuser', email: 'admin2@example.com' }),
        createMockUser({ id: uuidv4(), role: 'operation_head', email: 'ops@example.com' })
      ];
      
      const mockProperty = createMockProperty();
      const mockClaim = createMockPropertyClaim({ propertyId: mockProperty.id });

      User.findAll.mockResolvedValue(mockAdmins);
      Property.findByPk.mockResolvedValue(mockProperty);

      // Execute
      const result = await notificationService.sendPropertyClaimSubmittedNotification(mockClaim);

      // Verify
      expect(result.success).toBe(true);
      expect(result.adminCount).toBe(3);
      expect(result.notifications.length).toBeGreaterThan(0);
      
      // Verify in-app notifications were created for each admin
      const inAppNotifications = result.notifications.filter(n => n.channel === 'in_app');
      expect(inAppNotifications.length).toBe(3);
      
      // Verify email was sent to operations
      const emailNotifications = result.notifications.filter(n => n.channel === 'email');
      expect(emailNotifications.length).toBe(1);
    });


    test('should send approval notification to claimant with email and SMS', async () => {
      const mockProperty = createMockProperty();
      const mockClaim = createMockPropertyClaim({
        propertyId: mockProperty.id,
        claimantUserId: uuidv4()
      });

      Property.findByPk.mockResolvedValue(mockProperty);

      const result = await notificationService.sendPropertyClaimApprovedNotification(mockClaim);

      expect(result.success).toBe(true);
      expect(result.notifications.length).toBeGreaterThan(0);
      
      // Verify both email and SMS channels were used
      const channels = result.notifications.map(n => n.channel);
      expect(channels).toContain('email');
      expect(channels).toContain('sms');
    });

    test('should send rejection notification with reason to claimant', async () => {
      const mockProperty = createMockProperty();
      const mockClaim = createMockPropertyClaim({
        propertyId: mockProperty.id,
        claimantUserId: uuidv4()
      });
      const rejectionReason = 'Insufficient documentation provided';

      Property.findByPk.mockResolvedValue(mockProperty);

      const result = await notificationService.sendPropertyClaimRejectedNotification(
        mockClaim,
        rejectionReason
      );

      expect(result.success).toBe(true);
      expect(result.rejectionReason).toBe(rejectionReason);
      expect(result.notifications.some(n => n.channel === 'email')).toBe(true);
    });

    test('should handle claim submission with no admins gracefully', async () => {
      const mockProperty = createMockProperty();
      const mockClaim = createMockPropertyClaim({ propertyId: mockProperty.id });

      User.findAll.mockResolvedValue([]);
      Property.findByPk.mockResolvedValue(mockProperty);

      const result = await notificationService.sendPropertyClaimSubmittedNotification(mockClaim);

      expect(result.adminCount).toBe(0);
      // Should still send email to operations
      expect(result.notifications.some(n => n.channel === 'email')).toBe(true);
    });
  });


  /**
   * Booking → Notification Flow
   * Requirements: 2.1
   * Tests that booking creation triggers notifications to property owner
   */
  describe('Booking → Notification Flow', () => {
    test('should send email and in-app notification to property owner on booking creation', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id
      });

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendBookingCreatedNotification(mockBooking);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      
      // Verify both channels were used
      const channels = result.notifications.map(n => n.channel);
      expect(channels).toContain('email');
      expect(channels).toContain('in_app');
    });

    test('should send check-in notification to property owner', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        status: 'checked_in',
        actualCheckInTime: new Date()
      });

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendCheckInNotification(mockBooking);

      expect(result.success).toBe(true);
      expect(result.notifications.some(n => n.channel === 'in_app')).toBe(true);
    });


    test('should send check-out notification with summary to property owner', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        status: 'checked_out',
        totalAmount: 3000,
        paidAmount: 3000
      });

      const checkoutSummary = {
        finalAmount: 3000,
        paidAmount: 3000,
        outstandingBalance: 0,
        refundAmount: 0
      };

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendCheckOutNotification(mockBooking, checkoutSummary);

      expect(result.success).toBe(true);
      expect(result.notifications.some(n => n.channel === 'in_app')).toBe(true);
    });

    test('should send cancellation notification with reason to property owner', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id
      });

      const cancellationDetails = {
        reason: 'Guest requested cancellation'
      };

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);

      const result = await notificationService.sendBookingCancelledNotification(
        mockBooking,
        cancellationDetails
      );

      expect(result.success).toBe(true);
      const channels = result.notifications.map(n => n.channel);
      expect(channels).toContain('email');
      expect(channels).toContain('in_app');
    });


    test('should send modification notification with old and new dates', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        checkIn: new Date('2026-01-20'),
        checkOut: new Date('2026-01-25')
      });

      const originalDates = {
        checkIn: new Date('2026-01-15'),
        checkOut: new Date('2026-01-18')
      };

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);

      const result = await notificationService.sendBookingModifiedNotification(
        mockBooking,
        originalDates
      );

      expect(result.success).toBe(true);
      expect(result.notifications.some(n => n.channel === 'in_app')).toBe(true);
    });

    test('should fail gracefully when property owner not found', async () => {
      const mockBooking = createMockBooking({
        ownerId: uuidv4()
      });

      User.findByPk.mockResolvedValue(null);

      await expect(
        notificationService.sendBookingCreatedNotification(mockBooking)
      ).rejects.toThrow('Property owner not found');
    });
  });


  /**
   * Payment → Reminder Flow
   * Requirements: 3.1
   * Tests that payment reminders are sent at correct thresholds
   */
  describe('Payment → Reminder Flow', () => {
    test('should send 7-day payment reminder with medium priority', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 0
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendPaymentReminderNotification(mockBooking, 7);

      expect(result.success).toBe(true);
      expect(result.daysUntilDue).toBe(7);
      expect(result.priority).toBe('medium');
      expect(result.outstandingBalance).toBe(5000);
      
      const channels = result.notifications.map(n => n.channel);
      expect(channels).toContain('email');
      expect(channels).toContain('sms');
    });

    test('should send 3-day payment reminder with medium priority', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 2000
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendPaymentReminderNotification(mockBooking, 3);

      expect(result.success).toBe(true);
      expect(result.daysUntilDue).toBe(3);
      expect(result.priority).toBe('medium');
      expect(result.outstandingBalance).toBe(3000);
    });


    test('should send 1-day payment reminder with urgent priority', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 0
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendPaymentReminderNotification(mockBooking, 1);

      expect(result.success).toBe(true);
      expect(result.daysUntilDue).toBe(1);
      expect(result.priority).toBe('urgent');
    });

    test('should reject invalid daysUntilDue values', async () => {
      const mockBooking = createMockBooking();

      await expect(
        notificationService.sendPaymentReminderNotification(mockBooking, 5)
      ).rejects.toThrow('daysUntilDue must be 7, 3, or 1');
    });

    test('should send overdue notification and escalate after 7 days', async () => {
      const mockUser = createMockUser();
      const mockOwner = createMockUser({ id: uuidv4(), role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 0
      });

      User.findByPk.mockImplementation((id) => {
        if (id === mockUser.id) return Promise.resolve(mockUser);
        if (id === mockOwner.id) return Promise.resolve(mockOwner);
        return Promise.resolve(null);
      });
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendPaymentOverdueNotification(mockBooking, 10);

      expect(result.success).toBe(true);
      expect(result.daysOverdue).toBe(10);
      expect(result.escalated).toBe(true);
      
      // Should have notifications to owner and operations
      const recipientTypes = result.notifications.map(n => n.recipientType);
      expect(recipientTypes).toContain('property_owner');
      expect(recipientTypes).toContain('operations');
    });


    test('should send daily overdue notifications for first 7 days without escalation', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 0
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      const result = await notificationService.sendPaymentOverdueNotification(mockBooking, 5);

      expect(result.success).toBe(true);
      expect(result.daysOverdue).toBe(5);
      expect(result.escalated).toBe(false);
      
      // Should only notify guest, not escalate
      const guestNotifications = result.notifications.filter(n => n.recipientType === 'guest');
      expect(guestNotifications.length).toBeGreaterThan(0);
    });

    test('should send payment received confirmation with correct amount', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 3000
      });
      const mockPayment = createMockPayment({
        bookingId: mockBooking.id,
        amount: 2000
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);
      Booking.findByPk.mockResolvedValue(mockBooking);

      const result = await notificationService.sendPaymentReceivedNotification(
        mockPayment,
        mockBooking
      );

      expect(result.success).toBe(true);
      expect(result.paymentAmount).toBe(2000);
      expect(result.remainingBalance).toBe(2000);
      expect(result.isFullyPaid).toBe(false);
    });


    test('should indicate fully paid status when payment completes balance', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 5000
      });
      const mockPayment = createMockPayment({
        bookingId: mockBooking.id,
        amount: 2000
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);
      Booking.findByPk.mockResolvedValue(mockBooking);

      const result = await notificationService.sendPaymentReceivedNotification(
        mockPayment,
        mockBooking
      );

      expect(result.success).toBe(true);
      expect(result.remainingBalance).toBe(0);
      expect(result.isFullyPaid).toBe(true);
    });
  });

  /**
   * End-to-End Flow Tests
   * Tests complete notification flows from trigger to delivery
   */
  describe('End-to-End Notification Flows', () => {
    test('complete property claim flow: submit → approve → notify', async () => {
      const mockAdmins = [
        createMockUser({ id: uuidv4(), role: 'admin' })
      ];
      const mockProperty = createMockProperty();
      const mockClaim = createMockPropertyClaim({
        propertyId: mockProperty.id,
        claimantUserId: uuidv4()
      });

      User.findAll.mockResolvedValue(mockAdmins);
      Property.findByPk.mockResolvedValue(mockProperty);

      // Step 1: Submit claim
      const submitResult = await notificationService.sendPropertyClaimSubmittedNotification(mockClaim);
      expect(submitResult.success).toBe(true);

      // Step 2: Approve claim
      const approveResult = await notificationService.sendPropertyClaimApprovedNotification(mockClaim);
      expect(approveResult.success).toBe(true);
      expect(approveResult.notifications.some(n => n.channel === 'email')).toBe(true);
      expect(approveResult.notifications.some(n => n.channel === 'sms')).toBe(true);
    });


    test('complete booking flow: create → check-in → check-out', async () => {
      const mockOwner = createMockUser({ role: 'property_owner' });
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        ownerId: mockOwner.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id
      });

      User.findByPk.mockResolvedValue(mockOwner);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      // Step 1: Create booking
      const createResult = await notificationService.sendBookingCreatedNotification(mockBooking);
      expect(createResult.success).toBe(true);

      // Step 2: Check-in
      mockBooking.status = 'checked_in';
      mockBooking.actualCheckInTime = new Date();
      const checkInResult = await notificationService.sendCheckInNotification(mockBooking);
      expect(checkInResult.success).toBe(true);

      // Step 3: Check-out
      mockBooking.status = 'checked_out';
      const checkoutSummary = { finalAmount: 3000, paidAmount: 3000, outstandingBalance: 0 };
      const checkOutResult = await notificationService.sendCheckOutNotification(mockBooking, checkoutSummary);
      expect(checkOutResult.success).toBe(true);
    });

    test('complete payment flow: reminder → overdue → payment received', async () => {
      const mockUser = createMockUser();
      const mockProperty = createMockProperty();
      const mockRoom = createMockRoom();
      const mockBooking = createMockBooking({
        userId: mockUser.id,
        propertyId: mockProperty.id,
        roomId: mockRoom.id,
        totalAmount: 5000,
        paidAmount: 0
      });

      User.findByPk.mockResolvedValue(mockUser);
      Property.findByPk.mockResolvedValue(mockProperty);
      Room.findByPk.mockResolvedValue(mockRoom);

      // Step 1: 7-day reminder
      const reminder7 = await notificationService.sendPaymentReminderNotification(mockBooking, 7);
      expect(reminder7.success).toBe(true);
      expect(reminder7.priority).toBe('medium');

      // Step 2: 1-day reminder (urgent)
      const reminder1 = await notificationService.sendPaymentReminderNotification(mockBooking, 1);
      expect(reminder1.success).toBe(true);
      expect(reminder1.priority).toBe('urgent');

      // Step 3: Overdue
      const overdue = await notificationService.sendPaymentOverdueNotification(mockBooking, 3);
      expect(overdue.success).toBe(true);

      // Step 4: Payment received
      mockBooking.paidAmount = 5000;
      const payment = createMockPayment({ bookingId: mockBooking.id, amount: 5000 });
      Booking.findByPk.mockResolvedValue(mockBooking);
      
      const received = await notificationService.sendPaymentReceivedNotification(payment, mockBooking);
      expect(received.success).toBe(true);
      expect(received.isFullyPaid).toBe(true);
    });
  });
});
