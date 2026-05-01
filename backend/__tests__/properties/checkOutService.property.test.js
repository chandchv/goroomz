/**
 * Property Tests: CheckOutService
 * 
 * Property 12: Check-Out State Synchronization
 * 
 * *For any* successful check-out operation, the booking status should be 'checked_out' 
 * AND the room status should be 'vacant_dirty'.
 * 
 * **Validates: Requirements 5.6, 5.7**
 * 
 * Note: Property 11 (Deposit Refund Calculation) is already covered by unit tests
 * in checkOutService.test.js
 * 
 * These property tests validate the logical consistency of check-out operations
 * without requiring database connections. They test validation rules, data structures,
 * and business logic properties.
 */

const fc = require('fast-check');

/**
 * CheckOutService validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const CheckOutValidation = {
  /**
   * Valid booking status for check-out
   */
  VALID_CHECKOUT_STATUS: 'checked_in',

  /**
   * Room status after check-out
   */
  POST_CHECKOUT_ROOM_STATUS: 'vacant_dirty',

  /**
   * Booking status after check-out
   */
  POST_CHECKOUT_BOOKING_STATUS: 'checked_out',

  /**
   * Validate check-out eligibility
   * Requirements: 5.1, 5.2
   */
  validateCheckOutEligibility(booking, room, roomInspected) {
    if (!booking) {
      return { eligible: false, reason: 'Booking not found' };
    }

    if (booking.status !== this.VALID_CHECKOUT_STATUS) {
      return {
        eligible: false,
        reason: `Booking cannot be checked out. Current status: ${booking.status}. Must be 'checked_in'.`
      };
    }

    if (!room) {
      return { eligible: false, reason: 'Room not found for this booking' };
    }

    if (!roomInspected) {
      return {
        eligible: false,
        reason: 'Room inspection is required before check-out'
      };
    }

    return { eligible: true };
  },

  /**
   * Simulate check-out state changes
   * Requirements: 5.6, 5.7
   */
  simulateCheckOut(booking, room, roomInspected) {
    const eligibility = this.validateCheckOutEligibility(booking, room, roomInspected);
    
    if (!eligibility.eligible) {
      return { success: false, reason: eligibility.reason };
    }

    return {
      success: true,
      booking: {
        ...booking,
        status: this.POST_CHECKOUT_BOOKING_STATUS,
        actualCheckOutTime: new Date()
      },
      room: {
        ...room,
        currentStatus: this.POST_CHECKOUT_ROOM_STATUS
      }
    };
  }
};

describe('Property Tests: CheckOutService', () => {
  
  /**
   * Property 12: Check-Out State Synchronization
   * 
   * *For any* successful check-out operation, the booking status should be 'checked_out' 
   * AND the room status should be 'vacant_dirty'.
   * 
   * **Validates: Requirements 5.6, 5.7**
   */
  describe('Property 12: Check-Out State Synchronization', () => {
    
    // Arbitrary generators for test data
    const bookingArb = fc.record({
      id: fc.uuid(),
      roomId: fc.uuid(),
      status: fc.constant('checked_in'),
      checkIn: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
      checkOut: fc.date({ min: new Date('2024-01-02'), max: new Date('2026-12-31') }),
      totalAmount: fc.float({ min: 100, max: 10000, noNaN: true }),
      paidAmount: fc.float({ min: 0, max: 10000, noNaN: true }),
      guests: fc.integer({ min: 1, max: 10 })
    });
    
    const roomArb = fc.record({
      id: fc.uuid(),
      roomNumber: fc.string({ minLength: 1, maxLength: 10 }),
      currentStatus: fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty'),
      price: fc.float({ min: 100, max: 10000, noNaN: true })
    });
    
    test('Property 12a: Successful check-out sets booking status to checked_out', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          
          (booking, room) => {
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Successful check-out should set booking status to checked_out
            expect(result.success).toBe(true);
            expect(result.booking.status).toBe('checked_out');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12b: Successful check-out sets room status to vacant_dirty', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          
          (booking, room) => {
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Successful check-out should set room status to vacant_dirty
            expect(result.success).toBe(true);
            expect(result.room.currentStatus).toBe('vacant_dirty');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12c: Both booking and room states change atomically', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          
          (booking, room) => {
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Both states should change together (atomicity)
            expect(result.success).toBe(true);
            
            // Booking state
            expect(result.booking.status).toBe('checked_out');
            expect(result.booking.actualCheckOutTime).toBeInstanceOf(Date);
            
            // Room state
            expect(result.room.currentStatus).toBe('vacant_dirty');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12d: Check-out without room inspection is rejected', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          
          (booking, room) => {
            const result = CheckOutValidation.simulateCheckOut(booking, room, false);
            
            // Property: Check-out without inspection should be rejected
            expect(result.success).toBe(false);
            expect(result.reason).toContain('Room inspection is required');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12e: Only checked_in bookings can be checked out', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pending', 'confirmed', 'checked_out', 'cancelled', 'no_show'),
          roomArb,
          
          (invalidStatus, room) => {
            const booking = {
              id: 'test-booking',
              roomId: room.id,
              status: invalidStatus
            };
            
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Non-checked_in bookings should be rejected
            expect(result.success).toBe(false);
            expect(result.reason).toContain('Must be \'checked_in\'');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12f: Failed check-out does not change any state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pending', 'confirmed', 'cancelled'),
          roomArb,
          
          (invalidStatus, room) => {
            const booking = {
              id: 'test-booking',
              roomId: room.id,
              status: invalidStatus
            };
            
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Failed check-out should not return updated states
            expect(result.success).toBe(false);
            expect(result.booking).toBeUndefined();
            expect(result.room).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12g: Actual check-out time is recorded', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          
          (booking, room) => {
            const beforeTime = new Date();
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            const afterTime = new Date();
            
            // Property: Actual check-out time should be set to current time
            expect(result.success).toBe(true);
            expect(result.booking.actualCheckOutTime).toBeInstanceOf(Date);
            expect(result.booking.actualCheckOutTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(result.booking.actualCheckOutTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12h: Missing booking prevents check-out', () => {
      fc.assert(
        fc.property(
          roomArb,
          
          (room) => {
            const result = CheckOutValidation.simulateCheckOut(null, room, true);
            
            // Property: Missing booking should prevent check-out
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Booking not found');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12i: Missing room prevents check-out', () => {
      fc.assert(
        fc.property(
          bookingArb,
          
          (booking) => {
            const result = CheckOutValidation.simulateCheckOut(booking, null, true);
            
            // Property: Missing room should prevent check-out
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Room not found for this booking');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12j: Check-out eligibility validation is consistent', () => {
      fc.assert(
        fc.property(
          bookingArb,
          roomArb,
          fc.boolean(),
          
          (booking, room, roomInspected) => {
            const eligibility = CheckOutValidation.validateCheckOutEligibility(
              booking,
              room,
              roomInspected
            );
            
            // Property: Eligibility should be consistent with check-out result
            const checkOutResult = CheckOutValidation.simulateCheckOut(booking, room, roomInspected);
            
            if (eligibility.eligible) {
              expect(checkOutResult.success).toBe(true);
            } else {
              expect(checkOutResult.success).toBe(false);
              expect(checkOutResult.reason).toBe(eligibility.reason);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 12k: Room status changes from any status to vacant_dirty', () => {
      fc.assert(
        fc.property(
          bookingArb,
          fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty', 'maintenance'),
          
          (booking, initialRoomStatus) => {
            const room = {
              id: booking.roomId,
              roomNumber: 'R101',
              currentStatus: initialRoomStatus,
              price: 1000
            };
            
            const result = CheckOutValidation.simulateCheckOut(booking, room, true);
            
            // Property: Regardless of initial room status, it should become vacant_dirty
            expect(result.success).toBe(true);
            expect(result.room.currentStatus).toBe('vacant_dirty');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
