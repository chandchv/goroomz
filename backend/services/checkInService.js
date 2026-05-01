/**
 * Check-In Service
 * 
 * Handles guest check-in processing, eligibility validation, and room status updates
 * Requirements: 3.1, 3.6, 3.7, 3.8, 3.9, 3.10
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const BookingAuditLog = require('../models/BookingAuditLog');
const GuestProfile = require('../models/GuestProfile');
const guestService = require('./guestService');

class CheckInService {
  /**
   * Room statuses that prevent check-in
   * Requirements: 3.7, 6.5
   */
  static BLOCKED_ROOM_STATUSES = ['occupied', 'maintenance', 'blocked'];

  /**
   * Valid booking statuses for check-in
   */
  static VALID_CHECKIN_STATUSES = ['confirmed'];

  /**
   * Process guest check-in
   * Requirements: 3.1, 3.8, 3.9, 3.10, 11.9, 11.10
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} checkInData - Check-in details
   * @param {string} checkInData.performedBy - Staff user ID processing check-in
   * @param {string} [checkInData.notes] - Check-in notes
   * @param {Object} [checkInData.guestData] - Guest profile data for ID verification
   * @param {string} [checkInData.ipAddress] - IP address for audit
   * @returns {Promise<{booking: Booking, room: Room, guestProfile: GuestProfile, paymentRequired: boolean}>}
   */
  async processCheckIn(bookingId, checkInData) {
    const transaction = await sequelize.transaction();

    try {
      const { performedBy, notes, guestData, ipAddress } = checkInData;

      // Validate check-in eligibility
      const eligibility = await this.validateCheckInEligibility(bookingId, { transaction });
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      const { booking, room } = eligibility;

      // Handle guest profile if guest data provided
      let guestProfile = null;
      if (guestData) {
        const guestResult = await guestService.findOrCreateGuest({
          name: guestData.name || booking.contactInfo?.name,
          phone: guestData.phone || booking.contactInfo?.phone,
          email: guestData.email || booking.contactInfo?.email,
          address: guestData.address,
          idType: guestData.idType,
          idNumber: guestData.idNumber
        });
        guestProfile = guestResult.profile;

        // Update guest profile with ID verification if provided
        if (guestData.idType && guestData.idNumber && !guestProfile.idVerified) {
          await guestService.updateGuestProfile(guestProfile.id, {
            idType: guestData.idType,
            idNumber: guestData.idNumber,
            idVerified: true,
            idVerifiedBy: performedBy
          });
        }
      } else if (booking.guestProfileId) {
        guestProfile = await GuestProfile.findByPk(booking.guestProfileId);
      }

      // Update room status to occupied
      await this.updateRoomStatus(room.id, 'occupied', performedBy, { transaction });

      // Update booking status and check-in details
      const actualCheckInTime = new Date();
      await booking.update({
        status: 'confirmed',
        actualCheckInTime,
        checkInBy: performedBy,
        checkInNotes: notes,
        guestProfileId: guestProfile?.id || booking.guestProfileId
      }, { transaction });

      // Record check-in in audit log
      await this.recordCheckInAudit(booking.id, {
        performedBy,
        actualCheckInTime,
        roomId: room.id,
        roomNumber: room.roomNumber,
        guestProfileId: guestProfile?.id,
        notes,
        ipAddress
      }, { transaction });

      // Update guest stay statistics if profile exists
      if (guestProfile) {
        await guestProfile.update({
          totalStays: guestProfile.totalStays + 1,
          lastStayDate: new Date()
        }, { transaction });
      }

      await transaction.commit();

      // Reload booking with associations
      const updatedBooking = await Booking.findByPk(bookingId, {
        include: [
          { association: 'room' },
          { association: 'guestProfile' }
        ]
      });

      // Determine if payment is required at check-in
      // Requirements: 11.9, 11.10 - Skip payment collection if already paid online
      const paymentRequired = this.isPaymentRequiredAtCheckIn(updatedBooking);

      return {
        booking: updatedBooking,
        room,
        guestProfile,
        paymentRequired,
        paymentInfo: {
          totalAmount: parseFloat(updatedBooking.totalAmount),
          paidAmount: parseFloat(updatedBooking.paidAmount),
          outstandingBalance: parseFloat(updatedBooking.totalAmount) - parseFloat(updatedBooking.paidAmount),
          paymentStatus: updatedBooking.paymentStatus,
          isOnlineBooking: updatedBooking.bookingSource === 'online'
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if payment is required at check-in
   * Requirements: 11.9, 11.10
   * 
   * @param {Booking} booking - Booking instance
   * @returns {boolean} - True if payment collection is needed
   */
  isPaymentRequiredAtCheckIn(booking) {
    // If payment status is 'paid', no payment needed
    if (booking.paymentStatus === 'paid') {
      return false;
    }

    // If paid amount covers total, no payment needed
    const paidAmount = parseFloat(booking.paidAmount) || 0;
    const totalAmount = parseFloat(booking.totalAmount) || 0;
    
    if (paidAmount >= totalAmount) {
      return false;
    }

    // Payment is required
    return true;
  }

  /**
   * Validate check-in eligibility
   * Requirements: 3.7, 6.5
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<{eligible: boolean, reason?: string, booking?: Booking, room?: Room}>}
   */
  async validateCheckInEligibility(bookingId, options = {}) {
    const { transaction } = options;

    // Find booking with room
    const booking = await Booking.findByPk(bookingId, {
      include: [{ association: 'room' }],
      transaction
    });

    if (!booking) {
      return { eligible: false, reason: 'Booking not found' };
    }

    // Check booking status
    if (!CheckInService.VALID_CHECKIN_STATUSES.includes(booking.status)) {
      return {
        eligible: false,
        reason: `Booking cannot be checked in. Current status: ${booking.status}. Expected: ${CheckInService.VALID_CHECKIN_STATUSES.join(' or ')}`
      };
    }

    const room = booking.room;
    if (!room) {
      return { eligible: false, reason: 'Room not found for this booking' };
    }

    // Check room status
    if (CheckInService.BLOCKED_ROOM_STATUSES.includes(room.currentStatus)) {
      const statusMessages = {
        'occupied': 'Room is currently occupied',
        'maintenance': 'Room is under maintenance',
        'blocked': 'Room is blocked and not available'
      };
      return {
        eligible: false,
        reason: statusMessages[room.currentStatus] || `Room is not ready (status: ${room.currentStatus})`
      };
    }

    // Check if room is available (vacant_clean or vacant_dirty)
    if (!['vacant_clean', 'vacant_dirty'].includes(room.currentStatus)) {
      return {
        eligible: false,
        reason: `Room is not available for check-in (status: ${room.currentStatus})`
      };
    }

    return { eligible: true, booking, room };
  }

  /**
   * Update room status
   * Requirements: 3.9, 6.1
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
   * Record check-in action in audit log
   * Requirements: 10.1, 10.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Object} details - Check-in details
   * @param {Object} options - Options including transaction
   * @returns {Promise<BookingAuditLog>}
   */
  async recordCheckInAudit(bookingId, details, options = {}) {
    const { transaction } = options;
    const {
      performedBy,
      actualCheckInTime,
      roomId,
      roomNumber,
      guestProfileId,
      notes,
      ipAddress
    } = details;

    return BookingAuditLog.create({
      bookingId,
      action: 'check_in',
      oldValue: { status: 'confirmed' },
      newValue: {
        status: 'confirmed',
        actualCheckInTime,
        roomId,
        roomNumber,
        guestProfileId
      },
      performedBy,
      ipAddress,
      notes
    }, { transaction });
  }

  /**
   * Get pending check-ins for a property
   * Requirements: 3.1
   * 
   * @param {string} propertyId - Property UUID
   * @param {Object} options - Query options
   * @returns {Promise<Booking[]>}
   */
  async getPendingCheckIns(propertyId, options = {}) {
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
        checkIn: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { association: 'guestProfile' },
        { association: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['checkIn', 'ASC']]
    });
  }

  /**
   * Check if a booking can be checked in (convenience method)
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<boolean>}
   */
  async canCheckIn(bookingId) {
    const eligibility = await this.validateCheckInEligibility(bookingId);
    return eligibility.eligible;
  }
}

module.exports = new CheckInService();

