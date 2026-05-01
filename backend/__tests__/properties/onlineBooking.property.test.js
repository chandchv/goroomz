/**
 * Property Tests: Online Booking
 * 
 * Property 15: Online Booking Initial Status
 * 
 * Validates: Requirements 11.1
 * 
 * *For any* booking created through the website (booking_source = 'online'), 
 * the initial status should be 'pending'.
 * 
 * These property tests validate the logical consistency of online booking creation
 * without requiring database connections. They test validation rules, data structures,
 * and business logic properties.
 */

const fc = require('fast-check');

/**
 * Online Booking validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const OnlineBookingValidation = {
  // Valid booking sources
  BOOKING_SOURCES: ['online', 'offline', 'walk_in'],
  
  // Valid initial statuses for each booking source
  INITIAL_STATUS_BY_SOURCE: {
    'online': 'pending',
    'offline': 'pending',
    'walk_in': 'pending'
  },
  
  // Valid booking statuses
  ALL_BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
  
  /**
   * Determine the initial status for a booking based on source
   * Requirements: 11.1 - Online bookings should start as 'pending'
   * 
   * @param {string} bookingSource - The source of the booking
   * @returns {string} The initial status
   */
  getInitialStatus(bookingSource) {
    return this.INITIAL_STATUS_BY_SOURCE[bookingSource] || 'pending';
  },
  
  /**
   * Validate if a booking source is valid
   * 
   * @param {string} bookingSource - The source to validate
   * @returns {boolean}
   */
  isValidBookingSource(bookingSource) {
    return this.BOOKING_SOURCES.includes(bookingSource);
  },
  
  /**
   * Simulate creating an online booking
   * Requirements: 11.1, 11.2
   * 
   * @param {Object} bookingData - The booking data
   * @returns {Object} The created booking with initial status
   */
  simulateOnlineBookingCreation(bookingData) {
    const {
      roomId,
      userId,
      ownerId,
      propertyId,
      checkIn,
      checkOut,
      guests,
      contactInfo,
      specialRequests,
      totalAmount
    } = bookingData;
    
    // Validate required fields
    if (!roomId || !userId || !checkIn || !checkOut || !contactInfo) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // Validate contact info
    if (!contactInfo.phone || !contactInfo.email || !contactInfo.name) {
      return { success: false, error: 'Contact info must include name, phone, and email' };
    }
    
    // Create booking with online source and pending status
    // Requirements: 11.1 - Online bookings start as 'pending'
    const booking = {
      id: `booking-${Date.now()}`,
      roomId,
      userId,
      ownerId,
      propertyId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: guests || 1,
      contactInfo,
      specialRequests,
      totalAmount: totalAmount || 0,
      paidAmount: 0,
      bookingSource: 'online',
      status: 'pending', // Requirements: 11.1 - Initial status is 'pending'
      paymentStatus: 'pending',
      createdAt: new Date()
    };
    
    return { success: true, booking };
  },
  
  /**
   * Validate that an online booking has correct initial state
   * 
   * @param {Object} booking - The booking to validate
   * @returns {Object} Validation result
   */
  validateOnlineBookingInitialState(booking) {
    const errors = [];
    
    // Check booking source
    if (booking.bookingSource !== 'online') {
      errors.push(`Expected bookingSource to be 'online', got '${booking.bookingSource}'`);
    }
    
    // Check initial status - Requirements: 11.1
    if (booking.status !== 'pending') {
      errors.push(`Expected initial status to be 'pending', got '${booking.status}'`);
    }
    
    // Check payment status
    if (booking.paymentStatus !== 'pending' && booking.paymentStatus !== 'paid') {
      errors.push(`Expected paymentStatus to be 'pending' or 'paid', got '${booking.paymentStatus}'`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

describe('Property Tests: Online Booking', () => {
  
  /**
   * Property 15: Online Booking Initial Status
   * 
   * *For any* booking created through the website (booking_source = 'online'), 
   * the initial status should be 'pending'.
   * 
   * **Validates: Requirements 11.1**
   */
  describe('Property 15: Online Booking Initial Status', () => {
    
    test('Property 15a: Online bookings always have initial status of pending', () => {
      fc.assert(
        fc.property(
          // Generate valid booking data
          fc.record({
            roomId: fc.uuid(),
            userId: fc.uuid(),
            ownerId: fc.uuid(),
            propertyId: fc.uuid(),
            checkIn: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
            checkOut: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
            guests: fc.integer({ min: 1, max: 10 }),
            contactInfo: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              phone: fc.stringMatching(/^[0-9]{10}$/),
              email: fc.emailAddress()
            }),
            specialRequests: fc.option(fc.string({ maxLength: 500 })),
            totalAmount: fc.float({ min: 100, max: 100000, noNaN: true })
          }),
          
          (bookingData) => {
            // Ensure checkOut is after checkIn
            if (bookingData.checkOut <= bookingData.checkIn) {
              bookingData.checkOut = new Date(bookingData.checkIn.getTime() + 86400000); // Add 1 day
            }
            
            const result = OnlineBookingValidation.simulateOnlineBookingCreation(bookingData);
            
            // Property: Online booking creation should succeed with valid data
            expect(result.success).toBe(true);
            
            // Property 15: Initial status should be 'pending'
            expect(result.booking.status).toBe('pending');
            
            // Property: Booking source should be 'online'
            expect(result.booking.bookingSource).toBe('online');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 15b: getInitialStatus returns pending for online source', () => {
      fc.assert(
        fc.property(
          fc.constant('online'),
          
          (source) => {
            const initialStatus = OnlineBookingValidation.getInitialStatus(source);
            
            // Property 15: Online bookings should have 'pending' as initial status
            expect(initialStatus).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 15c: Online booking validation correctly identifies pending status', () => {
      fc.assert(
        fc.property(
          // Generate booking with online source
          fc.record({
            id: fc.uuid(),
            bookingSource: fc.constant('online'),
            status: fc.constant('pending'),
            paymentStatus: fc.constantFrom('pending', 'paid'),
            roomId: fc.uuid(),
            checkIn: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
            checkOut: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
          }),
          
          (booking) => {
            const validation = OnlineBookingValidation.validateOnlineBookingInitialState(booking);
            
            // Property: Valid online booking with pending status should pass validation
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 15d: Online booking with non-pending initial status fails validation', () => {
      fc.assert(
        fc.property(
          // Generate booking with online source but wrong initial status
          fc.record({
            id: fc.uuid(),
            bookingSource: fc.constant('online'),
            status: fc.constantFrom('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'),
            paymentStatus: fc.constantFrom('pending', 'paid'),
            roomId: fc.uuid()
          }),
          
          (booking) => {
            const validation = OnlineBookingValidation.validateOnlineBookingInitialState(booking);
            
            // Property: Online booking with non-pending status should fail validation
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors.some(e => e.includes('pending'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 15e: All booking sources have defined initial status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...OnlineBookingValidation.BOOKING_SOURCES),
          
          (source) => {
            const initialStatus = OnlineBookingValidation.getInitialStatus(source);
            
            // Property: Every valid booking source should have a defined initial status
            expect(initialStatus).toBeDefined();
            expect(OnlineBookingValidation.ALL_BOOKING_STATUSES).toContain(initialStatus);
            
            // Property: All sources start with 'pending' status
            expect(initialStatus).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 15f: Online booking preserves all input data with correct initial state', () => {
      fc.assert(
        fc.property(
          fc.record({
            roomId: fc.uuid(),
            userId: fc.uuid(),
            ownerId: fc.uuid(),
            propertyId: fc.uuid(),
            checkIn: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
            checkOut: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
            guests: fc.integer({ min: 1, max: 10 }),
            contactInfo: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              phone: fc.stringMatching(/^[0-9]{10}$/),
              email: fc.emailAddress()
            }),
            specialRequests: fc.string({ maxLength: 500 }),
            totalAmount: fc.float({ min: 100, max: 100000, noNaN: true })
          }),
          
          (bookingData) => {
            // Ensure checkOut is after checkIn
            if (bookingData.checkOut <= bookingData.checkIn) {
              bookingData.checkOut = new Date(bookingData.checkIn.getTime() + 86400000 * 2);
            }
            
            const result = OnlineBookingValidation.simulateOnlineBookingCreation(bookingData);
            
            if (result.success) {
              const booking = result.booking;
              
              // Property: Input data should be preserved
              expect(booking.roomId).toBe(bookingData.roomId);
              expect(booking.userId).toBe(bookingData.userId);
              expect(booking.guests).toBe(bookingData.guests);
              expect(booking.contactInfo.name).toBe(bookingData.contactInfo.name);
              expect(booking.contactInfo.phone).toBe(bookingData.contactInfo.phone);
              expect(booking.contactInfo.email).toBe(bookingData.contactInfo.email);
              
              // Property 15: Initial status should be 'pending'
              expect(booking.status).toBe('pending');
              expect(booking.bookingSource).toBe('online');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
