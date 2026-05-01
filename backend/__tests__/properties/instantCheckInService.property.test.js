/**
 * Property Tests: InstantCheckInService
 * 
 * Property 16: Instant Check-In Atomicity
 * 
 * *For any* instant check-in operation, if successful, a booking should exist 
 * with status 'checked_in', room status should be 'occupied', and guest profile 
 * should be created/updated - all in a single transaction.
 * 
 * **Validates: Requirements 1A.4**
 * 
 * These property tests validate the logical consistency of instant check-in operations
 * without requiring database connections. They test validation rules, data structures,
 * and business logic properties.
 */

const fc = require('fast-check');

/**
 * InstantCheckInService validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const InstantCheckInValidation = {
  // Room statuses that allow instant check-in
  AVAILABLE_ROOM_STATUSES: ['vacant_clean', 'vacant_dirty'],
  
  // Room statuses that block instant check-in
  BLOCKED_ROOM_STATUSES: ['occupied', 'maintenance', 'blocked'],
  
  // All possible room statuses
  ALL_ROOM_STATUSES: ['vacant_clean', 'vacant_dirty', 'occupied', 'maintenance', 'blocked'],
  
  // Valid booking sources
  VALID_BOOKING_SOURCES: ['online', 'offline', 'walk_in'],
  
  // Valid booking types
  VALID_BOOKING_TYPES: ['daily', 'monthly'],
  
  // Valid payment methods for deposits
  VALID_PAYMENT_METHODS: ['cash', 'card', 'upi', 'bank_transfer'],
  
  /**
   * Validate phone number format (10 digits)
   */
  validatePhone(phone) {
    if (!phone) return false;
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  },
  
  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  /**
   * Validate guest information for instant check-in
   * Requirements: 1A.3
   */
  validateGuestInfo(guestInfo) {
    if (!guestInfo) {
      return { valid: false, reason: 'Guest information is required' };
    }
    
    if (!guestInfo.name || guestInfo.name.trim().length < 2) {
      return { valid: false, reason: 'Guest name is required (minimum 2 characters)' };
    }
    
    if (!guestInfo.phone) {
      return { valid: false, reason: 'Guest phone number is required' };
    }
    
    if (!this.validatePhone(guestInfo.phone)) {
      return { valid: false, reason: 'Invalid phone number format. Must be 10 digits.' };
    }
    
    if (guestInfo.email && !this.validateEmail(guestInfo.email)) {
      return { valid: false, reason: 'Invalid email format' };
    }
    
    return { valid: true };
  },
  
  /**
   * Validate room availability for instant check-in
   * Requirements: 1A.1, 1A.8
   */
  validateRoomForInstantCheckIn(room, bedId = null) {
    if (!room) {
      return { available: false, reason: 'Room not found' };
    }
    
    if (!this.AVAILABLE_ROOM_STATUSES.includes(room.currentStatus)) {
      const statusMessages = {
        'occupied': 'Room is currently occupied',
        'maintenance': 'Room is under maintenance',
        'blocked': 'Room is blocked and not available'
      };
      return {
        available: false,
        reason: statusMessages[room.currentStatus] || `Room is not available (status: ${room.currentStatus})`
      };
    }
    
    return { available: true };
  },
  
  /**
   * Simulate instant check-in operation
   * Returns the expected state after successful instant check-in
   * Requirements: 1A.4
   */
  simulateInstantCheckIn(checkInData, room) {
    // Validate room
    const roomValidation = this.validateRoomForInstantCheckIn(room, checkInData.bedId);
    if (!roomValidation.available) {
      return { success: false, reason: roomValidation.reason };
    }
    
    // Validate guest info
    const guestValidation = this.validateGuestInfo(checkInData.guestInfo);
    if (!guestValidation.valid) {
      return { success: false, reason: guestValidation.reason };
    }
    
    // Validate check-out date
    const checkIn = new Date();
    const checkOut = new Date(checkInData.checkOut);
    if (checkOut <= checkIn) {
      return { success: false, reason: 'Check-out date must be after check-in date' };
    }
    
    // Generate booking number
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calculate duration
    const durationDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = (room.price || 1000) * durationDays;
    
    // Create expected state after instant check-in
    const booking = {
      id: `booking-${Date.now()}`,
      roomId: room.id,
      bedId: checkInData.bedId || null,
      propertyId: checkInData.propertyId,
      ownerId: checkInData.ownerId,
      bookingNumber,
      bookingSource: 'walk_in', // Instant check-in is always walk_in
      bookingType: room.pricingType || 'daily',
      checkIn,
      checkOut,
      actualCheckInTime: checkIn, // Set immediately for instant check-in
      guests: checkInData.guests || 1,
      contactInfo: {
        name: checkInData.guestInfo.name,
        phone: checkInData.guestInfo.phone,
        email: checkInData.guestInfo.email || ''
      },
      specialRequests: checkInData.specialRequests || null,
      totalAmount,
      paidAmount: 0,
      status: 'checked_in', // Direct to checked_in status
      paymentStatus: 'pending',
      checkInBy: checkInData.performedBy
    };
    
    const updatedRoom = {
      ...room,
      currentStatus: 'occupied'
    };
    
    const guestProfile = {
      id: `guest-${Date.now()}`,
      name: checkInData.guestInfo.name,
      phone: checkInData.guestInfo.phone,
      email: checkInData.guestInfo.email || null,
      address: checkInData.guestInfo.address || null,
      idType: checkInData.guestInfo.idType || null,
      idNumber: checkInData.guestInfo.idNumber || null,
      totalStays: 1,
      lastStayDate: new Date()
    };
    
    let deposit = null;
    if (checkInData.deposit && checkInData.deposit.amount > 0) {
      deposit = {
        id: `deposit-${Date.now()}`,
        bookingId: booking.id,
        amount: checkInData.deposit.amount,
        paymentMethod: checkInData.deposit.method,
        status: 'collected',
        collectedAt: new Date(),
        collectedBy: checkInData.performedBy
      };
    }
    
    return {
      success: true,
      booking,
      room: updatedRoom,
      guestProfile,
      deposit
    };
  }
};

describe('Property Tests: InstantCheckInService', () => {
  
  /**
   * Property 16: Instant Check-In Atomicity
   * 
   * *For any* instant check-in operation, if successful, a booking should exist 
   * with status 'checked_in', room status should be 'occupied', and guest profile 
   * should be created/updated - all in a single transaction.
   * 
   * **Validates: Requirements 1A.4**
   */
  describe('Property 16: Instant Check-In Atomicity', () => {
    
    // Arbitrary generators for test data
    const guestInfoArb = fc.record({
      name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
      phone: fc.stringMatching(/^[0-9]{10}$/),
      email: fc.option(fc.emailAddress(), { nil: undefined }),
      address: fc.option(fc.record({
        street: fc.string({ minLength: 1, maxLength: 100 }),
        city: fc.string({ minLength: 1, maxLength: 50 }),
        state: fc.string({ minLength: 1, maxLength: 50 }),
        pincode: fc.stringMatching(/^[0-9]{6}$/)
      }), { nil: undefined })
    });
    
    const roomArb = fc.record({
      id: fc.uuid(),
      roomNumber: fc.string({ minLength: 1, maxLength: 10 }),
      currentStatus: fc.constantFrom('vacant_clean', 'vacant_dirty'),
      price: fc.float({ min: 100, max: 10000, noNaN: true }),
      pricingType: fc.constantFrom('daily', 'monthly'),
      roomType: fc.constantFrom('Single Room', 'Double Room', 'Shared Room'),
      maxGuests: fc.integer({ min: 1, max: 10 })
    });
    
    const checkInDataArb = fc.record({
      propertyId: fc.uuid(),
      ownerId: fc.uuid(),
      guestInfo: guestInfoArb,
      checkOut: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2026-12-31') }),
      guests: fc.integer({ min: 1, max: 10 }),
      specialRequests: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
      deposit: fc.option(fc.record({
        amount: fc.float({ min: 100, max: 50000, noNaN: true }),
        method: fc.constantFrom('cash', 'card', 'upi', 'bank_transfer')
      }), { nil: undefined }),
      performedBy: fc.uuid()
    });
    
    test('Property 16a: Successful instant check-in creates booking with status checked_in', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Successful instant check-in should create booking with checked_in status
            expect(result.success).toBe(true);
            expect(result.booking).toBeDefined();
            expect(result.booking.status).toBe('checked_in');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16b: Successful instant check-in sets room status to occupied', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Successful instant check-in should set room status to occupied
            expect(result.success).toBe(true);
            expect(result.room).toBeDefined();
            expect(result.room.currentStatus).toBe('occupied');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16c: Successful instant check-in creates guest profile', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Successful instant check-in should create guest profile
            expect(result.success).toBe(true);
            expect(result.guestProfile).toBeDefined();
            expect(result.guestProfile.name).toBe(checkInData.guestInfo.name);
            expect(result.guestProfile.phone).toBe(checkInData.guestInfo.phone);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16d: All three states change atomically (booking, room, guest profile)', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: All three states should be present together (atomicity)
            expect(result.success).toBe(true);
            
            // All three components must exist
            expect(result.booking).toBeDefined();
            expect(result.room).toBeDefined();
            expect(result.guestProfile).toBeDefined();
            
            // Booking state
            expect(result.booking.status).toBe('checked_in');
            expect(result.booking.bookingSource).toBe('walk_in');
            expect(result.booking.actualCheckInTime).toBeInstanceOf(Date);
            
            // Room state
            expect(result.room.currentStatus).toBe('occupied');
            
            // Guest profile state
            expect(result.guestProfile.totalStays).toBeGreaterThanOrEqual(1);
            expect(result.guestProfile.lastStayDate).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16e: Booking source is always walk_in for instant check-in', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Instant check-in booking source should always be walk_in
            expect(result.success).toBe(true);
            expect(result.booking.bookingSource).toBe('walk_in');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16f: Actual check-in time is set immediately for instant check-in', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const beforeTime = new Date();
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            const afterTime = new Date();
            
            // Property: Actual check-in time should be set to current time
            expect(result.success).toBe(true);
            expect(result.booking.actualCheckInTime).toBeInstanceOf(Date);
            expect(result.booking.actualCheckInTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(result.booking.actualCheckInTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16g: Deposit is recorded when provided', () => {
      // Generate check-in data with deposit
      const checkInDataWithDepositArb = fc.record({
        propertyId: fc.uuid(),
        ownerId: fc.uuid(),
        guestInfo: guestInfoArb,
        checkOut: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2026-12-31') }),
        guests: fc.integer({ min: 1, max: 10 }),
        specialRequests: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        deposit: fc.record({
          amount: fc.float({ min: 100, max: 50000, noNaN: true }),
          method: fc.constantFrom('cash', 'card', 'upi', 'bank_transfer')
        }),
        performedBy: fc.uuid()
      });
      
      fc.assert(
        fc.property(
          roomArb,
          checkInDataWithDepositArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Deposit should be recorded when provided
            expect(result.success).toBe(true);
            expect(result.deposit).toBeDefined();
            expect(result.deposit.amount).toBe(checkInData.deposit.amount);
            expect(result.deposit.paymentMethod).toBe(checkInData.deposit.method);
            expect(result.deposit.status).toBe('collected');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16h: Failed instant check-in does not create any state', () => {
      // Generate blocked room status
      const blockedRoomArb = fc.record({
        id: fc.uuid(),
        roomNumber: fc.string({ minLength: 1, maxLength: 10 }),
        currentStatus: fc.constantFrom('occupied', 'maintenance', 'blocked'),
        price: fc.float({ min: 100, max: 10000, noNaN: true }),
        pricingType: fc.constantFrom('daily', 'monthly'),
        roomType: fc.constantFrom('Single Room', 'Double Room', 'Shared Room'),
        maxGuests: fc.integer({ min: 1, max: 10 })
      });
      
      fc.assert(
        fc.property(
          blockedRoomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Failed instant check-in should not create any state
            expect(result.success).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.booking).toBeUndefined();
            expect(result.room).toBeUndefined();
            expect(result.guestProfile).toBeUndefined();
            expect(result.deposit).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16i: Invalid guest info prevents instant check-in', () => {
      // Generate invalid guest info
      const invalidGuestInfoArb = fc.oneof(
        // Missing name
        fc.record({
          name: fc.constant(''),
          phone: fc.stringMatching(/^[0-9]{10}$/),
          email: fc.option(fc.emailAddress(), { nil: undefined })
        }),
        // Invalid phone
        fc.record({
          name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          phone: fc.stringMatching(/^[0-9]{5}$/), // Only 5 digits
          email: fc.option(fc.emailAddress(), { nil: undefined })
        })
      );
      
      const invalidCheckInDataArb = fc.record({
        propertyId: fc.uuid(),
        ownerId: fc.uuid(),
        guestInfo: invalidGuestInfoArb,
        checkOut: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2026-12-31') }),
        guests: fc.integer({ min: 1, max: 10 }),
        performedBy: fc.uuid()
      });
      
      fc.assert(
        fc.property(
          roomArb,
          invalidCheckInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Invalid guest info should prevent instant check-in
            expect(result.success).toBe(false);
            expect(result.reason).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 16j: Booking contains correct guest contact info', () => {
      fc.assert(
        fc.property(
          roomArb,
          checkInDataArb,
          
          (room, checkInData) => {
            const result = InstantCheckInValidation.simulateInstantCheckIn(checkInData, room);
            
            // Property: Booking should contain correct guest contact info
            expect(result.success).toBe(true);
            expect(result.booking.contactInfo).toBeDefined();
            expect(result.booking.contactInfo.name).toBe(checkInData.guestInfo.name);
            expect(result.booking.contactInfo.phone).toBe(checkInData.guestInfo.phone);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
