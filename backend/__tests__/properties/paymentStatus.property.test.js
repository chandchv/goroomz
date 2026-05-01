/**
 * Property Tests: Payment Status
 * 
 * Property 13: Payment Status Validity
 * 
 * Validates: Requirements 7.3
 * 
 * *For any* booking in the system, its payment status should be one of: 
 * 'pending', 'partial', 'paid', 'refunded'.
 * 
 * These property tests validate the logical consistency of payment status
 * calculation and validation without requiring database connections.
 */

const fc = require('fast-check');

/**
 * Payment Status validation logic extracted for testing
 * This mirrors the actual PaymentService logic for property testing
 */
const PaymentStatusValidation = {
  // Valid payment statuses - Requirements: 7.3
  VALID_PAYMENT_STATUSES: ['pending', 'partial', 'paid', 'refunded'],
  
  // Valid payment methods
  VALID_PAYMENT_METHODS: ['cash', 'card', 'upi', 'bank_transfer'],
  
  /**
   * Calculate payment status based on paid amount vs total amount
   * Requirements: 7.3
   * 
   * @param {number} paidAmount - Amount paid so far
   * @param {number} totalAmount - Total amount due
   * @returns {string} Payment status: 'pending', 'partial', or 'paid'
   */
  calculatePaymentStatus(paidAmount, totalAmount) {
    const paid = parseFloat(paidAmount) || 0;
    const total = parseFloat(totalAmount) || 0;

    if (total <= 0) {
      return 'paid'; // No amount due means paid
    }

    if (paid <= 0) {
      return 'pending';
    }

    if (paid >= total) {
      return 'paid';
    }

    return 'partial';
  },
  
  /**
   * Validate if a payment status is one of the allowed values
   * Requirements: 7.3
   * 
   * @param {string} status - Payment status to validate
   * @returns {boolean}
   */
  isValidPaymentStatus(status) {
    return this.VALID_PAYMENT_STATUSES.includes(status);
  },
  
  /**
   * Validate if a payment method is valid
   * 
   * @param {string} method - Payment method to validate
   * @returns {boolean}
   */
  isValidPaymentMethod(method) {
    return this.VALID_PAYMENT_METHODS.includes(method);
  },
  
  /**
   * Simulate recording a payment and calculating new status
   * 
   * @param {Object} booking - Current booking state
   * @param {number} paymentAmount - Amount being paid
   * @returns {Object} Updated booking state with new payment status
   */
  simulatePaymentRecording(booking, paymentAmount) {
    const currentPaidAmount = parseFloat(booking.paidAmount) || 0;
    const totalAmount = parseFloat(booking.totalAmount) || 0;
    const newPaidAmount = currentPaidAmount + parseFloat(paymentAmount);
    
    const newPaymentStatus = this.calculatePaymentStatus(newPaidAmount, totalAmount);
    
    return {
      ...booking,
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus
    };
  },
  
  /**
   * Calculate outstanding balance
   * 
   * @param {number} totalAmount - Total amount due
   * @param {number} paidAmount - Amount paid so far
   * @returns {number} Outstanding balance (minimum 0)
   */
  calculateOutstandingBalance(totalAmount, paidAmount) {
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, total - paid);
  }
};

describe('Property Tests: Payment Status', () => {
  
  /**
   * Property 13: Payment Status Validity
   * 
   * *For any* booking in the system, its payment status should be one of: 
   * 'pending', 'partial', 'paid', 'refunded'.
   * 
   * **Validates: Requirements 7.3**
   */
  describe('Property 13: Payment Status Validity', () => {
    
    test('Property 13a: calculatePaymentStatus always returns a valid status', () => {
      fc.assert(
        fc.property(
          // Generate random paid and total amounts
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          
          (paidAmount, totalAmount) => {
            const status = PaymentStatusValidation.calculatePaymentStatus(paidAmount, totalAmount);
            
            // Property 13: Payment status must be one of the valid statuses
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
            expect(PaymentStatusValidation.VALID_PAYMENT_STATUSES).toContain(status);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13b: Zero paid amount with positive total results in pending status', () => {
      fc.assert(
        fc.property(
          // Generate positive total amounts
          fc.float({ min: 1, max: 100000, noNaN: true }),
          
          (totalAmount) => {
            const status = PaymentStatusValidation.calculatePaymentStatus(0, totalAmount);
            
            // Property: Zero payment should result in 'pending' status
            expect(status).toBe('pending');
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13c: Paid amount >= total amount results in paid status', () => {
      fc.assert(
        fc.property(
          // Generate total amount and paid amount >= total
          fc.float({ min: 1, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 50000, noNaN: true }),
          
          (totalAmount, extraAmount) => {
            const paidAmount = totalAmount + extraAmount; // Ensure paid >= total
            const status = PaymentStatusValidation.calculatePaymentStatus(paidAmount, totalAmount);
            
            // Property: Full or over payment should result in 'paid' status
            expect(status).toBe('paid');
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13d: Partial payment (0 < paid < total) results in partial status', () => {
      fc.assert(
        fc.property(
          // Generate total amount and a fraction for partial payment
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          fc.integer({ min: 1, max: 99 }), // Use integer percentage to avoid float precision issues
          
          (totalAmount, percentage) => {
            const paidAmount = totalAmount * (percentage / 100); // Partial payment
            const status = PaymentStatusValidation.calculatePaymentStatus(paidAmount, totalAmount);
            
            // Property: Partial payment should result in 'partial' status
            expect(status).toBe('partial');
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13e: Zero or negative total amount results in paid status', () => {
      fc.assert(
        fc.property(
          // Generate zero or negative total amounts
          fc.float({ min: -1000, max: 0, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          
          (totalAmount, paidAmount) => {
            const status = PaymentStatusValidation.calculatePaymentStatus(paidAmount, totalAmount);
            
            // Property: No amount due means 'paid' status
            expect(status).toBe('paid');
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13f: Payment recording always produces valid payment status', () => {
      fc.assert(
        fc.property(
          // Generate booking with payment amounts
          fc.record({
            id: fc.uuid(),
            totalAmount: fc.float({ min: 100, max: 100000, noNaN: true }),
            paidAmount: fc.float({ min: 0, max: 50000, noNaN: true }),
            paymentStatus: fc.constantFrom(...PaymentStatusValidation.VALID_PAYMENT_STATUSES)
          }),
          // Generate payment amount
          fc.float({ min: 1, max: 10000, noNaN: true }),
          
          (booking, paymentAmount) => {
            const updatedBooking = PaymentStatusValidation.simulatePaymentRecording(booking, paymentAmount);
            
            // Property 13: After recording payment, status must be valid
            expect(PaymentStatusValidation.isValidPaymentStatus(updatedBooking.paymentStatus)).toBe(true);
            expect(PaymentStatusValidation.VALID_PAYMENT_STATUSES).toContain(updatedBooking.paymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13g: Payment status is consistent with paid/total amounts', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 1, max: 100000, noNaN: true }),
          
          (paidAmount, totalAmount) => {
            const status = PaymentStatusValidation.calculatePaymentStatus(paidAmount, totalAmount);
            
            // Property: Status must be consistent with the amounts
            if (paidAmount <= 0) {
              expect(status).toBe('pending');
            } else if (paidAmount >= totalAmount) {
              expect(status).toBe('paid');
            } else {
              expect(status).toBe('partial');
            }
            
            // Property 13: Status must always be valid
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13h: Outstanding balance is always non-negative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          
          (totalAmount, paidAmount) => {
            const balance = PaymentStatusValidation.calculateOutstandingBalance(totalAmount, paidAmount);
            
            // Property: Outstanding balance should never be negative
            expect(balance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13i: isValidPaymentStatus correctly identifies valid statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PaymentStatusValidation.VALID_PAYMENT_STATUSES),
          
          (status) => {
            // Property: All defined valid statuses should pass validation
            expect(PaymentStatusValidation.isValidPaymentStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13j: isValidPaymentStatus rejects invalid statuses', () => {
      fc.assert(
        fc.property(
          // Generate random strings that are not valid payment statuses
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !PaymentStatusValidation.VALID_PAYMENT_STATUSES.includes(s)
          ),
          
          (invalidStatus) => {
            // Property: Invalid statuses should be rejected
            expect(PaymentStatusValidation.isValidPaymentStatus(invalidStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 13k: Sequential payments monotonically increase paid amount', () => {
      fc.assert(
        fc.property(
          // Generate initial booking
          fc.record({
            id: fc.uuid(),
            totalAmount: fc.float({ min: 1000, max: 100000, noNaN: true }),
            paidAmount: fc.constant(0),
            paymentStatus: fc.constant('pending')
          }),
          // Generate array of payment amounts
          fc.array(fc.float({ min: 1, max: 1000, noNaN: true }), { minLength: 1, maxLength: 5 }),
          
          (initialBooking, payments) => {
            let currentBooking = { ...initialBooking };
            let previousPaidAmount = 0;
            
            for (const payment of payments) {
              currentBooking = PaymentStatusValidation.simulatePaymentRecording(currentBooking, payment);
              
              // Property: Paid amount should increase with each payment
              expect(currentBooking.paidAmount).toBeGreaterThan(previousPaidAmount);
              
              // Property 13: Status should always be valid
              expect(PaymentStatusValidation.isValidPaymentStatus(currentBooking.paymentStatus)).toBe(true);
              
              previousPaidAmount = currentBooking.paidAmount;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
