/**
 * Payment Service
 * 
 * Handles payment status tracking, recording payments, and calculating payment status.
 * Requirements: 7.1, 7.2, 7.3
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const BookingAuditLog = require('../models/BookingAuditLog');

class PaymentService {
  /**
   * Valid payment statuses
   */
  static PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

  /**
   * Valid payment methods
   */
  static PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer'];

  /**
   * Calculate payment status based on paid amount vs total amount
   * Requirements: 7.3
   * 
   * @param {number} paidAmount - Amount paid so far
   * @param {number} totalAmount - Total amount due
   * @returns {string} Payment status: 'pending' or 'paid'
   */
  calculatePaymentStatus(paidAmount, totalAmount) {
    const paid = parseFloat(paidAmount) || 0;
    const total = parseFloat(totalAmount) || 0;

    if (total <= 0) {
      return 'paid'; // No amount due means paid
    }

    if (paid >= total) {
      return 'paid';
    }

    return 'pending';
  }

  /**
   * Get outstanding balance for a booking
   * Requirements: 7.1, 7.2
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<{totalAmount: number, paidAmount: number, outstandingBalance: number, paymentStatus: string}>}
   */
  async getOutstandingBalance(bookingId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const totalAmount = parseFloat(booking.totalAmount) || 0;
    const paidAmount = parseFloat(booking.paidAmount) || 0;
    const outstandingBalance = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = this.calculatePaymentStatus(paidAmount, totalAmount);

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      paymentStatus
    };
  }

  /**
   * Record a payment for a booking and update payment status
   * Requirements: 7.1, 7.2
   * 
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.bookingId - Booking UUID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.paymentMethod - Payment method (cash, card, upi, bank_transfer)
   * @param {string} [paymentData.transactionReference] - Transaction reference number
   * @param {string} [paymentData.paymentType] - Payment type (booking, monthly_rent, security_deposit)
   * @param {string} paymentData.recordedBy - User ID recording the payment
   * @param {string} [paymentData.notes] - Payment notes
   * @returns {Promise<{payment: Payment, booking: Booking, paymentStatus: string}>}
   */
  async recordPayment(paymentData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        bookingId,
        amount,
        paymentMethod,
        transactionReference,
        paymentType = 'booking',
        recordedBy,
        notes
      } = paymentData;

      // Validate payment method
      if (!PaymentService.PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error(`Invalid payment method. Must be one of: ${PaymentService.PAYMENT_METHODS.join(', ')}`);
      }

      // Validate amount
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Payment amount must be a positive number');
      }

      // Get booking
      const booking = await Booking.findByPk(bookingId, { transaction });
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create payment record
      const payment = await Payment.create({
        bookingId,
        amount: paymentAmount,
        paymentDate: new Date(),
        paymentMethod,
        transactionReference,
        paymentType,
        status: 'completed',
        recordedBy,
        notes
      }, { transaction });

      // Update booking paid amount
      const currentPaidAmount = parseFloat(booking.paidAmount) || 0;
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const totalAmount = parseFloat(booking.totalAmount) || 0;

      // Calculate new payment status
      const newPaymentStatus = this.calculatePaymentStatus(newPaidAmount, totalAmount);

      // Update booking
      await booking.update({
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus
      }, { transaction });

      // Create audit log entry
      await BookingAuditLog.create({
        bookingId,
        action: 'payment_recorded',
        oldValue: {
          paidAmount: currentPaidAmount,
          paymentStatus: booking.paymentStatus
        },
        newValue: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          paymentId: payment.id,
          paymentAmount,
          paymentMethod
        },
        performedBy: recordedBy,
        notes: `Payment of ${paymentAmount} recorded via ${paymentMethod}`
      }, { transaction });

      await transaction.commit();

      // Reload booking with updated values
      const updatedBooking = await Booking.findByPk(bookingId);

      return {
        payment,
        booking: updatedBooking,
        paymentStatus: newPaymentStatus
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update booking payment status based on current paid amount
   * Requirements: 7.3
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<{booking: Booking, paymentStatus: string}>}
   */
  async updatePaymentStatus(bookingId, options = {}) {
    const { transaction } = options;

    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const totalAmount = parseFloat(booking.totalAmount) || 0;
    const paidAmount = parseFloat(booking.paidAmount) || 0;
    const newPaymentStatus = this.calculatePaymentStatus(paidAmount, totalAmount);

    if (booking.paymentStatus !== newPaymentStatus) {
      await booking.update({ paymentStatus: newPaymentStatus }, { transaction });
    }

    return {
      booking,
      paymentStatus: newPaymentStatus
    };
  }

  /**
   * Get all payments for a booking
   * Requirements: 7.2
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<Payment[]>}
   */
  async getPaymentsByBooking(bookingId) {
    return Payment.findAll({
      where: { bookingId },
      order: [['paymentDate', 'DESC']]
    });
  }

  /**
   * Check if booking has outstanding balance
   * Requirements: 7.6
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<{hasOutstandingBalance: boolean, outstandingBalance: number}>}
   */
  async hasOutstandingBalance(bookingId) {
    const { outstandingBalance } = await this.getOutstandingBalance(bookingId);
    return {
      hasOutstandingBalance: outstandingBalance > 0,
      outstandingBalance
    };
  }

  /**
   * Validate payment status is one of the allowed values
   * Requirements: 7.3
   * 
   * @param {string} status - Payment status to validate
   * @returns {boolean}
   */
  isValidPaymentStatus(status) {
    return PaymentService.PAYMENT_STATUSES.includes(status);
  }

  /**
   * Recalculate paid amount from all completed payments
   * Useful for reconciliation
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<{calculatedPaidAmount: number, storedPaidAmount: number, difference: number}>}
   */
  async reconcilePaidAmount(bookingId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const payments = await Payment.findAll({
      where: {
        bookingId,
        status: 'completed',
        paymentType: { [Op.ne]: 'security_deposit' } // Exclude deposits from paid amount
      }
    });

    const calculatedPaidAmount = payments.reduce(
      (sum, payment) => sum + parseFloat(payment.amount),
      0
    );

    const storedPaidAmount = parseFloat(booking.paidAmount) || 0;
    const difference = calculatedPaidAmount - storedPaidAmount;

    return {
      calculatedPaidAmount: Math.round(calculatedPaidAmount * 100) / 100,
      storedPaidAmount: Math.round(storedPaidAmount * 100) / 100,
      difference: Math.round(difference * 100) / 100
    };
  }
}

module.exports = new PaymentService();
