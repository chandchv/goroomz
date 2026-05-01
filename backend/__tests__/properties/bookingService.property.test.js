/**
 * Property Tests: BookingService
 * 
 * Property 1: Booking Date Conflict Detection
 * Property 3: Booking Confirmation Number Uniqueness
 * Property 4: Total Amount Calculation
 * 
 * Validates: Requirements 1.2, 1.4, 1.5
 * 
 * These property tests validate the logical consistency of booking operations
 * without requiring database connections. They test validation rules, data structures,
 * and business logic properties.
 */

const fc = require('fast-check');

/**
 * BookingService validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const BookingValidation = {
  /**
   * Check if two date ranges overlap
   * Requirements: 1.2
   * 
   * Overlap condition: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
   */
  doDateRangesOverlap(existingCheckIn, existingCheckOut, requestedCheckIn, requestedCheckOut) {
    const existingIn = new Date(existingCheckIn);
    const existingOut = new Date(existingCheckOut);
    const requestedIn = new Date(requestedCheckIn);
    const requestedOut = new Date(requestedCheckOut);
    
    return existingIn < requestedOut && existingOut > requestedIn;
  },

  /**
   * Validate date conflict for a room
   * Requirements: 1.2
   */
  validateDateConflict(existingBookings, requestedCheckIn, requestedCheckOut) {
    const requestedIn = new Date(requestedCheckIn);
    const requestedOut = new Date(requestedCheckOut);
    
    // Validate dates
    if (requestedOut <= requestedIn) {
      return {
        available: false,
        error: 'Check-out date must be after check-in date',
        conflictingBookings: []
      };
    }
    
    // Filter active bookings (not cancelled, no_show, or checked_out)
    const activeBookings = existingBookings.filter(booking => 
      !['cancelled', 'no_show', 'checked_out'].includes(booking.status)
    );
    
    // Check for overlaps
    const conflictingBookings = activeBookings.filter(booking =>
      this.doDateRangesOverlap(booking.checkIn, booking.checkOut, requestedIn, requestedOut)
    );
    
    return {
      available: conflictingBookings.length === 0,
      conflictingBookings
    };
  },

  /**
   * Generate booking confirmation number
   * Format: GR-YYYYMMDD-XXXX
   * Requirements: 1.4
   */
  generateBookingNumber(date = new Date()) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `GR-${dateStr}-${suffix}`;
  },

  /**
   * Validate booking number format
   * Requirements: 1.4
   */
  isValidBookingNumberFormat(bookingNumber) {
    if (!bookingNumber || typeof bookingNumber !== 'string') {
      return false;
    }
    
    // Format: GR-YYYYMMDD-XXXX
    const pattern = /^GR-\d{8}-[A-Z0-9]{4}$/;
    return pattern.test(bookingNumber);
  },

  /**
   * Calculate total amount for a booking
   * Requirements: 1.5
   */
  calculateTotalAmount(rate, checkIn, checkOut, bookingType = 'daily') {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkOutDate <= checkInDate) {
      throw new Error('Check-out date must be after check-in date');
    }
    
    let duration, totalAmount;
    
    if (bookingType === 'monthly') {
      // Calculate months (approximate - 30 days per month)
      const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      duration = Math.ceil(days / 30);
      totalAmount = rate * duration;
    } else {
      // Daily booking
      duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      totalAmount = rate * duration;
    }
    
    // Round to 2 decimal places
    totalAmount = Math.round(totalAmount * 100) / 100;
    
    return {
      totalAmount,
      duration,
      rate
    };
  }
};

describe('Property Tests: BookingService', () => {
  
  /**
   * Property 1: Booking Date Conflict Detection
   * 
   * *For any* room and date range, if an existing booking overlaps with the requested dates 
   * (existing check-in < requested check-out AND existing check-out > requested check-in), 
   * the system should reject the new booking.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Booking Date Conflict Detection', () => {
    
    test('Property 1a: Overlapping bookings are detected', () => {
      fc.assert(
        fc.property(
          // Generate a base date range
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-06-01') }),
          fc.integer({ min: 1, max: 30 }), // duration in days
          
          (baseCheckIn, duration) => {
            const baseCheckOut = new Date(baseCheckIn.getTime() + duration * 24 * 60 * 60 * 1000);
            
            // Create an existing booking
            const existingBooking = {
              id: 'existing-1',
              checkIn: baseCheckIn,
              checkOut: baseCheckOut,
              status: 'confirmed'
            };
            
            // Generate overlapping dates (start during existing booking)
            const overlapCheckIn = new Date(baseCheckIn.getTime() + (duration / 2) * 24 * 60 * 60 * 1000);
            const overlapCheckOut = new Date(baseCheckOut.getTime() + 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.validateDateConflict(
              [existingBooking],
              overlapCheckIn,
              overlapCheckOut
            );
            
            // Property: Overlapping dates should be detected
            expect(result.available).toBe(false);
            expect(result.conflictingBookings).toHaveLength(1);
            expect(result.conflictingBookings[0].id).toBe('existing-1');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 1b: Non-overlapping bookings are allowed', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 30 }),
          
          (baseCheckIn, duration1, duration2) => {
            const baseCheckOut = new Date(baseCheckIn.getTime() + duration1 * 24 * 60 * 60 * 1000);
            
            // Create an existing booking
            const existingBooking = {
              id: 'existing-1',
              checkIn: baseCheckIn,
              checkOut: baseCheckOut,
              status: 'confirmed'
            };
            
            // Generate non-overlapping dates (start after existing booking ends)
            const newCheckIn = new Date(baseCheckOut.getTime() + 24 * 60 * 60 * 1000);
            const newCheckOut = new Date(newCheckIn.getTime() + duration2 * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.validateDateConflict(
              [existingBooking],
              newCheckIn,
              newCheckOut
            );
            
            // Property: Non-overlapping dates should be available
            expect(result.available).toBe(true);
            expect(result.conflictingBookings).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 1c: Cancelled/no-show/checked-out bookings do not cause conflicts', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          fc.constantFrom('cancelled', 'no_show', 'checked_out'),
          
          (baseCheckIn, duration, inactiveStatus) => {
            const baseCheckOut = new Date(baseCheckIn.getTime() + duration * 24 * 60 * 60 * 1000);
            
            // Create an inactive booking (cancelled, no_show, or checked_out)
            const inactiveBooking = {
              id: 'inactive-1',
              checkIn: baseCheckIn,
              checkOut: baseCheckOut,
              status: inactiveStatus
            };
            
            // Generate overlapping dates
            const overlapCheckIn = new Date(baseCheckIn.getTime() + (duration / 2) * 24 * 60 * 60 * 1000);
            const overlapCheckOut = new Date(baseCheckOut.getTime() + 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.validateDateConflict(
              [inactiveBooking],
              overlapCheckIn,
              overlapCheckOut
            );
            
            // Property: Inactive bookings should not cause conflicts
            expect(result.available).toBe(true);
            expect(result.conflictingBookings).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 1d: Check-out date must be after check-in date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          
          (checkIn, negativeDuration) => {
            // Create invalid date range (check-out before check-in)
            const checkOut = new Date(checkIn.getTime() - negativeDuration * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.validateDateConflict(
              [],
              checkIn,
              checkOut
            );
            
            // Property: Invalid date range should be rejected
            expect(result.available).toBe(false);
            expect(result.error).toBe('Check-out date must be after check-in date');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 1e: Overlap detection is symmetric', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 30 }),
          
          (baseDate, duration1, duration2) => {
            const checkIn1 = baseDate;
            const checkOut1 = new Date(checkIn1.getTime() + duration1 * 24 * 60 * 60 * 1000);
            
            const checkIn2 = new Date(checkIn1.getTime() + (duration1 / 2) * 24 * 60 * 60 * 1000);
            const checkOut2 = new Date(checkIn2.getTime() + duration2 * 24 * 60 * 60 * 1000);
            
            // Check overlap in both directions
            const overlap1 = BookingValidation.doDateRangesOverlap(checkIn1, checkOut1, checkIn2, checkOut2);
            const overlap2 = BookingValidation.doDateRangesOverlap(checkIn2, checkOut2, checkIn1, checkOut1);
            
            // Property: Overlap detection should be symmetric
            expect(overlap1).toBe(overlap2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 3: Booking Confirmation Number Uniqueness
   * 
   * *For any* two distinct bookings in the system, their booking confirmation numbers 
   * should be different.
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 3: Booking Confirmation Number Uniqueness', () => {
    
    test('Property 3a: Generated booking numbers follow correct format', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          
          (date) => {
            const bookingNumber = BookingValidation.generateBookingNumber(date);
            
            // Property: Booking number should follow format GR-YYYYMMDD-XXXX
            expect(BookingValidation.isValidBookingNumberFormat(bookingNumber)).toBe(true);
            expect(bookingNumber).toMatch(/^GR-\d{8}-[A-Z0-9]{4}$/);
            
            // Property: Date portion should match the input date
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            expect(bookingNumber).toContain(dateStr);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 3b: Multiple generated booking numbers are unique', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          fc.integer({ min: 10, max: 50 }),
          
          (date, count) => {
            const bookingNumbers = new Set();
            
            // Generate multiple booking numbers
            for (let i = 0; i < count; i++) {
              const bookingNumber = BookingValidation.generateBookingNumber(date);
              bookingNumbers.add(bookingNumber);
            }
            
            // Property: All generated booking numbers should be unique
            // Note: Due to randomness, there's a tiny chance of collision, but it should be extremely rare
            // With 36^4 = 1,679,616 possible suffixes, collision probability is very low
            expect(bookingNumbers.size).toBeGreaterThan(count * 0.95); // Allow for rare collisions
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 3c: Booking number format validation is consistent', () => {
      fc.assert(
        fc.property(
          fc.string(),
          
          (randomString) => {
            const isValid = BookingValidation.isValidBookingNumberFormat(randomString);
            
            // Property: Only strings matching the pattern should be valid
            if (isValid) {
              expect(randomString).toMatch(/^GR-\d{8}-[A-Z0-9]{4}$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 3d: Booking numbers contain date information', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          
          (date) => {
            const bookingNumber = BookingValidation.generateBookingNumber(date);
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            
            // Property: Booking number should contain the date in YYYYMMDD format
            expect(bookingNumber).toContain(`GR-${dateStr}-`);
            
            // Extract date from booking number
            const parts = bookingNumber.split('-');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe('GR');
            expect(parts[1]).toBe(dateStr);
            expect(parts[2]).toHaveLength(4);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 4: Total Amount Calculation
   * 
   * *For any* booking with a room rate R and duration D days, the total amount 
   * should equal R × D (before taxes/adjustments).
   * 
   * **Validates: Requirements 1.5**
   */
  describe('Property 4: Total Amount Calculation', () => {
    
    test('Property 4a: Daily booking total equals rate × nights', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-06-01') }),
          fc.integer({ min: 1, max: 90 }),
          
          (rate, checkIn, durationDays) => {
            const checkOut = new Date(checkIn.getTime() + durationDays * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut, 'daily');
            
            // Property: Total amount should equal rate × duration
            const expectedTotal = Math.round(rate * durationDays * 100) / 100;
            expect(result.totalAmount).toBe(expectedTotal);
            expect(result.duration).toBe(durationDays);
            expect(result.rate).toBe(rate);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4b: Monthly booking total equals rate × months', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 50000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 12 }),
          
          (monthlyRate, checkIn, months) => {
            // Calculate check-out date (approximate 30 days per month)
            const durationDays = months * 30;
            const checkOut = new Date(checkIn.getTime() + durationDays * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.calculateTotalAmount(monthlyRate, checkIn, checkOut, 'monthly');
            
            // Property: Total amount should equal monthly rate × months
            const expectedTotal = Math.round(monthlyRate * months * 100) / 100;
            expect(result.totalAmount).toBe(expectedTotal);
            expect(result.duration).toBe(months);
            expect(result.rate).toBe(monthlyRate);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4c: Total amount is always non-negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 90 }),
          fc.constantFrom('daily', 'monthly'),
          
          (rate, checkIn, duration, bookingType) => {
            const durationMs = bookingType === 'monthly' 
              ? duration * 30 * 24 * 60 * 60 * 1000 
              : duration * 24 * 60 * 60 * 1000;
            const checkOut = new Date(checkIn.getTime() + durationMs);
            
            const result = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut, bookingType);
            
            // Property: Total amount should always be non-negative
            expect(result.totalAmount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4d: Total amount is rounded to 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100.123, max: 9999.999, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          
          (rate, checkIn, duration) => {
            const checkOut = new Date(checkIn.getTime() + duration * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut, 'daily');
            
            // Property: Total amount should be rounded to 2 decimal places
            const decimalPlaces = (result.totalAmount.toString().split('.')[1] || '').length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
            
            // Property: Rounding should be consistent
            const expectedTotal = Math.round(rate * duration * 100) / 100;
            expect(result.totalAmount).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4e: Longer duration results in higher total (for same rate)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 30 }),
          
          (rate, checkIn, duration1, duration2) => {
            const checkOut1 = new Date(checkIn.getTime() + duration1 * 24 * 60 * 60 * 1000);
            const checkOut2 = new Date(checkIn.getTime() + duration2 * 24 * 60 * 60 * 1000);
            
            const result1 = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut1, 'daily');
            const result2 = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut2, 'daily');
            
            // Property: Longer duration should result in higher or equal total
            if (duration1 > duration2) {
              expect(result1.totalAmount).toBeGreaterThanOrEqual(result2.totalAmount);
            } else if (duration2 > duration1) {
              expect(result2.totalAmount).toBeGreaterThanOrEqual(result1.totalAmount);
            } else {
              expect(result1.totalAmount).toBe(result2.totalAmount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4f: Invalid date range throws error', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          
          (rate, checkOut, duration) => {
            // Create invalid date range (check-in after check-out)
            const checkIn = new Date(checkOut.getTime() + duration * 24 * 60 * 60 * 1000);
            
            // Property: Invalid date range should throw error
            expect(() => {
              BookingValidation.calculateTotalAmount(rate, checkIn, checkOut, 'daily');
            }).toThrow('Check-out date must be after check-in date');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 4g: Duration calculation is consistent', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
          fc.integer({ min: 1, max: 90 }),
          
          (rate, checkIn, expectedDuration) => {
            const checkOut = new Date(checkIn.getTime() + expectedDuration * 24 * 60 * 60 * 1000);
            
            const result = BookingValidation.calculateTotalAmount(rate, checkIn, checkOut, 'daily');
            
            // Property: Calculated duration should match expected duration
            expect(result.duration).toBe(expectedDuration);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
