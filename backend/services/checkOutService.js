/**
 * Check-Out Service
 * 
 * Handles guest check-out processing, eligibility validation, final charges calculation,
 * room status updates, and deposit refunds.
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 4.4, 4.5, 4.6, 7.6
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Deposit = require('../models/Deposit');
const Payment = require('../models/Payment');
const BookingAuditLog = require('../models/BookingAuditLog');
const HousekeepingTask = require('../models/HousekeepingTask');
const paymentService = require('./paymentService');

class CheckOutService {
  /**
   * Valid booking status for check-out
   */
  static VALID_CHECKOUT_STATUS = 'confirmed';

  /**
   * Room status after check-out
   */
  static POST_CHECKOUT_ROOM_STATUS = 'vacant_dirty';

  /**
   * Process guest check-out
   * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 7.6
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} checkOutData - Check-out details
   * @param {string} checkOutData.performedBy - Staff user ID processing check-out
   * @param {boolean} checkOutData.roomInspected - Whether room was inspected
   * @param {string} [checkOutData.notes] - Check-out notes
   * @param {Array} [checkOutData.deductions] - Deposit deductions [{reason, amount}]
   * @param {string} [checkOutData.ipAddress] - IP address for audit
   * @param {boolean} [checkOutData.managerApproval] - Manager approval for outstanding balance
   * @param {string} [checkOutData.managerApprovalBy] - Manager who approved
   * @returns {Promise<{booking: Booking, room: Room, finalCharges: Object, refund: Object|null}>}
   */
  async processCheckOut(bookingId, checkOutData) {
    const transaction = await sequelize.transaction();

    try {
      const { 
        performedBy, 
        roomInspected, 
        notes, 
        deductions = [], 
        ipAddress,
        managerApproval = false,
        managerApprovalBy
      } = checkOutData;

      // Validate check-out eligibility
      const eligibility = await this.validateCheckOutEligibility(bookingId, { transaction });
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      const { booking, room } = eligibility;

      // Require room inspection confirmation (Requirement 5.2)
      if (!roomInspected) {
        throw new Error('Room inspection is required before check-out');
      }

      // Calculate final charges (Requirement 5.3)
      const finalCharges = await this.calculateFinalCharges(bookingId, { transaction });

      // Check for outstanding balance (Requirement 7.6)
      if (finalCharges.outstandingBalance > 0) {
        const balanceCheck = await this.validateOutstandingBalance(bookingId, {
          managerApproval,
          managerApprovalBy,
          transaction
        });
        
        if (!balanceCheck.canProceed) {
          throw new Error(balanceCheck.reason);
        }
      }

      // Process deposit refund if applicable (Requirements 4.4, 4.5, 4.6)
      let refundResult = null;
      const deposit = await Deposit.findOne({
        where: { 
          bookingId,
          status: { [Op.in]: ['collected', 'held'] }
        },
        transaction
      });

      if (deposit) {
        refundResult = await this.processRefund(deposit.id, {
          deductions,
          performedBy,
          transaction
        });
      }

      // Update room status to vacant_dirty (Requirement 5.6)
      await this.updateRoomStatus(room.id, CheckOutService.POST_CHECKOUT_ROOM_STATUS, performedBy, { transaction });

      // Update booking status and check-out details (Requirement 5.7)
      const actualCheckOutTime = new Date();
      await booking.update({
        status: 'completed',
        actualCheckOutTime,
        checkOutBy: performedBy,
        checkOutNotes: notes,
        roomInspected: true
      }, { transaction });

      // Record check-out in audit log
      await this.recordCheckOutAudit(booking.id, {
        performedBy,
        actualCheckOutTime,
        roomId: room.id,
        roomNumber: room.roomNumber,
        finalCharges,
        refundAmount: refundResult?.refundAmount || 0,
        notes,
        ipAddress,
        managerApproval,
        managerApprovalBy
      }, { transaction });

      // Trigger housekeeping task for room cleaning (Requirement 5.8)
      await this.createHousekeepingTask(room.id, bookingId, { transaction });

      await transaction.commit();

      // Reload booking with associations
      const updatedBooking = await Booking.findByPk(bookingId, {
        include: [
          { association: 'room' },
          { association: 'guestProfile' },
          { association: 'deposits' },
          { association: 'payments' }
        ]
      });

      return {
        booking: updatedBooking,
        room,
        finalCharges,
        refund: refundResult
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Validate check-out eligibility
   * Requirements: 5.1
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<{eligible: boolean, reason?: string, booking?: Booking, room?: Room}>}
   */
  async validateCheckOutEligibility(bookingId, options = {}) {
    const { transaction } = options;

    // Find booking with room
    const booking = await Booking.findByPk(bookingId, {
      include: [{ association: 'room' }],
      transaction
    });

    if (!booking) {
      return { eligible: false, reason: 'Booking not found' };
    }

    // Check booking status - must be checked_in
    if (booking.status !== CheckOutService.VALID_CHECKOUT_STATUS) {
      return {
        eligible: false,
        reason: `Guest is not checked in. Current booking status: ${booking.status}`
      };
    }

    const room = booking.room;
    if (!room) {
      return { eligible: false, reason: 'Room not found for this booking' };
    }

    return { eligible: true, booking, room };
  }

  /**
   * Calculate final charges for check-out
   * Requirements: 5.3
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<{roomCharges: number, additionalCharges: number, totalCharges: number, paidAmount: number, outstandingBalance: number}>}
   */
  async calculateFinalCharges(bookingId, options = {}) {
    const { transaction } = options;

    const booking = await Booking.findByPk(bookingId, {
      include: [{ association: 'payments' }],
      transaction
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const roomCharges = parseFloat(booking.totalAmount) || 0;
    
    // Calculate additional charges from payments marked as additional
    const payments = booking.payments || [];
    const additionalCharges = payments
      .filter(p => p.paymentType === 'additional_charge' && p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalCharges = roomCharges + additionalCharges;
    const paidAmount = parseFloat(booking.paidAmount) || 0;
    const outstandingBalance = Math.max(0, totalCharges - paidAmount);

    return {
      roomCharges: Math.round(roomCharges * 100) / 100,
      additionalCharges: Math.round(additionalCharges * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100
    };
  }

  /**
   * Update room status
   * Requirements: 5.6
   * 
   * @param {string} roomId - Room UUID
   * @param {string} newStatus - New room status
   * @param {string} performedBy - User ID performing the update
   * @param {Object} options - Options including transaction
   * @returns {Promise<Room>}
   */
  async updateRoomStatus(roomId, newStatus, performedBy, options = {}) {
    const { transaction } = options;

    const room = await Room.findByPk(roomId, { transaction });
    if (!room) {
      throw new Error('Room not found');
    }

    const oldStatus = room.currentStatus;
    await room.update({ currentStatus: newStatus }, { transaction });

    return room;
  }

  /**
   * Record check-out action in audit log
   * Requirements: 10.1, 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} details - Check-out details
   * @param {Object} options - Options including transaction
   * @returns {Promise<BookingAuditLog>}
   */
  async recordCheckOutAudit(bookingId, details, options = {}) {
    const { transaction } = options;
    const {
      performedBy,
      actualCheckOutTime,
      roomId,
      roomNumber,
      finalCharges,
      refundAmount,
      notes,
      ipAddress,
      managerApproval,
      managerApprovalBy
    } = details;

    return BookingAuditLog.create({
      bookingId,
      action: 'check_out',
      oldValue: { status: 'confirmed' },
      newValue: {
        status: 'completed',
        actualCheckOutTime,
        roomId,
        roomNumber,
        finalCharges,
        refundAmount,
        ...(managerApproval && { managerApproval, managerApprovalBy })
      },
      performedBy,
      ipAddress,
      notes
    }, { transaction });
  }

  /**
   * Create housekeeping task for room cleaning after check-out
   * Requirements: 5.8
   * 
   * @param {string} roomId - Room UUID
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<HousekeepingTask>}
   */
  async createHousekeepingTask(roomId, bookingId, options = {}) {
    const { transaction } = options;

    return HousekeepingTask.create({
      roomId,
      notes: `Room cleaning required after check-out. Booking ID: ${bookingId}`,
      checklistCompleted: null,
      issuesFound: null
    }, { transaction });
  }

  /**
   * Calculate deposit refund amount
   * Requirements: 4.4
   * 
   * @param {number} depositAmount - Original deposit amount
   * @param {Array} deductions - Array of deductions [{reason, amount}]
   * @returns {{refundAmount: number, totalDeductions: number, deductionDetails: Array}}
   */
  calculateRefundAmount(depositAmount, deductions = []) {
    const amount = parseFloat(depositAmount) || 0;
    
    // Validate and sum deductions
    const validDeductions = deductions.filter(d => 
      d && typeof d.amount === 'number' && d.amount > 0 && d.reason
    );

    const totalDeductions = validDeductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    
    // Refund amount = deposit - deductions, minimum 0
    const refundAmount = Math.max(0, amount - totalDeductions);

    return {
      refundAmount: Math.round(refundAmount * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      deductionDetails: validDeductions.map(d => ({
        reason: d.reason,
        amount: Math.round(parseFloat(d.amount) * 100) / 100
      }))
    };
  }

  /**
   * Process deposit refund
   * Requirements: 4.4, 4.5, 4.6
   * 
   * @param {string} depositId - Deposit UUID
   * @param {Object} refundData - Refund details
   * @param {Array} refundData.deductions - Deductions [{reason, amount}]
   * @param {string} refundData.performedBy - Staff user ID
   * @param {string} [refundData.refundMethod] - Refund payment method
   * @param {Object} [refundData.transaction] - Database transaction
   * @returns {Promise<{deposit: Deposit, refundAmount: number, totalDeductions: number, deductionDetails: Array}>}
   */
  async processRefund(depositId, refundData) {
    const { deductions = [], performedBy, refundMethod = 'cash', transaction } = refundData;

    const deposit = await Deposit.findByPk(depositId, { transaction });
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    // Check if deposit is in a valid state for refund
    if (!['collected', 'held'].includes(deposit.status)) {
      throw new Error(`Deposit cannot be refunded. Current status: ${deposit.status}`);
    }

    // Calculate refund amount
    const { refundAmount, totalDeductions, deductionDetails } = this.calculateRefundAmount(
      deposit.amount,
      deductions
    );

    // Determine new status based on refund
    let newStatus;
    if (refundAmount === 0) {
      newStatus = 'forfeited';
    } else if (refundAmount < parseFloat(deposit.amount)) {
      newStatus = 'partially_refunded';
    } else {
      newStatus = 'fully_refunded';
    }

    // Update deposit record
    await deposit.update({
      refundAmount,
      refundDate: new Date(),
      refundedBy: performedBy,
      deductions: deductionDetails,
      status: newStatus,
      paymentMethod: refundMethod
    }, { transaction });

    return {
      deposit,
      refundAmount,
      totalDeductions,
      deductionDetails,
      status: newStatus
    };
  }

  /**
   * Get due check-outs for a property
   * Requirements: 5.10
   * 
   * @param {string} propertyId - Property UUID
   * @param {Object} options - Query options
   * @returns {Promise<Booking[]>}
   */
  async getDueCheckOuts(propertyId, options = {}) {
    const { date = new Date() } = options;
    
    // Get start and end of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Booking.findAll({
      where: {
        propertyId,
        status: 'confirmed',
        checkOut: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { association: 'guestProfile' },
        { association: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { association: 'deposits' }
      ],
      order: [['checkOut', 'ASC']]
    });
  }

  /**
   * Get active booking by room number or guest name
   * Requirements: 5.1
   * 
   * @param {string} propertyId - Property UUID
   * @param {Object} searchParams - Search parameters
   * @param {string} [searchParams.roomNumber] - Room number
   * @param {string} [searchParams.guestName] - Guest name
   * @returns {Promise<Booking|null>}
   */
  async findActiveBooking(propertyId, searchParams) {
    const { roomNumber, guestName } = searchParams;

    const whereClause = {
      propertyId,
      status: 'confirmed'
    };

    const includeClause = [
      { 
        association: 'room', 
        attributes: ['id', 'title', 'roomNumber', 'currentStatus'],
        ...(roomNumber && { where: { roomNumber } })
      },
      { association: 'guestProfile' },
      { association: 'user', attributes: ['id', 'name', 'email', 'phone'] },
      { association: 'deposits' }
    ];

    // If searching by guest name, add to where clause
    if (guestName) {
      whereClause[Op.or] = [
        { 'contactInfo.name': { [Op.iLike]: `%${guestName}%` } }
      ];
    }

    return Booking.findOne({
      where: whereClause,
      include: includeClause
    });
  }

  /**
   * Check if a booking can be checked out (convenience method)
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<boolean>}
   */
  async canCheckOut(bookingId) {
    const eligibility = await this.validateCheckOutEligibility(bookingId);
    return eligibility.eligible;
  }

  /**
   * Validate outstanding balance at check-out
   * Requirements: 7.6
   * 
   * If outstanding balance exists, require payment or manager approval to proceed.
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Validation options
   * @param {boolean} [options.managerApproval] - Whether manager has approved
   * @param {string} [options.managerApprovalBy] - Manager user ID who approved
   * @param {Object} [options.transaction] - Database transaction
   * @returns {Promise<{canProceed: boolean, reason?: string, outstandingBalance: number}>}
   */
  async validateOutstandingBalance(bookingId, options = {}) {
    const { managerApproval = false, managerApprovalBy, transaction } = options;

    // Get outstanding balance using paymentService
    const balanceInfo = await paymentService.getOutstandingBalance(bookingId);
    const { outstandingBalance } = balanceInfo;

    // If no outstanding balance, can proceed
    if (outstandingBalance <= 0) {
      return {
        canProceed: true,
        outstandingBalance: 0
      };
    }

    // If manager approval is provided, can proceed
    if (managerApproval && managerApprovalBy) {
      // Log the manager approval
      await BookingAuditLog.create({
        bookingId,
        action: 'manager_approval_checkout',
        oldValue: { outstandingBalance },
        newValue: { 
          managerApproval: true, 
          managerApprovalBy,
          outstandingBalance 
        },
        performedBy: managerApprovalBy,
        notes: `Manager approved check-out with outstanding balance of ${outstandingBalance}`
      }, { transaction });

      return {
        canProceed: true,
        outstandingBalance,
        managerApproved: true
      };
    }

    // Outstanding balance exists and no manager approval
    return {
      canProceed: false,
      reason: `Outstanding balance of ${outstandingBalance} must be settled or manager approval is required to proceed with check-out`,
      outstandingBalance
    };
  }

  /**
   * Get outstanding balance for a booking
   * Requirements: 7.6
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<{totalAmount: number, paidAmount: number, outstandingBalance: number, paymentStatus: string}>}
   */
  async getOutstandingBalance(bookingId) {
    return paymentService.getOutstandingBalance(bookingId);
  }
}

module.exports = new CheckOutService();

