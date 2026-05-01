/**
 * Booking Service
 * 
 * Handles booking creation, validation, and management
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const BookingAuditLog = require('../models/BookingAuditLog');

class BookingService {
  /**
   * Generate a unique booking confirmation number
   * Format: GR-YYYYMMDD-XXXX (e.g., GR-20260105-A1B2)
   * Requirements: 1.4
   * 
   * @returns {Promise<string>} Unique booking number
   */
  async generateBookingNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Generate random alphanumeric suffix
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const bookingNumber = `GR-${dateStr}-${suffix}`;
    
    // Check if this booking number already exists
    const existing = await Booking.findOne({
      where: { bookingNumber }
    });
    
    // If exists, recursively generate a new one
    if (existing) {
      return this.generateBookingNumber();
    }
    
    return bookingNumber;
  }

  /**
   * Validate that a room is available for the requested date range
   * Requirements: 1.2
   * 
   * @param {string} roomId - Room UUID
   * @param {Date} checkIn - Check-in date
   * @param {Date} checkOut - Check-out date
   * @param {string|null} excludeBookingId - Booking ID to exclude (for modifications)
   * @returns {Promise<{available: boolean, conflictingBookings: Array}>}
   */
  async validateDateConflict(roomId, checkIn, checkOut, excludeBookingId = null) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Validate dates
    if (checkOutDate <= checkInDate) {
      return {
        available: false,
        error: 'Check-out date must be after check-in date',
        conflictingBookings: []
      };
    }

    // Build where clause for overlapping bookings
    const whereClause = {
      roomId,
      status: {
        [Op.notIn]: ['cancelled', 'completed', 'refunded']
      },
      // Overlap condition: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
      [Op.and]: [
        { checkIn: { [Op.lt]: checkOutDate } },
        { checkOut: { [Op.gt]: checkInDate } }
      ]
    };

    // Exclude current booking if modifying
    if (excludeBookingId) {
      whereClause.id = { [Op.ne]: excludeBookingId };
    }

    const conflictingBookings = await Booking.findAll({
      where: whereClause,
      attributes: ['id', 'bookingNumber', 'checkIn', 'checkOut', 'status']
    });

    // For PG rooms with multiple beds, check if there are still available beds
    // A room is available if conflicting bookings < total beds
    const room = await Room.findByPk(roomId);
    if (room) {
      const pd = room.propertyDetails || {};
      const totalBeds = parseInt(pd.totalBeds) || 1;
      
      if (totalBeds > 1) {
        // Multi-bed room: available if active bookings < total beds
        return {
          available: conflictingBookings.length < totalBeds,
          conflictingBookings,
          availableBeds: totalBeds - conflictingBookings.length,
          totalBeds
        };
      }
    }

    return {
      available: conflictingBookings.length === 0,
      conflictingBookings
    };
  }

  /**
   * Calculate total amount for a booking
   * Requirements: 1.5
   * 
   * @param {string} roomId - Room UUID
   * @param {Date} checkIn - Check-in date
   * @param {Date} checkOut - Check-out date
   * @param {string} bookingType - 'daily' or 'monthly'
   * @param {Object} options - Additional options (roomTypePrice for hotels)
   * @returns {Promise<{totalAmount: number, duration: number, rate: number, breakdown: Object}>}
   */
  async calculateTotalAmount(roomId, checkIn, checkOut, bookingType = 'daily', options = {}) {
    const room = await Room.findByPk(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    let duration, rate, totalAmount;
    const breakdown = {};

    if (bookingType === 'monthly' || bookingType === 'per_bed') {
      // Calculate months (approximate - 30 days per month)
      const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      duration = Math.ceil(days / 30);
      
      // Use monthly rate from propertyDetails, pgOptions, or default to price * 30
      const pd = room.propertyDetails || {};
      rate = pd.monthlyRate || room.pgOptions?.monthlyRate || room.price || 0;
      totalAmount = rate * duration;
      
      breakdown.type = 'monthly';
      breakdown.months = duration;
      breakdown.monthlyRate = rate;
    } else {
      // Daily booking
      duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      // Use specific room type price if provided (for hotels)
      if (options.roomTypePrice) {
        rate = options.roomTypePrice;
      } else if (room.hotelPrices && options.roomType) {
        rate = room.hotelPrices[options.roomType] || room.price || 0;
      } else {
        rate = room.price || 0;
      }
      
      totalAmount = rate * duration;
      
      breakdown.type = 'daily';
      breakdown.nights = duration;
      breakdown.nightlyRate = rate;
    }

    // Round to 2 decimal places
    totalAmount = Math.round(totalAmount * 100) / 100;

    return {
      totalAmount,
      duration,
      rate,
      breakdown
    };
  }

  /**
   * Create a new booking
   * Requirements: 1.1, 1.2, 1.4, 1.5
   * 
   * @param {Object} bookingData - Booking details
   * @returns {Promise<Booking>} Created booking
   */
  async createBooking(bookingData) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        roomId,
        bedId,
        userId,
        ownerId,
        propertyId,
        checkIn,
        checkOut,
        guests,
        contactInfo,
        specialRequests,
        bookingSource = 'offline',
        bookingType = 'daily',
        guestProfileId,
        totalAmount: providedTotalAmount,
        paidAmount = 0
      } = bookingData;

      // Validate room availability
      const availability = await this.validateDateConflict(roomId, checkIn, checkOut);
      if (!availability.available) {
        throw new Error(availability.error || 'Room is not available for the selected dates');
      }

      // Calculate total amount if not provided
      let totalAmount = providedTotalAmount;
      if (!totalAmount) {
        const calculation = await this.calculateTotalAmount(roomId, checkIn, checkOut, bookingType);
        totalAmount = calculation.totalAmount;
      }

      // Generate booking number
      const bookingNumber = await this.generateBookingNumber();

      // Create booking
      const booking = await Booking.create({
        roomId,
        bedId,
        userId,
        ownerId,
        propertyId,
        bookingNumber,
        bookingSource,
        bookingType,
        checkIn,
        checkOut,
        guests,
        contactInfo,
        specialRequests,
        totalAmount,
        paidAmount,
        guestProfileId,
        status: 'pending',
        paymentStatus: paidAmount >= totalAmount ? 'paid' : 'pending'
      }, { transaction });

      // Create audit log entry
      await BookingAuditLog.create({
        bookingId: booking.id,
        action: 'created',
        newValue: {
          bookingNumber,
          status: 'pending',
          bookingSource,
          bookingType,
          checkIn,
          checkOut,
          totalAmount
        },
        performedBy: userId,
        notes: `Booking created via ${bookingSource}`
      }, { transaction });

      await transaction.commit();

      return booking;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update booking status with validation
   * 
   * @param {string} bookingId - Booking UUID
   * @param {string} newStatus - New status
   * @param {string} performedBy - User ID performing the action
   * @param {Object} options - Additional options (notes, reason)
   * @returns {Promise<Booking>} Updated booking
   */
  async updateBookingStatus(bookingId, newStatus, performedBy, options = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      const booking = await Booking.findByPk(bookingId, { transaction });
      if (!booking) {
        throw new Error('Booking not found');
      }

      const oldStatus = booking.status;
      
      // Validate status transition
      if (!Booking.isValidTransition(oldStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }

      // Update booking
      const updateData = { status: newStatus };
      
      if (newStatus === 'cancelled') {
        updateData.cancellationReason = options.reason;
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = options.cancelledBy || 'admin';
      }

      await booking.update(updateData, { transaction });

      // Create audit log
      await BookingAuditLog.create({
        bookingId: booking.id,
        action: 'status_changed',
        oldValue: { status: oldStatus },
        newValue: { status: newStatus },
        performedBy,
        notes: options.notes
      }, { transaction });

      await transaction.commit();

      return booking;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get booking by ID with associations
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<Booking|null>}
   */
  async getBookingById(bookingId) {
    return Booking.findByPk(bookingId, {
      include: [
        { association: 'room' },
        { association: 'user' },
        { association: 'guestProfile' },
        { association: 'auditLogs' }
      ]
    });
  }

  /**
   * Get bookings by room and date range
   * 
   * @param {string} roomId - Room UUID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Booking[]>}
   */
  async getBookingsByRoomAndDateRange(roomId, startDate, endDate) {
    return Booking.findAll({
      where: {
        roomId,
        status: {
          [Op.notIn]: ['cancelled', 'completed', 'refunded']
        },
        [Op.or]: [
          {
            checkIn: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            checkOut: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            [Op.and]: [
              { checkIn: { [Op.lte]: startDate } },
              { checkOut: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      order: [['checkIn', 'ASC']]
    });
  }

  /**
   * Modify booking dates
   * Requirements: 8.1, 8.3, 8.6
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Date} newCheckIn - New check-in date
   * @param {Date} newCheckOut - New check-out date
   * @param {string} performedBy - User ID performing the modification
   * @param {Object} options - Additional options (notes, reason)
   * @returns {Promise<{booking: Booking, recalculated: boolean, oldAmount: number, newAmount: number}>}
   */
  async modifyBookingDates(bookingId, newCheckIn, newCheckOut, performedBy, options = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find the booking
      const booking = await Booking.findByPk(bookingId, { 
        transaction,
        include: [{ association: 'room' }]
      });
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Validate booking status - can only modify pending or confirmed bookings
      const modifiableStatuses = ['pending', 'confirmed'];
      if (!modifiableStatuses.includes(booking.status)) {
        throw new Error(`Cannot modify dates for booking with status: ${booking.status}. Only pending or confirmed bookings can be modified.`);
      }

      const newCheckInDate = new Date(newCheckIn);
      const newCheckOutDate = new Date(newCheckOut);

      // Validate new dates
      if (newCheckOutDate <= newCheckInDate) {
        throw new Error('Check-out date must be after check-in date');
      }

      // Store old values for audit
      const oldCheckIn = booking.checkIn;
      const oldCheckOut = booking.checkOut;
      const oldTotalAmount = parseFloat(booking.totalAmount);

      // Check if dates actually changed
      const checkInChanged = new Date(oldCheckIn).getTime() !== newCheckInDate.getTime();
      const checkOutChanged = new Date(oldCheckOut).getTime() !== newCheckOutDate.getTime();

      if (!checkInChanged && !checkOutChanged) {
        await transaction.rollback();
        return {
          booking,
          recalculated: false,
          oldAmount: oldTotalAmount,
          newAmount: oldTotalAmount,
          message: 'No date changes detected'
        };
      }

      // Validate room availability for new dates (excluding current booking)
      const availability = await this.validateDateConflict(
        booking.roomId, 
        newCheckInDate, 
        newCheckOutDate, 
        bookingId
      );
      
      if (!availability.available) {
        throw new Error(availability.error || 'Room is not available for the new dates. Conflicting bookings exist.');
      }

      // Recalculate total amount based on new duration
      // Requirements: 8.3
      const calculation = await this.calculateTotalAmount(
        booking.roomId, 
        newCheckInDate, 
        newCheckOutDate, 
        booking.bookingType
      );
      const newTotalAmount = calculation.totalAmount;

      // Update booking with new dates and recalculated amount
      await booking.update({
        checkIn: newCheckInDate,
        checkOut: newCheckOutDate,
        totalAmount: newTotalAmount
      }, { transaction });

      // Update payment status based on new amount
      const paidAmount = parseFloat(booking.paidAmount);
      let newPaymentStatus = 'pending';
      if (paidAmount >= newTotalAmount) {
        newPaymentStatus = 'paid';
      } else if (paidAmount > 0) {
        newPaymentStatus = 'pending';
      }
      
      if (booking.paymentStatus !== newPaymentStatus) {
        await booking.update({ paymentStatus: newPaymentStatus }, { transaction });
      }

      // Create audit log entry
      // Requirements: 8.6
      await BookingAuditLog.logDateChange(
        bookingId,
        { 
          checkIn: oldCheckIn, 
          checkOut: oldCheckOut,
          totalAmount: oldTotalAmount,
          duration: Math.ceil((new Date(oldCheckOut) - new Date(oldCheckIn)) / (1000 * 60 * 60 * 24))
        },
        { 
          checkIn: newCheckInDate, 
          checkOut: newCheckOutDate,
          totalAmount: newTotalAmount,
          duration: calculation.duration
        },
        performedBy,
        options.notes || options.reason || `Dates modified from ${oldCheckIn.toISOString().split('T')[0]} - ${oldCheckOut.toISOString().split('T')[0]} to ${newCheckInDate.toISOString().split('T')[0]} - ${newCheckOutDate.toISOString().split('T')[0]}`
      );

      await transaction.commit();

      // Reload booking with associations
      const updatedBooking = await Booking.findByPk(bookingId, {
        include: [
          { association: 'room' },
          { association: 'user' },
          { association: 'guestProfile' }
        ]
      });

      return {
        booking: updatedBooking,
        recalculated: true,
        oldAmount: oldTotalAmount,
        newAmount: newTotalAmount,
        amountDifference: newTotalAmount - oldTotalAmount,
        oldDuration: Math.ceil((new Date(oldCheckOut) - new Date(oldCheckIn)) / (1000 * 60 * 60 * 24)),
        newDuration: calculation.duration
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Change room assignment for a booking
   * Requirements: 8.2
   * 
   * @param {string} bookingId - Booking UUID
   * @param {string} newRoomId - New room UUID
   * @param {string} performedBy - User ID performing the modification
   * @param {Object} options - Additional options (notes, reason, newBedId)
   * @returns {Promise<{booking: Booking, oldRoom: Object, newRoom: Object}>}
   */
  async changeBookingRoom(bookingId, newRoomId, performedBy, options = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find the booking with current room
      const booking = await Booking.findByPk(bookingId, { 
        transaction,
        include: [{ model: Room, as: 'room' }]
      });
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Validate booking status - can modify pending or confirmed bookings
      const modifiableStatuses = ['pending', 'confirmed'];
      if (!modifiableStatuses.includes(booking.status)) {
        throw new Error(`Cannot change room for booking with status: ${booking.status}`);
      }

      // Check if it's the same room
      if (booking.roomId === newRoomId) {
        await transaction.rollback();
        return {
          booking,
          oldRoom: booking.room,
          newRoom: booking.room,
          message: 'Room is already assigned to this booking'
        };
      }

      // Find the new room
      const newRoom = await Room.findByPk(newRoomId, { transaction });
      if (!newRoom) {
        throw new Error('New room not found');
      }

      // Validate new room availability
      // Requirements: 8.2 - verify new room availability
      const roomStatus = newRoom.currentStatus;
      
      // For confirmed bookings, room must be vacant
      if (booking.status === 'confirmed') {
        if (roomStatus !== 'vacant_clean' && roomStatus !== 'vacant_dirty') {
          throw new Error(`New room is not available (status: ${roomStatus}). Room must be vacant for checked-in guests.`);
        }
      } else {
        // For pending/confirmed bookings, check date availability
        const availability = await this.validateDateConflict(
          newRoomId,
          booking.checkIn,
          booking.checkOut,
          bookingId
        );
        
        if (!availability.available) {
          throw new Error('New room is not available for the booking dates. Conflicting bookings exist.');
        }
      }

      // Store old room info for audit
      const oldRoomId = booking.roomId;
      const oldRoom = booking.room;
      const oldBedId = booking.bedId;

      // Update booking with new room
      const updateData = {
        roomId: newRoomId
      };

      // Handle bed assignment for shared rooms
      if (options.newBedId) {
        updateData.bedId = options.newBedId;
      } else if (newRoom.roomType === 'Shared Room' && !options.newBedId) {
        // Clear bed assignment if moving to shared room without specifying bed
        updateData.bedId = null;
      }

      await booking.update(updateData, { transaction });

      // If guest booking is confirmed, update room statuses
      if (booking.status === 'confirmed') {
        // Set old room to vacant_dirty
        await oldRoom.update({ currentStatus: 'vacant_dirty' }, { transaction });
        
        // Set new room to occupied
        await newRoom.update({ currentStatus: 'occupied' }, { transaction });
      }

      // Create audit log entry
      // Requirements: 8.2 - log modification in audit trail
      await BookingAuditLog.logRoomChange(
        bookingId,
        oldRoomId,
        newRoomId,
        performedBy,
        options.notes || options.reason || `Room changed from ${oldRoom?.roomNumber || oldRoom?.title || oldRoomId} to ${newRoom.roomNumber || newRoom.title || newRoomId}`
      );

      // If bed was also changed, log that separately
      if (options.newBedId && oldBedId !== options.newBedId) {
        await BookingAuditLog.logAction(bookingId, 'modified', {
          oldValue: { bedId: oldBedId },
          newValue: { bedId: options.newBedId },
          performedBy,
          notes: 'Bed assignment changed along with room change'
        });
      }

      await transaction.commit();

      // Reload booking with associations
      const updatedBooking = await Booking.findByPk(bookingId, {
        include: [
          { model: Room, as: 'room' },
          { association: 'user' },
          { association: 'guestProfile' }
        ]
      });

      return {
        booking: updatedBooking,
        oldRoom: {
          id: oldRoomId,
          roomNumber: oldRoom?.roomNumber,
          title: oldRoom?.title,
          currentStatus: oldRoom?.currentStatus
        },
        newRoom: {
          id: newRoomId,
          roomNumber: newRoom.roomNumber,
          title: newRoom.title,
          currentStatus: newRoom.currentStatus
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Extend booking duration
   * Requirements: 8.4
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Date} newCheckOut - New check-out date (must be after current check-out)
   * @param {string} performedBy - User ID performing the modification
   * @param {Object} options - Additional options (notes)
   * @returns {Promise<Object>}
   */
  async extendBooking(bookingId, newCheckOut, performedBy, options = {}) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const currentCheckOut = new Date(booking.checkOut);
    const newCheckOutDate = new Date(newCheckOut);

    // Validate that new check-out is after current check-out
    if (newCheckOutDate <= currentCheckOut) {
      throw new Error('New check-out date must be after current check-out date for extension');
    }

    return this.modifyBookingDates(
      bookingId,
      booking.checkIn,
      newCheckOutDate,
      performedBy,
      { ...options, notes: options.notes || 'Booking extended' }
    );
  }

  /**
   * Shorten booking duration
   * Requirements: 8.5
   * 
   * @param {string} bookingId - Booking UUID
   * @param {Date} newCheckOut - New check-out date (must be before current check-out but after check-in)
   * @param {string} performedBy - User ID performing the modification
   * @param {Object} options - Additional options (notes)
   * @returns {Promise<Object>}
   */
  async shortenBooking(bookingId, newCheckOut, performedBy, options = {}) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const currentCheckOut = new Date(booking.checkOut);
    const newCheckOutDate = new Date(newCheckOut);
    const checkInDate = new Date(booking.checkIn);

    // Validate that new check-out is before current check-out
    if (newCheckOutDate >= currentCheckOut) {
      throw new Error('New check-out date must be before current check-out date for shortening');
    }

    // Validate that new check-out is after check-in
    if (newCheckOutDate <= checkInDate) {
      throw new Error('New check-out date must be after check-in date');
    }

    return this.modifyBookingDates(
      bookingId,
      booking.checkIn,
      newCheckOutDate,
      performedBy,
      { ...options, notes: options.notes || 'Booking shortened' }
    );
  }
}

module.exports = new BookingService();
