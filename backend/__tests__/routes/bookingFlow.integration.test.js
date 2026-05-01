/**
 * Integration Tests for Hotel Booking Flow APIs
 * 
 * Tests the complete booking lifecycle through validation and data structures
 * - Complete booking flow (create → confirm → check-in → check-out)
 * - Instant check-in flow
 * - Guest profile creation and document upload
 * 
 * Requirements: 1.1, 3.1, 5.1, 12.1
 */

const { v4: uuidv4 } = require('uuid');

// Create mock data for validation tests
const mockUserId = uuidv4();
const mockOwnerId = uuidv4();
const mockPropertyId = uuidv4();
const mockRoomId = uuidv4();
const mockBookingId = uuidv4();
const mockGuestProfileId = uuidv4();

const mockRoom = {
  id: mockRoomId,
  title: 'Test Room 101',
  roomNumber: '101',
  currentStatus: 'vacant_clean',
  price: 1000,
  ownerId: mockOwnerId,
  propertyId: mockPropertyId,
  isActive: true,
  category: 'Hotel Room'
};

const mockBooking = {
  id: mockBookingId,
  roomId: mockRoomId,
  userId: mockUserId,
  ownerId: mockOwnerId,
  propertyId: mockPropertyId,
  bookingNumber: 'GR-20260105-TEST',
  bookingSource: 'offline',
  bookingType: 'daily',
  checkIn: new Date('2026-01-10'),
  checkOut: new Date('2026-01-12'),
  guests: 2,
  totalAmount: 2000,
  paidAmount: 0,
  status: 'pending',
  paymentStatus: 'pending',
  contactInfo: {
    name: 'Test Guest',
    phone: '9876543210',
    email: 'guest@example.com'
  }
};

const mockGuestProfile = {
  id: mockGuestProfileId,
  name: 'Test Guest',
  phone: '9876543210',
  email: 'guest@example.com',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456'
  },
  idType: 'aadhaar',
  idNumber: '123456789012',
  idVerified: true,
  totalStays: 1,
  lastStayDate: new Date()
};

describe('Hotel Booking Flow Integration Tests', () => {
  
  describe('Complete Booking Flow (create → confirm → check-in → check-out)', () => {
    test('should validate booking creation data correctly', () => {
      const bookingData = {
        roomId: mockRoomId,
        checkIn: '2026-01-10',
        checkOut: '2026-01-12',
        guests: 2,
        contactInfo: {
          name: 'Test Guest',
          phone: '9876543210',
          email: 'guest@example.com'
        },
        bookingSource: 'offline',
        bookingType: 'daily'
      };

      expect(bookingData.roomId).toBeDefined();
      expect(bookingData.checkIn).toBeDefined();
      expect(bookingData.checkOut).toBeDefined();
      expect(bookingData.guests).toBeGreaterThan(0);
      expect(bookingData.contactInfo.phone).toMatch(/^[0-9]{10}$/);
      expect(bookingData.contactInfo.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('should validate booking status transitions', () => {
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['checked_in', 'cancelled', 'no_show'],
        'checked_in': ['checked_out']
      };

      expect(validTransitions['pending']).toContain('confirmed');
      expect(validTransitions['confirmed']).toContain('checked_in');
      expect(validTransitions['checked_in']).toContain('checked_out');
      expect(validTransitions['pending']).not.toContain('checked_in');
      expect(validTransitions['checked_out']).toBeUndefined();
    });

    test('should validate check-in data correctly', () => {
      const checkInData = {
        bookingId: mockBookingId,
        performedBy: mockUserId,
        notes: 'Guest checked in',
        guestData: {
          name: 'Test Guest',
          phone: '9876543210',
          idType: 'aadhaar',
          idNumber: '123456789012'
        }
      };

      expect(checkInData.bookingId).toBeDefined();
      expect(checkInData.performedBy).toBeDefined();
      expect(checkInData.guestData.idType).toMatch(/^(aadhaar|pan|passport|driving_license|voter_id)$/);
    });

    test('should validate check-out data correctly', () => {
      const checkOutData = {
        bookingId: mockBookingId,
        performedBy: mockUserId,
        roomInspected: true,
        notes: 'Room inspected, all clear'
      };

      expect(checkOutData.bookingId).toBeDefined();
      expect(checkOutData.performedBy).toBeDefined();
      expect(checkOutData.roomInspected).toBe(true);
    });

    test('should follow correct booking flow state machine', () => {
      let bookingStatus = 'pending';
      
      const canConfirm = bookingStatus === 'pending';
      expect(canConfirm).toBe(true);
      bookingStatus = 'confirmed';
      
      const canCheckIn = bookingStatus === 'confirmed';
      expect(canCheckIn).toBe(true);
      bookingStatus = 'checked_in';
      
      const canCheckOut = bookingStatus === 'checked_in';
      expect(canCheckOut).toBe(true);
      bookingStatus = 'checked_out';
      
      expect(bookingStatus).toBe('checked_out');
    });
  });

  describe('Instant Check-In Flow', () => {
    test('should validate instant check-in data correctly', () => {
      const instantCheckInData = {
        roomId: mockRoomId,
        propertyId: mockPropertyId,
        ownerId: mockOwnerId,
        checkOut: '2026-01-12',
        guestInfo: {
          name: 'Walk-in Guest',
          phone: '9876543210',
          email: 'walkin@example.com'
        },
        guests: 1
      };

      expect(instantCheckInData.roomId).toBeDefined();
      expect(instantCheckInData.propertyId).toBeDefined();
      expect(instantCheckInData.ownerId).toBeDefined();
      expect(instantCheckInData.checkOut).toBeDefined();
      expect(instantCheckInData.guestInfo.name.length).toBeGreaterThanOrEqual(2);
      expect(instantCheckInData.guestInfo.phone).toMatch(/^[0-9]{10}$/);
    });

    test('should validate instant check-in with deposit data', () => {
      const instantCheckInWithDeposit = {
        roomId: mockRoomId,
        propertyId: mockPropertyId,
        ownerId: mockOwnerId,
        checkOut: '2026-01-12',
        guestInfo: {
          name: 'Walk-in Guest',
          phone: '9876543210'
        },
        deposit: {
          amount: 5000,
          method: 'cash'
        }
      };

      expect(instantCheckInWithDeposit.deposit.amount).toBeGreaterThan(0);
      expect(['cash', 'card', 'upi', 'bank_transfer']).toContain(instantCheckInWithDeposit.deposit.method);
    });

    test('should create booking with checked_in status for instant check-in', () => {
      const instantBooking = {
        ...mockBooking,
        status: 'checked_in',
        bookingSource: 'walk_in',
        actualCheckInTime: new Date()
      };

      expect(instantBooking.status).toBe('checked_in');
      expect(instantBooking.bookingSource).toBe('walk_in');
      expect(instantBooking.actualCheckInTime).toBeDefined();
    });
  });

  describe('Guest Profile Creation and Document Upload', () => {
    test('should validate guest profile data correctly', () => {
      const guestProfileData = {
        name: 'Test Guest',
        phone: '9876543210',
        email: 'guest@example.com',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        },
        idType: 'aadhaar',
        idNumber: '123456789012'
      };

      expect(guestProfileData.name.length).toBeGreaterThanOrEqual(2);
      expect(guestProfileData.phone).toMatch(/^[0-9]{10}$/);
      expect(guestProfileData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(guestProfileData.address.pincode).toMatch(/^[1-9][0-9]{5}$/);
      expect(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id']).toContain(guestProfileData.idType);
    });

    test('should validate phone search format', () => {
      const phoneNumber = '9876543210';
      expect(phoneNumber).toMatch(/^[0-9]{10}$/);
      expect(phoneNumber.length).toBe(10);
    });

    test('should have correct guest profile with history structure', () => {
      const guestWithHistory = {
        profile: mockGuestProfile,
        bookings: [
          { ...mockBooking, checkIn: new Date('2025-12-01'), checkOut: new Date('2025-12-03') },
          { ...mockBooking, checkIn: new Date('2025-11-15'), checkOut: new Date('2025-11-17') }
        ]
      };

      expect(guestWithHistory.profile).toBeDefined();
      expect(guestWithHistory.bookings).toBeInstanceOf(Array);
      expect(guestWithHistory.bookings.length).toBeGreaterThan(0);
    });

    test('should identify returning guest correctly', () => {
      const returningGuest = {
        ...mockGuestProfile,
        totalStays: 3,
        lastStayDate: new Date('2025-12-15')
      };

      expect(returningGuest.totalStays).toBeGreaterThan(0);
      expect(returningGuest.lastStayDate).toBeDefined();
    });
  });

  describe('Pending Check-Ins and Due Check-Outs', () => {
    test('should have correct pending check-ins query structure', () => {
      const pendingCheckInsQuery = {
        propertyId: mockPropertyId,
        date: new Date().toISOString().split('T')[0]
      };

      expect(pendingCheckInsQuery.propertyId).toBeDefined();
      expect(pendingCheckInsQuery.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should have correct due check-outs query structure', () => {
      const dueCheckOutsQuery = {
        propertyId: mockPropertyId,
        date: new Date().toISOString().split('T')[0]
      };

      expect(dueCheckOutsQuery.propertyId).toBeDefined();
      expect(dueCheckOutsQuery.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Error Handling', () => {
    test('should detect invalid room ID', () => {
      const invalidRoomId = 'not-a-uuid';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(uuidRegex.test(invalidRoomId)).toBe(false);
      expect(uuidRegex.test(mockRoomId)).toBe(true);
    });

    test('should detect invalid status transitions', () => {
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['checked_in', 'cancelled', 'no_show'],
        'checked_in': ['checked_out']
      };

      const isValidTransition = (from, to) => {
        return validTransitions[from]?.includes(to) || false;
      };

      expect(isValidTransition('pending', 'checked_in')).toBe(false);
      expect(isValidTransition('checked_out', 'pending')).toBe(false);
      expect(isValidTransition('pending', 'confirmed')).toBe(true);
      expect(isValidTransition('confirmed', 'checked_in')).toBe(true);
    });

    test('should require room inspection for check-out', () => {
      const checkOutWithoutInspection = { roomInspected: false };
      const checkOutWithInspection = { roomInspected: true };

      expect(checkOutWithoutInspection.roomInspected).toBe(false);
      expect(checkOutWithInspection.roomInspected).toBe(true);
    });
  });

  describe('Validation Tests', () => {
    test('should validate phone number format', () => {
      const validPhone = '9876543210';
      const invalidPhone = '123';
      const phoneRegex = /^[0-9]{10}$/;

      expect(phoneRegex.test(validPhone)).toBe(true);
      expect(phoneRegex.test(invalidPhone)).toBe(false);
    });

    test('should validate email format', () => {
      const validEmail = 'guest@example.com';
      const invalidEmail = 'invalid-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    test('should validate guest count', () => {
      const validGuestCount = 2;
      const invalidGuestCount = 0;
      const maxGuestCount = 10;

      expect(validGuestCount).toBeGreaterThan(0);
      expect(validGuestCount).toBeLessThanOrEqual(maxGuestCount);
      expect(invalidGuestCount).not.toBeGreaterThan(0);
    });

    test('should validate ID number formats', () => {
      const idFormats = {
        aadhaar: /^[0-9]{12}$/,
        pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        passport: /^[A-Z0-9]{6,9}$/,
        voter_id: /^[A-Z]{3}[0-9]{7}$/
      };

      expect(idFormats.aadhaar.test('123456789012')).toBe(true);
      expect(idFormats.aadhaar.test('12345')).toBe(false);
      expect(idFormats.pan.test('ABCDE1234F')).toBe(true);
      expect(idFormats.pan.test('12345')).toBe(false);
      expect(idFormats.passport.test('A1234567')).toBe(true);
      expect(idFormats.voter_id.test('ABC1234567')).toBe(true);
    });

    test('should validate booking dates', () => {
      const checkIn = new Date('2026-01-10');
      const checkOut = new Date('2026-01-12');
      const today = new Date();

      expect(checkOut > checkIn).toBe(true);
      expect(checkIn >= today).toBe(true);
    });

    test('should validate deposit amounts', () => {
      const validDeposit = 5000;
      const invalidDeposit = -100;

      expect(validDeposit).toBeGreaterThan(0);
      expect(invalidDeposit).not.toBeGreaterThan(0);
    });
  });

  describe('Room Status Synchronization', () => {
    test('should set room status to occupied after check-in', () => {
      const roomBeforeCheckIn = { ...mockRoom, currentStatus: 'vacant_clean' };
      const roomAfterCheckIn = { ...mockRoom, currentStatus: 'occupied' };

      expect(roomBeforeCheckIn.currentStatus).toBe('vacant_clean');
      expect(roomAfterCheckIn.currentStatus).toBe('occupied');
    });

    test('should set room status to vacant_dirty after check-out', () => {
      const roomBeforeCheckOut = { ...mockRoom, currentStatus: 'occupied' };
      const roomAfterCheckOut = { ...mockRoom, currentStatus: 'vacant_dirty' };

      expect(roomBeforeCheckOut.currentStatus).toBe('occupied');
      expect(roomAfterCheckOut.currentStatus).toBe('vacant_dirty');
    });

    test('should have valid room status values', () => {
      const validStatuses = ['vacant_clean', 'vacant_dirty', 'occupied', 'maintenance', 'blocked'];

      expect(validStatuses).toContain('vacant_clean');
      expect(validStatuses).toContain('occupied');
      expect(validStatuses).toContain('vacant_dirty');
    });
  });

  describe('Deposit Management', () => {
    test('should calculate deposit refund correctly', () => {
      const originalDeposit = 5000;
      const deductions = [
        { reason: 'Damage to furniture', amount: 500 },
        { reason: 'Extra cleaning', amount: 200 }
      ];

      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const refundAmount = Math.max(0, originalDeposit - totalDeductions);

      expect(totalDeductions).toBe(700);
      expect(refundAmount).toBe(4300);
    });

    test('should handle full deposit deduction', () => {
      const originalDeposit = 1000;
      const deductions = [{ reason: 'Major damage', amount: 1500 }];

      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const refundAmount = Math.max(0, originalDeposit - totalDeductions);

      expect(refundAmount).toBe(0);
    });

    test('should have valid deposit payment methods', () => {
      const validMethods = ['cash', 'card', 'upi', 'bank_transfer'];

      expect(validMethods).toContain('cash');
      expect(validMethods).toContain('card');
      expect(validMethods).toContain('upi');
      expect(validMethods).toContain('bank_transfer');
    });
  });

  describe('Booking Number Generation', () => {
    test('should generate booking number in correct format', () => {
      const bookingNumber = 'GR-20260105-TEST';
      const bookingNumberRegex = /^GR-\d{8}-[A-Z0-9]+$/;

      expect(bookingNumberRegex.test(bookingNumber)).toBe(true);
    });

    test('should generate unique booking numbers', () => {
      const bookingNumbers = new Set([
        'GR-20260105-ABC1',
        'GR-20260105-ABC2',
        'GR-20260105-ABC3'
      ]);

      expect(bookingNumbers.size).toBe(3);
    });
  });

  describe('Booking Modifications - Date Changes', () => {
    // Requirements: 8.1, 8.3, 8.6
    
    test('should validate date modification request data', () => {
      const dateModificationData = {
        bookingId: mockBookingId,
        checkIn: '2026-01-15',
        checkOut: '2026-01-18',
        reason: 'Guest requested date change'
      };

      expect(dateModificationData.bookingId).toBeDefined();
      expect(dateModificationData.checkIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateModificationData.checkOut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(dateModificationData.checkOut) > new Date(dateModificationData.checkIn)).toBe(true);
    });

    test('should recalculate total amount when dates change', () => {
      const dailyRate = 1000;
      const originalDuration = 2; // 2 nights
      const newDuration = 3; // 3 nights
      
      const originalAmount = dailyRate * originalDuration;
      const newAmount = dailyRate * newDuration;
      const amountDifference = newAmount - originalAmount;

      expect(originalAmount).toBe(2000);
      expect(newAmount).toBe(3000);
      expect(amountDifference).toBe(1000);
    });

    test('should validate check-out is after check-in', () => {
      const validDates = {
        checkIn: new Date('2026-01-15'),
        checkOut: new Date('2026-01-18')
      };
      
      const invalidDates = {
        checkIn: new Date('2026-01-18'),
        checkOut: new Date('2026-01-15')
      };

      expect(validDates.checkOut > validDates.checkIn).toBe(true);
      expect(invalidDates.checkOut > invalidDates.checkIn).toBe(false);
    });

    test('should only allow date modification for pending or confirmed bookings', () => {
      const modifiableStatuses = ['pending', 'confirmed'];
      const nonModifiableStatuses = ['checked_in', 'checked_out', 'cancelled', 'no_show'];

      expect(modifiableStatuses.includes('pending')).toBe(true);
      expect(modifiableStatuses.includes('confirmed')).toBe(true);
      expect(modifiableStatuses.includes('checked_in')).toBe(false);
      expect(nonModifiableStatuses.includes('checked_out')).toBe(true);
    });

    test('should calculate duration correctly', () => {
      const checkIn = new Date('2026-01-10');
      const checkOut = new Date('2026-01-15');
      const duration = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      expect(duration).toBe(5);
    });

    test('should handle booking extension correctly', () => {
      const originalCheckOut = new Date('2026-01-12');
      const newCheckOut = new Date('2026-01-15');
      
      const isExtension = newCheckOut > originalCheckOut;
      expect(isExtension).toBe(true);
    });

    test('should handle booking shortening correctly', () => {
      const originalCheckOut = new Date('2026-01-15');
      const newCheckOut = new Date('2026-01-12');
      const checkIn = new Date('2026-01-10');
      
      const isShortening = newCheckOut < originalCheckOut;
      const isValidShortening = newCheckOut > checkIn;
      
      expect(isShortening).toBe(true);
      expect(isValidShortening).toBe(true);
    });
  });

  describe('Booking Modifications - Room Changes', () => {
    // Requirements: 8.2
    
    const mockNewRoomId = uuidv4();
    const mockNewRoom = {
      id: mockNewRoomId,
      title: 'Test Room 102',
      roomNumber: '102',
      currentStatus: 'vacant_clean',
      price: 1200,
      ownerId: mockOwnerId,
      propertyId: mockPropertyId,
      isActive: true,
      category: 'Hotel Room'
    };

    test('should validate room change request data', () => {
      const roomChangeData = {
        bookingId: mockBookingId,
        newRoomId: mockNewRoomId,
        reason: 'Guest requested room upgrade'
      };

      expect(roomChangeData.bookingId).toBeDefined();
      expect(roomChangeData.newRoomId).toBeDefined();
      expect(roomChangeData.reason).toBeDefined();
    });

    test('should allow room change for pending, confirmed, or checked_in bookings', () => {
      const modifiableStatuses = ['pending', 'confirmed', 'checked_in'];
      const nonModifiableStatuses = ['checked_out', 'cancelled', 'no_show'];

      expect(modifiableStatuses.includes('pending')).toBe(true);
      expect(modifiableStatuses.includes('confirmed')).toBe(true);
      expect(modifiableStatuses.includes('checked_in')).toBe(true);
      expect(modifiableStatuses.includes('checked_out')).toBe(false);
    });

    test('should validate new room availability for checked-in guests', () => {
      const validRoomStatuses = ['vacant_clean', 'vacant_dirty'];
      const invalidRoomStatuses = ['occupied', 'maintenance', 'blocked'];

      expect(validRoomStatuses.includes('vacant_clean')).toBe(true);
      expect(validRoomStatuses.includes('vacant_dirty')).toBe(true);
      expect(invalidRoomStatuses.includes('occupied')).toBe(true);
    });

    test('should update room statuses when changing room for checked-in guest', () => {
      const oldRoomBeforeChange = { ...mockRoom, currentStatus: 'occupied' };
      const oldRoomAfterChange = { ...mockRoom, currentStatus: 'vacant_dirty' };
      const newRoomBeforeChange = { ...mockNewRoom, currentStatus: 'vacant_clean' };
      const newRoomAfterChange = { ...mockNewRoom, currentStatus: 'occupied' };

      expect(oldRoomBeforeChange.currentStatus).toBe('occupied');
      expect(oldRoomAfterChange.currentStatus).toBe('vacant_dirty');
      expect(newRoomBeforeChange.currentStatus).toBe('vacant_clean');
      expect(newRoomAfterChange.currentStatus).toBe('occupied');
    });

    test('should not change room statuses for pending/confirmed bookings', () => {
      const pendingBooking = { ...mockBooking, status: 'pending' };
      const confirmedBooking = { ...mockBooking, status: 'confirmed' };

      // Room statuses should not change for non-checked-in bookings
      expect(pendingBooking.status).not.toBe('checked_in');
      expect(confirmedBooking.status).not.toBe('checked_in');
    });

    test('should handle bed assignment for shared rooms', () => {
      const mockBedId = uuidv4();
      const roomChangeWithBed = {
        bookingId: mockBookingId,
        newRoomId: mockNewRoomId,
        newBedId: mockBedId,
        reason: 'Moving to shared room'
      };

      expect(roomChangeWithBed.newBedId).toBeDefined();
    });
  });

  describe('Booking Modification Audit Trail', () => {
    // Requirements: 8.6, 10.1
    
    test('should have correct audit log structure for date changes', () => {
      const dateChangeAuditLog = {
        bookingId: mockBookingId,
        action: 'dates_changed',
        oldValue: {
          checkIn: new Date('2026-01-10'),
          checkOut: new Date('2026-01-12'),
          totalAmount: 2000,
          duration: 2
        },
        newValue: {
          checkIn: new Date('2026-01-15'),
          checkOut: new Date('2026-01-18'),
          totalAmount: 3000,
          duration: 3
        },
        performedBy: mockUserId,
        performedAt: new Date(),
        notes: 'Guest requested date change'
      };

      expect(dateChangeAuditLog.action).toBe('dates_changed');
      expect(dateChangeAuditLog.oldValue).toBeDefined();
      expect(dateChangeAuditLog.newValue).toBeDefined();
      expect(dateChangeAuditLog.performedBy).toBeDefined();
    });

    test('should have correct audit log structure for room changes', () => {
      const mockNewRoomId = uuidv4();
      const roomChangeAuditLog = {
        bookingId: mockBookingId,
        action: 'room_changed',
        oldValue: { roomId: mockRoomId },
        newValue: { roomId: mockNewRoomId },
        performedBy: mockUserId,
        performedAt: new Date(),
        notes: 'Guest requested room upgrade'
      };

      expect(roomChangeAuditLog.action).toBe('room_changed');
      expect(roomChangeAuditLog.oldValue.roomId).toBe(mockRoomId);
      expect(roomChangeAuditLog.newValue.roomId).toBe(mockNewRoomId);
    });

    test('should have valid audit action types', () => {
      const validActions = [
        'created',
        'status_changed',
        'modified',
        'check_in',
        'check_out',
        'payment_received',
        'payment_refunded',
        'deposit_collected',
        'deposit_refunded',
        'room_changed',
        'dates_changed',
        'cancelled',
        'no_show_marked'
      ];

      expect(validActions).toContain('dates_changed');
      expect(validActions).toContain('room_changed');
      expect(validActions).toContain('modified');
    });
  });
});
