/**
 * Audit Service
 * 
 * Comprehensive audit logging for booking status changes, payment transactions,
 * room status changes, and all modifications.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const BookingAuditLog = require('../models/BookingAuditLog');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

class AuditService {
  /**
   * Log a booking status change
   * Requirements: 10.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} performedBy - User ID who made the change
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logStatusChange(bookingId, oldStatus, newStatus, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;

    return BookingAuditLog.create({
      bookingId,
      action: 'status_changed',
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      performedBy,
      ipAddress,
      notes: notes || `Status changed from ${oldStatus} to ${newStatus}`
    }, { transaction });
  }

  /**
   * Log a payment transaction
   * Requirements: 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} paymentDetails - Payment details
   * @param {string} performedBy - User ID who recorded the payment
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logPaymentTransaction(bookingId, paymentDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { amount, method, transactionReference, paymentType, paymentId, oldPaidAmount, newPaidAmount } = paymentDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'payment_received',
      oldValue: oldPaidAmount !== undefined ? { paidAmount: oldPaidAmount } : null,
      newValue: {
        paymentId,
        amount,
        method,
        transactionReference,
        paymentType,
        paidAmount: newPaidAmount,
        timestamp: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || `Payment of ${amount} received via ${method}`
    }, { transaction });
  }

  /**
   * Log a payment refund
   * Requirements: 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} refundDetails - Refund details
   * @param {string} performedBy - User ID who processed the refund
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logPaymentRefund(bookingId, refundDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { amount, method, reason, originalPaymentId } = refundDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'payment_refunded',
      oldValue: { originalPaymentId },
      newValue: {
        refundAmount: amount,
        refundMethod: method,
        reason,
        timestamp: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || `Refund of ${amount} processed via ${method}. Reason: ${reason}`
    }, { transaction });
  }

  /**
   * Log a room status change
   * Requirements: 10.3
   * 
   * @param {string} roomId - Room UUID
   * @param {string} bookingId - Associated booking UUID (if any)
   * @param {string} oldStatus - Previous room status
   * @param {string} newStatus - New room status
   * @param {string} performedBy - User ID who made the change
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog|null>}
   */
  async logRoomStatusChange(roomId, bookingId, oldStatus, newStatus, performedBy, options = {}) {
    const { notes, ipAddress, transaction, reason } = options;

    // If no booking is associated, we can't log to BookingAuditLog
    // In a production system, you might have a separate RoomAuditLog table
    if (!bookingId) {
      console.log(`Room status change logged: Room ${roomId} changed from ${oldStatus} to ${newStatus}`);
      return null;
    }

    return BookingAuditLog.create({
      bookingId,
      action: 'room_status_changed',
      oldValue: { roomId, roomStatus: oldStatus },
      newValue: { roomId, roomStatus: newStatus },
      performedBy,
      ipAddress,
      notes: notes || reason || `Room status changed from ${oldStatus} to ${newStatus}`
    }, { transaction });
  }

  /**
   * Log a booking modification
   * Requirements: 10.4
   * 
   * @param {string} bookingId - Booking UUID
   * @param {string} modificationType - Type of modification
   * @param {Object} oldValues - Previous values
   * @param {Object} newValues - New values
   * @param {string} performedBy - User ID who made the modification
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logModification(bookingId, modificationType, oldValues, newValues, performedBy, options = {}) {
    const { notes, ipAddress, transaction, reason } = options;

    // Map modification type to action
    const actionMap = {
      'dates': 'dates_changed',
      'room': 'room_changed',
      'guest': 'modified',
      'amount': 'modified',
      'general': 'modified'
    };

    const action = actionMap[modificationType] || 'modified';

    return BookingAuditLog.create({
      bookingId,
      action,
      oldValue: oldValues,
      newValue: newValues,
      performedBy,
      ipAddress,
      notes: notes || reason || `Booking ${modificationType} modified`
    }, { transaction });
  }

  /**
   * Log check-in action
   * Requirements: 10.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} checkInDetails - Check-in details
   * @param {string} performedBy - User ID who processed check-in
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logCheckIn(bookingId, checkInDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { roomId, roomNumber, guestProfileId, actualCheckInTime } = checkInDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'check_in',
      oldValue: { status: 'confirmed' },
      newValue: {
        status: 'confirmed',
        actualCheckInTime: actualCheckInTime || new Date(),
        roomId,
        roomNumber,
        guestProfileId
      },
      performedBy,
      ipAddress,
      notes: notes || `Guest checked in to room ${roomNumber || roomId}`
    }, { transaction });
  }

  /**
   * Log check-out action
   * Requirements: 10.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} checkOutDetails - Check-out details
   * @param {string} performedBy - User ID who processed check-out
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logCheckOut(bookingId, checkOutDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { roomId, roomNumber, actualCheckOutTime, finalCharges, refundAmount } = checkOutDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'check_out',
      oldValue: { status: 'confirmed' },
      newValue: {
        status: 'completed',
        actualCheckOutTime: actualCheckOutTime || new Date(),
        roomId,
        roomNumber,
        finalCharges,
        refundAmount
      },
      performedBy,
      ipAddress,
      notes: notes || `Guest checked out from room ${roomNumber || roomId}`
    }, { transaction });
  }

  /**
   * Log deposit collection
   * Requirements: 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} depositDetails - Deposit details
   * @param {string} performedBy - User ID who collected the deposit
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logDepositCollection(bookingId, depositDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { amount, method, depositId } = depositDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'deposit_collected',
      oldValue: null,
      newValue: {
        depositId,
        amount,
        method,
        collectedAt: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || `Security deposit of ${amount} collected via ${method}`
    }, { transaction });
  }

  /**
   * Log deposit refund
   * Requirements: 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} refundDetails - Refund details
   * @param {string} performedBy - User ID who processed the refund
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logDepositRefund(bookingId, refundDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { originalAmount, refundAmount, deductions, depositId } = refundDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'deposit_refunded',
      oldValue: { depositId, originalAmount },
      newValue: {
        refundAmount,
        deductions,
        refundedAt: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || `Deposit refund of ${refundAmount} processed (original: ${originalAmount})`
    }, { transaction });
  }

  /**
   * Log cancellation
   * Requirements: 10.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} cancellationDetails - Cancellation details
   * @param {string} performedBy - User ID who cancelled
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logCancellation(bookingId, cancellationDetails, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;
    const { previousStatus, reason, cancelledBy } = cancellationDetails;

    return BookingAuditLog.create({
      bookingId,
      action: 'cancelled',
      oldValue: { status: previousStatus },
      newValue: {
        status: 'cancelled',
        reason,
        cancelledBy,
        cancelledAt: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || reason || 'Booking cancelled'
    }, { transaction });
  }

  /**
   * Log no-show marking
   * Requirements: 10.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {string} performedBy - User ID who marked no-show
   * @param {Object} options - Additional options
   * @returns {Promise<BookingAuditLog>}
   */
  async logNoShow(bookingId, performedBy, options = {}) {
    const { notes, ipAddress, transaction } = options;

    return BookingAuditLog.create({
      bookingId,
      action: 'no_show_marked',
      oldValue: { status: 'confirmed' },
      newValue: {
        status: 'cancelled',
        markedAt: new Date()
      },
      performedBy,
      ipAddress,
      notes: notes || 'Guest marked as no-show'
    }, { transaction });
  }

  /**
   * Get audit trail for a booking
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Query options
   * @returns {Promise<BookingAuditLog[]>}
   */
  async getAuditTrail(bookingId, options = {}) {
    const { limit = 100, offset = 0, action, startDate, endDate } = options;

    const where = { bookingId };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) {
        where.performedAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.performedAt[Op.lte] = new Date(endDate);
      }
    }

    return BookingAuditLog.findAll({
      where,
      include: [
        { association: 'performer', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['performedAt', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Get audit logs by action type
   * 
   * @param {string} action - Action type
   * @param {Object} options - Query options
   * @returns {Promise<BookingAuditLog[]>}
   */
  async getAuditLogsByAction(action, options = {}) {
    const { limit = 100, offset = 0, startDate, endDate, propertyId } = options;

    const where = { action };

    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) {
        where.performedAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.performedAt[Op.lte] = new Date(endDate);
      }
    }

    const include = [
      { association: 'performer', attributes: ['id', 'name', 'email', 'role'] },
      { 
        association: 'booking', 
        attributes: ['id', 'bookingNumber', 'propertyId', 'roomId'],
        ...(propertyId && { where: { propertyId } })
      }
    ];

    return BookingAuditLog.findAll({
      where,
      include,
      order: [['performedAt', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Get audit logs by user
   * 
   * @param {string} userId - User UUID
   * @param {Object} options - Query options
   * @returns {Promise<BookingAuditLog[]>}
   */
  async getAuditLogsByUser(userId, options = {}) {
    const { limit = 100, offset = 0, startDate, endDate, action } = options;

    const where = { performedBy: userId };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) {
        where.performedAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.performedAt[Op.lte] = new Date(endDate);
      }
    }

    return BookingAuditLog.findAll({
      where,
      include: [
        { association: 'booking', attributes: ['id', 'bookingNumber', 'propertyId'] }
      ],
      order: [['performedAt', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Get summary of audit actions for a date range
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getAuditSummary(options = {}) {
    const { startDate, endDate, propertyId } = options;

    const where = {};

    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) {
        where.performedAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.performedAt[Op.lte] = new Date(endDate);
      }
    }

    // Get counts by action type
    const actionCounts = await BookingAuditLog.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Convert to object
    const summary = {
      totalActions: 0,
      byAction: {}
    };

    actionCounts.forEach(item => {
      const count = parseInt(item.count, 10);
      summary.byAction[item.action] = count;
      summary.totalActions += count;
    });

    return summary;
  }
}

module.exports = new AuditService();

