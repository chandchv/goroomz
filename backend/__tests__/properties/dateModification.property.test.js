/**
 * Property Tests: Date Modification Recalculation
 * 
 * Property 14: Date Modification Recalculation
 * 
 * Validates: Requirements 8.3
 * 
 * *For any* booking date modification, the total amount should be recalculated 
 * based on the new duration and room rate.
 * 
 * These property tests validate the logical consistency of date modification
 * and amount recalculation without requiring database connections.
 */

const fc = require('fast-check');

/**
 * Date Modification validation logic extracted for testing
 * This mirrors the actual BookingService logic for property testing
 */
const DateModificationValidation = {
  // Valid booking statuses that allow date modification
  MODIFIABLE_STATUSES: ['pending', 'confirmed'],
  
  // Valid booking types
  BOOKING_TYPES: ['daily', 'monthly'],
  
  /**
   * Calculate duration in days between two dates
   * 
   * @param {Date} checkIn - Check-in date
   * @param {Date} checkOut - Check-out date
   * @returns {number} Duration in days
   */
  calculateDurationDays(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },
  
  /**
   * Calculate duration in months between two dates
   * 
   * @param {Date} checkIn - Check-in date
   * @param {Date} checkOut - Check-out date
   * @returns {number} Duration in months (rounded up)
   */
  calculateDurationMonths(checkIn, checkOut) {
    const days = this.calculateDurationDays(checkIn, checkOut);
    return Math.ceil(days / 30);
  },
  
  /**
   * Calculate total amount based on duration and rate
   * Requirements: 8.3
   * 
   * @param {number} duration - Duration (days or months)
   * @param {number} rate - Rate per unit (daily or monthly)
   * @returns {number} Total amount rounded to 2 decimal places
   */
  calculateTotalAmount(duration, rate) {
    const total = duration * rate;
    return Math.round(total * 100) / 100;
  },
  
  /**
   * Recalculate booking amount after date modification
   * Requirements: 8.3
   * 
   * @param {Object} booking - Current booking state
   * @param {Date} newCheckIn - New check-in date
   * @param {Date} newCheckOut - New check-out date
   * @param {number} rate - Room rate (daily or monthly)
   * @returns {Object} Recalculation result
   */
  recalculateBookingAmount(booking, newCheckIn, newCheckOut, rate) {
    const bookingType = booking.bookingType || 'daily';
    
    let newDuration;
    if (bookingType === 'monthly') {
      newDuration = this.calculateDurationMonths(newCheckIn, newCheckOut);
    } else {
      newDuration = this.calculateDurationDays(newCheckIn, newCheckOut);
    }
    
    const newTotalAmount = this.calculateTotalAmount(newDuration, rate);
    
    return {
      newDuration,
      newTotalAmount,
      oldTotalAmount: parseFloat(booking.totalAmount) || 0,
      amountDifference: newTotalAmount - (parseFloat(booking.totalAmount) || 0),
      bookingType
    };
  },
  
  /**
   * Validate if dates are valid for modification
   * 
   * @param {Date} checkIn - Check-in date
   * @param {Date} checkOut - Check-out date
   * @returns {Object} Validation result
   */
  validateDates(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
    
    if (checkOutDate <= checkInDate) {
      return { valid: false, error: 'Check-out date must be after check-in date' };
    }
    
    return { valid: true };
  },
  
  /**
   * Check if booking status allows modification
   * 
   * @param {string} status - Current booking status
   * @returns {boolean}
   */
  canModifyDates(status) {
    return this.MODIFIABLE_STATUSES.includes(status);
  },
  
  /**
   * Simulate a complete date modification operation
   * 
   * @param {Object} booking - Current booking
   * @param {Date} newCheckIn - New check-in date
   * @param {Date} newCheckOut - New check-out date
   * @param {number} rate - Room rate
   * @returns {Object} Modified booking state
   */
  simulateDateModification(booking, newCheckIn, newCheckOut, rate) {
    // Validate dates
    const dateValidation = this.validateDates(newCheckIn, newCheckOut);
    if (!dateValidation.valid) {
      return { success: false, error: dateValidation.error };
    }
    
    // Check if status allows modification
    if (!this.canModifyDates(booking.status)) {
      return { 
        success: false, 
        error: `Cannot modify dates for booking with status: ${booking.status}` 
      };
    }
    
    // Recalculate amount
    const recalculation = this.recalculateBookingAmount(booking, newCheckIn, newCheckOut, rate);
    
    // Return modified booking
    return {
      success: true,
      booking: {
        ...booking,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        totalAmount: recalculation.newTotalAmount
      },
      recalculation
    };
  }
};

describe('Property Tests: Date Modification Recalculation', () => {
  
  /**
   * Property 14: Date Modification Recalculation
   * 
   * *For any* booking date modification, the total amount should be recalculated 
   * based on the new duration and room rate.
   * 
   * **Validates: Requirements 8.3**
   */
  describe('Property 14: Date Modification Recalculation', () => {
    
    // Helper to generate valid date pairs using integer-based approach to avoid NaN dates
    const validDatePairArb = fc.tuple(
      fc.integer({ min: 0, max: 1000 }), // Days from base date
      fc.integer({ min: 1, max: 365 })   // Duration in days
    ).map(([daysFromBase, duration]) => {
      const baseDate = new Date('2024-01-01');
      const checkIn = new Date(baseDate);
      checkIn.setDate(checkIn.getDate() + daysFromBase);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + duration);
      return { checkIn, checkOut, duration };
    });
    
    test('Property 14a: Total amount equals duration times rate for daily bookings', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          fc.float({ min: 100, max: 10000, noNaN: true }),
          
          ({ checkIn, checkOut, duration }, rate) => {
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: 0,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-02')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property 14: Amount should be recalculated based on new duration and rate
            expect(result.success).toBe(true);
            
            const expectedAmount = DateModificationValidation.calculateTotalAmount(duration, rate);
            expect(result.booking.totalAmount).toBeCloseTo(expectedAmount, 2);
            expect(result.recalculation.newDuration).toBe(duration);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14b: Total amount equals months times rate for monthly bookings', () => {
      fc.assert(
        fc.property(
          // Generate dates with at least 30 days difference for monthly bookings using integer-based approach
          fc.tuple(
            fc.integer({ min: 0, max: 500 }), // Days from base date
            fc.integer({ min: 30, max: 365 }) // Duration in days (at least 30 for monthly)
          ).map(([daysFromBase, daysToAdd]) => {
            const baseDate = new Date('2024-01-01');
            const checkIn = new Date(baseDate);
            checkIn.setDate(checkIn.getDate() + daysFromBase);
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + daysToAdd);
            return { checkIn, checkOut, days: daysToAdd };
          }),
          fc.float({ min: 5000, max: 50000, noNaN: true }), // Monthly rates
          
          ({ checkIn, checkOut, days }, monthlyRate) => {
            const booking = {
              id: 'test-booking-id',
              bookingType: 'monthly',
              status: 'pending',
              totalAmount: 0,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-02-01')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, monthlyRate
            );
            
            // Property 14: Amount should be recalculated based on months and monthly rate
            expect(result.success).toBe(true);
            
            const expectedMonths = Math.ceil(days / 30);
            const expectedAmount = DateModificationValidation.calculateTotalAmount(expectedMonths, monthlyRate);
            
            expect(result.booking.totalAmount).toBeCloseTo(expectedAmount, 2);
            expect(result.recalculation.newDuration).toBe(expectedMonths);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14c: Extending booking increases total amount proportionally', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }), // Days from base date
          fc.integer({ min: 1, max: 30 }), // Original duration
          fc.integer({ min: 1, max: 30 }), // Extension days
          fc.integer({ min: 100, max: 5000 }), // Use integer rate to avoid float precision issues
          
          (daysFromBase, originalDays, extensionDays, rate) => {
            const baseDate = new Date('2024-01-01');
            const checkIn = new Date(baseDate);
            checkIn.setDate(checkIn.getDate() + daysFromBase);
            
            const originalCheckOut = new Date(checkIn);
            originalCheckOut.setDate(originalCheckOut.getDate() + originalDays);
            
            const extendedCheckOut = new Date(originalCheckOut);
            extendedCheckOut.setDate(extendedCheckOut.getDate() + extensionDays);
            
            const originalAmount = DateModificationValidation.calculateTotalAmount(originalDays, rate);
            
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: originalAmount,
              checkIn: checkIn,
              checkOut: originalCheckOut
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, extendedCheckOut, rate
            );
            
            // Property 14: Extended booking should have higher amount
            expect(result.success).toBe(true);
            expect(result.booking.totalAmount).toBeGreaterThan(originalAmount);
            
            // Amount difference should equal extension days times rate (with tolerance for float precision)
            const expectedIncrease = DateModificationValidation.calculateTotalAmount(extensionDays, rate);
            expect(Math.abs(result.recalculation.amountDifference - expectedIncrease)).toBeLessThan(0.02);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14d: Shortening booking decreases total amount proportionally', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }), // Days from base date
          fc.integer({ min: 5, max: 30 }), // Original duration (at least 5 days)
          fc.integer({ min: 1, max: 4 }), // Days to shorten (less than original)
          fc.integer({ min: 100, max: 5000 }), // Use integer rate
          
          (daysFromBase, originalDays, daysToShorten, rate) => {
            const baseDate = new Date('2024-01-01');
            const checkIn = new Date(baseDate);
            checkIn.setDate(checkIn.getDate() + daysFromBase);
            
            const originalCheckOut = new Date(checkIn);
            originalCheckOut.setDate(originalCheckOut.getDate() + originalDays);
            
            const shortenedCheckOut = new Date(originalCheckOut);
            shortenedCheckOut.setDate(shortenedCheckOut.getDate() - daysToShorten);
            
            const originalAmount = DateModificationValidation.calculateTotalAmount(originalDays, rate);
            
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: originalAmount,
              checkIn: checkIn,
              checkOut: originalCheckOut
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, shortenedCheckOut, rate
            );
            
            // Property 14: Shortened booking should have lower amount
            expect(result.success).toBe(true);
            expect(result.booking.totalAmount).toBeLessThan(originalAmount);
            
            // Amount difference should be negative (reduction)
            expect(result.recalculation.amountDifference).toBeLessThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14e: Same dates result in same amount (idempotent)', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          fc.float({ min: 100, max: 5000, noNaN: true }),
          
          ({ checkIn, checkOut, duration }, rate) => {
            const originalAmount = DateModificationValidation.calculateTotalAmount(duration, rate);
            
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: originalAmount,
              checkIn: checkIn,
              checkOut: checkOut
            };
            
            // Modify with same dates
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property 14: Same dates should result in same amount
            expect(result.success).toBe(true);
            expect(result.booking.totalAmount).toBeCloseTo(originalAmount, 2);
            expect(result.recalculation.amountDifference).toBeCloseTo(0, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14f: Amount is always non-negative', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.constantFrom('daily', 'monthly'),
          
          ({ checkIn, checkOut }, rate, bookingType) => {
            const booking = {
              id: 'test-booking-id',
              bookingType: bookingType,
              status: 'pending',
              totalAmount: 1000,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-05')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property: Total amount should never be negative
            expect(result.success).toBe(true);
            expect(result.booking.totalAmount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14g: Duration calculation is consistent', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          
          ({ checkIn, checkOut, duration }) => {
            const calculatedDuration = DateModificationValidation.calculateDurationDays(checkIn, checkOut);
            
            // Property: Calculated duration should match expected duration
            expect(calculatedDuration).toBe(duration);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14h: Invalid date order is rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }), // Days from base date for checkOut
          fc.integer({ min: 1, max: 365 }), // Days to add to make checkIn after checkOut
          
          (daysFromBase, daysBack) => {
            const baseDate = new Date('2024-01-01');
            const checkOut = new Date(baseDate);
            checkOut.setDate(checkOut.getDate() + daysFromBase);
            
            // Create checkIn after checkOut (invalid)
            const checkIn = new Date(checkOut);
            checkIn.setDate(checkIn.getDate() + daysBack);
            
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: 1000,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-05')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, 100
            );
            
            // Property: Invalid date order should be rejected
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14i: Non-modifiable statuses are rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }), // Days from base date
          fc.integer({ min: 1, max: 30 }),  // Duration
          fc.constantFrom('checked_in', 'checked_out', 'cancelled', 'no_show'),
          fc.integer({ min: 100, max: 5000 }),
          
          (daysFromBase, duration, status, rate) => {
            const baseDate = new Date('2024-01-01');
            const checkIn = new Date(baseDate);
            checkIn.setDate(checkIn.getDate() + daysFromBase);
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + duration);
            
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: status,
              totalAmount: 1000,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-05')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property: Non-modifiable statuses should be rejected
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot modify dates');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14j: Modifiable statuses are accepted', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          fc.constantFrom('pending', 'confirmed'),
          fc.float({ min: 100, max: 5000, noNaN: true }),
          
          ({ checkIn, checkOut }, status, rate) => {
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: status,
              totalAmount: 1000,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-05')
            };
            
            const result = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property: Modifiable statuses should be accepted
            expect(result.success).toBe(true);
            expect(result.booking).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 14k: Amount recalculation is deterministic', () => {
      fc.assert(
        fc.property(
          validDatePairArb,
          fc.float({ min: 100, max: 5000, noNaN: true }),
          
          ({ checkIn, checkOut }, rate) => {
            const booking = {
              id: 'test-booking-id',
              bookingType: 'daily',
              status: 'confirmed',
              totalAmount: 500,
              checkIn: new Date('2024-01-01'),
              checkOut: new Date('2024-01-03')
            };
            
            // Run the same modification twice
            const result1 = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            const result2 = DateModificationValidation.simulateDateModification(
              booking, checkIn, checkOut, rate
            );
            
            // Property: Same inputs should produce same outputs
            expect(result1.success).toBe(result2.success);
            if (result1.success && result2.success) {
              expect(result1.booking.totalAmount).toBe(result2.booking.totalAmount);
              expect(result1.recalculation.newDuration).toBe(result2.recalculation.newDuration);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
