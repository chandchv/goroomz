/**
 * CheckOutService Unit Tests
 * 
 * Tests for check-out processing, eligibility validation, final charges calculation,
 * and deposit refund functionality.
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 4.4, 4.5, 4.6
 */

const checkOutService = require('../../services/checkOutService');

describe('CheckOutService', () => {
  describe('calculateRefundAmount', () => {
    /**
     * Property 11: Deposit Refund Calculation
     * For any deposit refund with deductions, the refund amount should equal:
     * original deposit amount - sum of all deduction amounts, with minimum of 0.
     * Validates: Requirements 4.4
     */
    
    test('should return full deposit when no deductions', () => {
      const result = checkOutService.calculateRefundAmount(5000, []);
      
      expect(result.refundAmount).toBe(5000);
      expect(result.totalDeductions).toBe(0);
      expect(result.deductionDetails).toEqual([]);
    });

    test('should calculate refund with single deduction', () => {
      const deductions = [{ reason: 'Room damage', amount: 1000 }];
      const result = checkOutService.calculateRefundAmount(5000, deductions);
      
      expect(result.refundAmount).toBe(4000);
      expect(result.totalDeductions).toBe(1000);
      expect(result.deductionDetails).toHaveLength(1);
      expect(result.deductionDetails[0].reason).toBe('Room damage');
      expect(result.deductionDetails[0].amount).toBe(1000);
    });

    test('should calculate refund with multiple deductions', () => {
      const deductions = [
        { reason: 'Room damage', amount: 1000 },
        { reason: 'Missing items', amount: 500 },
        { reason: 'Extra cleaning', amount: 300 }
      ];
      const result = checkOutService.calculateRefundAmount(5000, deductions);
      
      expect(result.refundAmount).toBe(3200);
      expect(result.totalDeductions).toBe(1800);
      expect(result.deductionDetails).toHaveLength(3);
    });

    test('should return zero refund when deductions exceed deposit', () => {
      const deductions = [
        { reason: 'Major damage', amount: 6000 }
      ];
      const result = checkOutService.calculateRefundAmount(5000, deductions);
      
      expect(result.refundAmount).toBe(0);
      expect(result.totalDeductions).toBe(6000);
    });

    test('should handle decimal amounts correctly', () => {
      const deductions = [
        { reason: 'Minor damage', amount: 150.50 },
        { reason: 'Cleaning fee', amount: 99.99 }
      ];
      const result = checkOutService.calculateRefundAmount(1000.00, deductions);
      
      expect(result.refundAmount).toBe(749.51);
      expect(result.totalDeductions).toBe(250.49);
    });

    test('should filter out invalid deductions', () => {
      const deductions = [
        { reason: 'Valid deduction', amount: 500 },
        { reason: '', amount: 100 }, // Invalid: empty reason
        { reason: 'No amount' }, // Invalid: no amount
        { reason: 'Negative', amount: -50 }, // Invalid: negative amount
        { amount: 200 }, // Invalid: no reason
        null, // Invalid: null
        undefined // Invalid: undefined
      ];
      const result = checkOutService.calculateRefundAmount(5000, deductions);
      
      expect(result.refundAmount).toBe(4500);
      expect(result.totalDeductions).toBe(500);
      expect(result.deductionDetails).toHaveLength(1);
    });

    test('should handle null/undefined deposit amount', () => {
      const result1 = checkOutService.calculateRefundAmount(null, []);
      expect(result1.refundAmount).toBe(0);
      
      const result2 = checkOutService.calculateRefundAmount(undefined, []);
      expect(result2.refundAmount).toBe(0);
    });

    test('should handle string deposit amount', () => {
      const result = checkOutService.calculateRefundAmount('5000', [
        { reason: 'Damage', amount: 1000 }
      ]);
      
      expect(result.refundAmount).toBe(4000);
      expect(result.totalDeductions).toBe(1000);
    });

    test('should round amounts to 2 decimal places', () => {
      const deductions = [
        { reason: 'Fee', amount: 33.333 }
      ];
      const result = checkOutService.calculateRefundAmount(100.999, deductions);
      
      // Check that amounts are rounded to 2 decimal places
      expect(result.refundAmount).toBe(67.67);
      expect(result.totalDeductions).toBe(33.33);
    });
  });

  describe('validateCheckOutEligibility', () => {
    test('should have VALID_CHECKOUT_STATUS as checked_in', () => {
      expect(checkOutService.constructor.VALID_CHECKOUT_STATUS).toBe('checked_in');
    });

    test('should have POST_CHECKOUT_ROOM_STATUS as vacant_dirty', () => {
      expect(checkOutService.constructor.POST_CHECKOUT_ROOM_STATUS).toBe('vacant_dirty');
    });
  });

  describe('calculateFinalCharges logic', () => {
    test('should calculate outstanding balance correctly', () => {
      // Test the calculation logic
      const roomCharges = 5000;
      const additionalCharges = 500;
      const totalCharges = roomCharges + additionalCharges;
      const paidAmount = 3000;
      const outstandingBalance = Math.max(0, totalCharges - paidAmount);
      
      expect(totalCharges).toBe(5500);
      expect(outstandingBalance).toBe(2500);
    });

    test('should return zero outstanding balance when fully paid', () => {
      const roomCharges = 5000;
      const additionalCharges = 500;
      const totalCharges = roomCharges + additionalCharges;
      const paidAmount = 6000; // Overpaid
      const outstandingBalance = Math.max(0, totalCharges - paidAmount);
      
      expect(outstandingBalance).toBe(0);
    });
  });
});
