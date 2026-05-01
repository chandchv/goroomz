/**
 * Instant Check-In Service
 * 
 * Handles walk-in guest instant check-in (booking + check-in in single transaction)
 * Requirements: 1A.1, 1A.2, 1A.3, 1A.4, 1A.5, 1A.6
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const BookingAuditLog = require('../models/BookingAuditLog');
const GuestProfile = require('../models/GuestProfile');
const Deposit = require('../models/Deposit');
const bookingService = require('./bookingService');
const guestService = require('./guestService');

class InstantCheckInService {
  /**
   * Room statuses that allow instant check-in
   */
  static AVAILABLE_ROOM_STATUSES = ['vacant_clean', 'vacant_dirty'];

  /**
   * Perform instant check-in for walk-in guests
   * Creates booking + check-in in a single atomic transaction
   * Requirements: 1A.1, 1A.2, 1A.3, 1A.4, 1A.5, 1A.6
   * 
   * @param {Object} checkInData - Instant check-in data
   * @param {string} checkInData.roomId - Room UUID
   * @param {string} [checkInData.bedId] - Bed UUID for shared rooms
   * @param {string} checkInData.propertyId - Property UUID
   * @param {string} checkInData.ownerId - Property owner UUID
   * @param {Object} checkInData.guestInfo - Guest information
   * @param {string} checkInData.guestInfo.name - Guest name
   * @param {string} checkInData.guestInfo.phone - Guest phone (10 digits)
   * @param {string} [checkInData.guestInfo.email] - Guest email
   * @param {Object} [checkInData.guestInfo.address] - Guest address
   * @param {string} [checkInData.guestInfo.idType] - ID type
   * @param {string} [checkInData.guestInfo.idNumber] - ID number
   * @param {Date} checkInData.checkOut - Expected check-out date
   * @param {number} [checkInData.guests=1] - Number of guests
   * @param {string} [checkInData.specialRequests] - Special requests
   * @param {Object} [checkInData.deposit] - Security deposit details
   * @param {number} checkInData.deposit.amount - Deposit amount
   * @param {string} checkInData.deposit.method - Payment method
   * @param {string} checkInData.performedBy - Staff user ID
   * @param {string} [checkInData.notes] - Check-in notes
   * @param {string} [checkInData.ipAddress] - IP address for audit
   * @returns {Promise<{booking: Booking, room: Room, guestProfile: GuestProfile, deposit?: Deposit}>}
   */
  async instantCheckIn(checkInData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        roomId,
        bedId,
        propertyId,
        ownerId,
        guestInfo,
        checkOut,
        guests = 1,
        specialRequests,
        deposit,
        performedBy,
        notes,
        ipAddress
      } = checkInData;

      // Validate room availability
      const roomValidation = await this.validateRoomForInstantCheckIn(roomId, bedId, { transaction });
      if (!roomValidation.available) {
        throw new Error(roomValidation.reason);
      }

      const room = roomValidation.room;

      // Validate guest information
      this.validateGuestInfo(guestInfo);

      // Find or create guest profile
      const { profile: guestProfile, created: isNewGuest } = await guestService.findOrCreateGuest({
        name: guestInfo.name,
        phone: guestInfo.phone,
        email: guestInfo.email,
        address: guestInfo.address,
        idType: guestInfo.idType,
        idNumber: guestInfo.idNumber
      });

      // Update guest profile with ID verification if provided
      if (guestInfo.idType && guestInfo.idNumber && !guestProfile.idVerified) {
        await guestService.updateGuestProfile(guestProfile.id, {
          idType: guestInfo.idType,
          idNumber: guestInfo.idNumber,
          idVerified: true,
          idVerifiedBy: performedBy
        });
      }

      // Calculate dates
      const checkIn = new Date();
      const checkOutDate = new Date(checkOut);

      // Sanitize bedId — virtual IDs like "bed-uuid-1" are not real UUIDs; store null
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const sanitizedBedId = bedId && isValidUuid.test(bedId) ? bedId : null;

      // Normalize bookingType — 'per_bed' is not a valid DB enum; treat as 'monthly' for PG rooms
      const rawPricingType = room.pricingType || 'daily';
      const bookingType = (rawPricingType === 'per_bed' || rawPricingType === 'monthly') ? 'monthly' : 'daily';

      const calculation = await bookingService.calculateTotalAmount(
        roomId,
        checkIn,
        checkOutDate,
        bookingType
      );

      // Generate booking number
      const bookingNumber = await bookingService.generateBookingNumber();

      // Create booking with status 'confirmed' directly
      const booking = await Booking.create({
        roomId,
        bedId: sanitizedBedId,
        userId: performedBy, // Walk-in guest uses staff as user
        ownerId: ownerId || room.ownerId,
        propertyId: propertyId || room.propertyId || null,
        bookingNumber,
        bookingSource: 'walk_in',
        bookingType,
        checkIn,
        checkOut: checkOutDate,
        actualCheckInTime: checkIn, // Set actual check-in time immediately
        guests,
        contactInfo: {
          name: guestInfo.name,
          phone: guestInfo.phone,
          email: guestInfo.email || ''
        },
        specialRequests,
        totalAmount: calculation.totalAmount,
        paidAmount: 0,
        status: 'confirmed', // Direct to checked_in status
        paymentStatus: 'pending',
        guestProfileId: guestProfile.id,
        checkInBy: performedBy,
        checkInNotes: notes
      }, { transaction });

      // Update room status to occupied
      await room.update({ currentStatus: 'occupied' }, { transaction });

      // Handle security deposit if provided
      let depositRecord = null;
      if (deposit && deposit.amount > 0) {
        depositRecord = await Deposit.create({
          bookingId: booking.id,
          amount: deposit.amount,
          paymentMethod: deposit.method,
          status: 'collected',
          collectedDate: new Date(),
          notes: deposit.notes
        }, { transaction });
      }

      // Create audit log for instant check-in
      await BookingAuditLog.create({
        bookingId: booking.id,
        action: 'created',
        newValue: {
          bookingNumber,
          status: 'confirmed',
          bookingSource: 'walk_in',
          bookingType,
          checkIn,
          checkOut: checkOutDate,
          totalAmount: calculation.totalAmount,
          instantCheckIn: true
        },
        performedBy,
        ipAddress,
        notes: `Instant check-in for walk-in guest${isNewGuest ? ' (new guest)' : ' (returning guest)'}`
      }, { transaction });

      // Also log the check-in action
      await BookingAuditLog.create({
        bookingId: booking.id,
        action: 'check_in',
        oldValue: null,
        newValue: {
          status: 'confirmed',
          actualCheckInTime: checkIn,
          roomId,
          roomNumber: room.roomNumber,
          guestProfileId: guestProfile.id
        },
        performedBy,
        ipAddress,
        notes: notes || 'Instant check-in completed'
      }, { transaction });

      // Update guest stay statistics
      await guestProfile.update({
        totalStays: guestProfile.totalStays + 1,
        lastStayDate: new Date()
      }, { transaction });

      await transaction.commit();

      // Reload booking with associations
      const updatedBooking = await Booking.findByPk(booking.id, {
        include: [
          { association: 'room' },
          { association: 'guestProfile' },
          { association: 'deposits' }
        ]
      });

      return {
        booking: updatedBooking,
        room,
        guestProfile,
        deposit: depositRecord
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Validate room availability for instant check-in
   * Requirements: 1A.1, 1A.2, 1A.8
   * 
   * @param {string} roomId - Room UUID
   * @param {string} [bedId] - Bed UUID for shared rooms
   * @param {Object} options - Options including transaction
   * @returns {Promise<{available: boolean, reason?: string, room?: Room}>}
   */
  async validateRoomForInstantCheckIn(roomId, bedId = null, options = {}) {
    const { transaction } = options;

    const room = await Room.findByPk(roomId, { transaction });
    if (!room) {
      return { available: false, reason: 'Room not found' };
    }

    const pd = room.propertyDetails || {};
    const totalBeds = parseInt(pd.totalBeds) || room.maxGuests || 1;
    const isSharedRoom = totalBeds > 1 || (pd.sharingType && pd.sharingType !== 'single');

    // For shared rooms that are occupied, check if there are available beds
    if (room.currentStatus === 'occupied' && isSharedRoom) {
      // Count active checked-in guests (not just confirmed bookings)
      const activeCheckIns = await Booking.count({
        where: {
          roomId,
          status: { [Op.in]: ['confirmed', 'pending'] },
          actualCheckInTime: { [Op.ne]: null },
          actualCheckOutTime: null
        },
        transaction
      });

      if (activeCheckIns >= totalBeds) {
        return { available: false, reason: `All ${totalBeds} beds in this room are occupied` };
      }
      // Has available beds — allow check-in
      return { available: true, room };
    }

    // For non-shared rooms, reject if occupied
    if (!InstantCheckInService.AVAILABLE_ROOM_STATUSES.includes(room.currentStatus)) {
      const statusMessages = {
        'occupied': 'Room is currently occupied',
        'maintenance': 'Room is under maintenance',
        'blocked': 'Room is blocked and not available'
      };
      return {
        available: false,
        reason: statusMessages[room.currentStatus] || `Room is not available (status: ${room.currentStatus})`
      };
    }

    return { available: true, room };
  }

  /**
   * Validate bed availability for shared rooms
   * Requirements: 1A.2
   * 
   * @param {string} roomId - Room UUID
   * @param {string} bedId - Bed UUID
   * @param {Object} options - Options including transaction
   * @returns {Promise<{available: boolean, reason?: string}>}
   */
  async validateBedAvailability(roomId, bedId, options = {}) {
    const { transaction } = options;

    // Check if there's an active booking for this bed
    const existingBooking = await Booking.findOne({
      where: {
        roomId,
        bedId,
        status: {
          [Op.in]: ['confirmed', 'confirmed']
        }
      },
      transaction
    });

    if (existingBooking) {
      return {
        available: false,
        reason: 'Selected bed is already occupied or reserved'
      };
    }

    return { available: true };
  }

  /**
   * Validate guest information
   * Requirements: 1A.3
   * 
   * @param {Object} guestInfo - Guest information
   * @throws {Error} If validation fails
   */
  validateGuestInfo(guestInfo) {
    if (!guestInfo) {
      throw new Error('Guest information is required');
    }

    if (!guestInfo.name || guestInfo.name.trim().length < 2) {
      throw new Error('Guest name is required (minimum 2 characters)');
    }

    if (!guestInfo.phone) {
      throw new Error('Guest phone number is required');
    }

    // Validate phone format
    if (!guestService.validatePhone(guestInfo.phone)) {
      throw new Error('Invalid phone number format. Must be 10 digits.');
    }

    // Validate email if provided
    if (guestInfo.email && !guestService.validateEmail(guestInfo.email)) {
      throw new Error('Invalid email format');
    }

    // Validate ID if provided
    if (guestInfo.idType && guestInfo.idNumber) {
      const idValidation = guestService.validateIdNumber(guestInfo.idType, guestInfo.idNumber);
      if (!idValidation.valid) {
        throw new Error(idValidation.message);
      }
    }
  }

  /**
   * Get available rooms for instant check-in
   * Requirements: 1A.1
   * 
   * @param {string} propertyId - Property UUID
   * @returns {Promise<Room[]>}
   */
  async getAvailableRoomsForInstantCheckIn(propertyId) {
    return Room.findAll({
      where: {
        propertyId,
        currentStatus: {
          [Op.in]: InstantCheckInService.AVAILABLE_ROOM_STATUSES
        },
        isActive: true
      },
      order: [['roomNumber', 'ASC']]
    });
  }

  /**
   * Get available beds for a shared room
   * Requirements: 1A.2
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<{totalBeds: number, availableBeds: number, occupiedBedIds: string[]}>}
   */
  async getAvailableBedsForRoom(roomId) {
    const room = await Room.findByPk(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Get total beds from pgOptions or maxGuests
    const totalBeds = room.pgOptions?.sharingTypes?.[0]?.beds || room.maxGuests || 1;

    // Get occupied beds
    const occupiedBookings = await Booking.findAll({
      where: {
        roomId,
        status: {
          [Op.in]: ['confirmed', 'confirmed']
        },
        bedId: {
          [Op.ne]: null
        }
      },
      attributes: ['bedId']
    });

    const occupiedBedIds = occupiedBookings.map(b => b.bedId);
    const availableBeds = totalBeds - occupiedBedIds.length;

    return {
      totalBeds,
      availableBeds,
      occupiedBedIds
    };
  }
}

module.exports = new InstantCheckInService();

