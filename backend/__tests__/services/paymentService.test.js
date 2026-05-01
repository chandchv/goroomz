/**
 * PaymentService Unit Tests
 * 
 * Tests for payment status tracking, recording payments, and calculating payment status.
 * Requirements: 7.1, 7.2, 7.3
 */

const paymentService = require('../../services/paymentService');

describe('PaymentService', () => {
  describe('calculatePaymentStatus', () => {
    /**
     * Property 13: Payment Status Validity
     * For any booking in the system, its payment status should be one of:
     * 'pending', 'partial', 'paid', 'refunded'.
     * Validates: Requirements 7.3
     */
    
    test('should return "pending" when no payment made', () => {
      const status = paymentService.calculatePaymentStatus(0, 5000);
      expect(status).toBe('pending');
    });

    test('should return "pending" when paid amount is negative or zero', () => {
      expect(paymentService.calculatePaymentStatus(-100, 5000)).toBe('pending');
      expect(paymentService.calculatePaymentStatus(0, 5000)).toBe('pending');
    });

    test('should return "partial" when partially paid', () => {
      const status = paymentService.calculatePaymentStatus(2500, 5000);
      expect(status).toBe('partial');
    });

    test('should return "paid" when fully paid', () => {
      const status = paymentService.calculatePaymentStatus(5000, 5000);
      expect(status).toBe('paid');
    });

    test('should return "paid" when overpaid', () => {
      const status = paymentService.calculatePaymentStatus(6000, 5000);
      expect(status).toBe('paid');
    });

    test('should return "paid" when total amount is zero', () => {
      const status = paymentService.calculatePaymentStatus(0, 0);
      expect(status).toBe('paid');
    });

    test('should return "paid" when total amount is negative', () => {
      const status = paymentService.calculatePaymentStatus(0, -100);
      expect(status).toBe('paid');
    });

    test('should handle string inputs', () => {
      expect(paymentService.calculatePaymentStatus('2500', '5000')).toBe('partial');
      expect(paymentService.calculatePaymentStatus('5000', '5000')).toBe('paid');
      expect(paymentService.calculatePaymentStatus('0', '5000')).toBe('pending');
    });

    test('should handle null/undefined inputs', () => {
      expect(paymentService.calculatePaymentStatus(null, 5000)).toBe('pending');
      expect(paymentService.calculatePaymentStatus(undefined, 5000)).toBe('pending');
      expect(paymentService.calculatePaymentStatus(2500, null)).toBe('paid');
      expect(paymentService.calculatePaymentStatus(2500, undefined)).toBe('paid');
    });

    test('should handle decimal amounts', () => {
      expect(paymentService.calculatePaymentStatus(2500.50, 5000.00)).toBe('partial');
      expect(paymentService.calculatePaymentStatus(5000.00, 5000.00)).toBe('paid');
      expect(paymentService.calculatePaymentStatus(4999.99, 5000.00)).toBe('partial');
    });
  });

  describe('isValidPaymentStatus', () => {
    test('should return true for valid payment statuses', () => {
      expect(paymentService.isValidPaymentStatus('pending')).toBe(true);
      expect(paymentService.isValidPaymentStatus('partial')).toBe(true);
      expect(paymentService.isValidPaymentStatus('paid')).toBe(true);
      expect(paymentService.isValidPaymentStatus('refunded')).toBe(true);
    });

    test('should return false for invalid payment statuses', () => {
      expect(paymentService.isValidPaymentStatus('invalid')).toBe(false);
      expect(paymentService.isValidPaymentStatus('completed')).toBe(false);
      expect(paymentService.isValidPaymentStatus('')).toBe(false);
      expect(paymentService.isValidPaymentStatus(null)).toBe(false);
      expect(paymentService.isValidPaymentStatus(undefined)).toBe(false);
    });
  });

  describe('PAYMENT_STATUSES', () => {
    test('should contain all valid payment statuses', () => {
      const statuses = paymentService.constructor.PAYMENT_STATUSES;
      expect(statuses).toContain('pending');
      expect(statuses).toContain('partial');
      expect(statuses).toContain('paid');
      expect(statuses).toContain('refunded');
      expect(statuses).toHaveLength(4);
    });
  });

  describe('PAYMENT_METHODS', () => {
    test('should contain all valid payment methods', () => {
      const methods = paymentService.constructor.PAYMENT_METHODS;
      expect(methods).toContain('cash');
      expect(methods).toContain('card');
      expect(methods).toContain('upi');
      expect(methods).toContain('bank_transfer');
      expect(methods).toHaveLength(4);
    });
  });
});
