const express = require('express');
const { sequelize, Booking, Room, User } = require('../../models');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');
const { Op } = require('sequelize');
const router = express.Router();

// @desc    Get bookings for internal management
// @route   GET /api/internal/bookings
// @access  Private
router.get('/internal/bookings', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { propertyId, status, search, startDate, endDate } = req.query;

    try {
      // Build where clause
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      // Add date filtering for check-in date
      if (startDate || endDate) {
        whereClause.checkIn = {};
        if (startDate) {
          whereClause.checkIn[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          whereClause.checkIn[Op.lte] = endDateTime;
        }
      }

      // For property owners, only show their bookings
      // BUT if propertyId is provided, we'll filter by rooms instead (more accurate)
      if (user.role === 'owner' && !propertyId) {
        whereClause.ownerId = user.id;
      }

      // If propertyId is provided, filter by rooms in that property
      // This handles both direct property_id and property_details->>'propertyId' links
      let roomIds = null;
      if (propertyId) {
        const rooms = await sequelize.query(`
          SELECT id FROM rooms 
          WHERE property_details->>'propertyId' = :propertyId
          OR property_id = :propertyId::uuid
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });
        roomIds = rooms.map(r => r.id);
        if (roomIds.length > 0) {
          whereClause.roomId = { [Op.in]: roomIds };
          // For owners, also verify they own this property
          if (user.role === 'owner') {
            // Check if any of these rooms belong to this owner
            const ownerRooms = await sequelize.query(`
              SELECT id FROM rooms WHERE id = ANY(ARRAY[:roomIds]::uuid[]) AND owner_id = :ownerId
            `, {
              replacements: { roomIds, ownerId: user.id },
              type: sequelize.QueryTypes.SELECT
            });
            // Also check if property belongs to this owner
            const [propCheck] = await sequelize.query(`
              SELECT id FROM properties WHERE id = :propertyId AND owner_id = :ownerId
            `, {
              replacements: { propertyId, ownerId: user.id },
              type: sequelize.QueryTypes.SELECT
            });
            if (ownerRooms.length === 0 && !propCheck) {
              return res.status(403).json({ success: false, message: 'Access denied to this property' });
            }
          }
        } else {
          return res.json({ success: true, count: 0, total: 0, page, pages: 1, data: [] });
        }
      }

      // Fetch bookings from database
      const { count, rows: bookings } = await Booking.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'price', 'roomNumber', 'currentStatus', 'propertyDetails']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Transform bookings to match frontend expectations
      const transformedBookings = bookings.map(booking => {
        const roomTitle = booking.room?.title || '';
        // Use room_number field if available, otherwise extract from title
        const roomNumber = booking.room?.roomNumber || booking.room?.room_number || roomTitle.replace('Room ', '') || 'N/A';
        
        // Get contactInfo - try both camelCase and snake_case due to underscored: true
        let contactInfo = booking.contactInfo || booking.contact_info || booking.dataValues?.contactInfo || booking.dataValues?.contact_info;
        if (typeof contactInfo === 'string') {
          try {
            contactInfo = JSON.parse(contactInfo);
          } catch (e) {
            contactInfo = {};
          }
        }
        contactInfo = contactInfo || {};
        
        // Calculate floor number from room number
        const floorNumber = Math.floor(parseInt(roomNumber) / 100) || 1;
        
        return {
          id: booking.id,
          roomId: booking.roomId,
          userId: booking.userId,
          ownerId: booking.ownerId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          totalAmount: parseFloat(booking.totalAmount) || 0,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          bookingSource: booking.bookingSource || 'offline',
          bookingType: booking.bookingType || 'daily',
          specialRequests: booking.specialRequests,
          contactInfo: contactInfo,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          // Nested user object - use contactInfo first, then fall back to user relation
          user: {
            id: booking.user?.id || booking.userId,
            name: contactInfo.name || booking.user?.name || 'Guest',
            email: contactInfo.email || booking.user?.email || '',
            phone: contactInfo.phone || booking.user?.phone || ''
          },
          // Nested room object
          room: {
            id: booking.room?.id || booking.roomId,
            title: roomTitle,
            roomNumber: roomNumber,
            floorNumber: floorNumber,
            currentStatus: booking.room?.currentStatus || booking.room?.current_status || booking.room?.propertyDetails?.currentStatus || 'vacant_clean',
            sharingType: booking.room?.propertyDetails?.sharingType || null,
            totalBeds: parseInt(booking.room?.propertyDetails?.totalBeds) || 1,
          },
          // Also include flat fields for backward compatibility
          guestName: contactInfo.name || booking.user?.name || 'Guest',
          guestPhone: contactInfo.phone || booking.user?.phone || '',
          guestEmail: contactInfo.email || booking.user?.email || '',
          roomNumber: roomNumber,
          floorNumber: floorNumber,
          checkInDate: booking.checkIn,
          checkOutDate: booking.checkOut,
          paidAmount: parseFloat(booking.paidAmount) || 0,
          actualCheckInTime: booking.actualCheckInTime || null,
          actualCheckOutTime: booking.actualCheckOutTime || null,
        };
      });

      res.json({
        success: true,
        count: transformedBookings.length,
        total: count,
        page,
        pages: Math.ceil(count / limit),
        data: transformedBookings
      });
    } catch (dbError) {
      console.error('Database error fetching bookings:', dbError);
      res.json({
        success: true,
        count: 0,
        total: 0,
        page,
        pages: 1,
        data: []
      });
    }
  } catch (error) {
    console.error('Internal bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// @desc    Get pending check-ins
// @route   GET /api/internal/bookings/pending-checkin
// @access  Private
// NOTE: This route MUST be defined BEFORE /internal/bookings/:id to avoid route conflicts
router.get('/internal/bookings/pending-checkin', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;
    const { propertyId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Build where clause for confirmed bookings with check-in today
      const whereClause = {
        status: 'confirmed',
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      };

      if (user.role === 'owner') {
        whereClause.ownerId = user.id;
      }

      // Filter by property if provided
      if (propertyId) {
        const rooms = await sequelize.query(`
          SELECT id FROM rooms WHERE property_details->>'propertyId' = :propertyId
        `, { replacements: { propertyId }, type: sequelize.QueryTypes.SELECT });
        const roomIds = rooms.map(r => r.id);
        if (roomIds.length > 0) {
          whereClause.roomId = { [Op.in]: roomIds };
        } else {
          return res.json({ success: true, data: [] });
        }
      }

      const bookings = await Booking.findAll({
        where: whereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
        ],
        order: [['checkIn', 'ASC']]
      });

      const pendingCheckins = bookings.map(booking => {
        const roomNumber = booking.room?.roomNumber || booking.room?.room_number || booking.room?.title?.replace('Room ', '') || 'N/A';
        return {
          id: booking.id,
          guestName: booking.user?.name || booking.contactInfo?.name || 'Guest',
          guestPhone: booking.contactInfo?.phone || booking.user?.phone || '',
          roomNumber,
          roomId: booking.roomId,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          checkInDate: booking.checkIn,
          checkOutDate: booking.checkOut,
          status: booking.status,
          guests: booking.guests
        };
      });

      res.json({ success: true, data: pendingCheckins });
    } catch (dbError) {
      console.error('Database error fetching pending check-ins:', dbError);
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    console.error('Internal pending check-ins error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending check-ins' });
  }
});

// @desc    Get pending check-outs
// @route   GET /api/internal/bookings/pending-checkout
// @access  Private
// NOTE: This route MUST be defined BEFORE /internal/bookings/:id to avoid route conflicts
router.get('/internal/bookings/pending-checkout', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;
    const { propertyId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Build where clause for confirmed bookings with check-out today
      const whereClause = {
        status: 'confirmed',
        checkOut: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      };

      if (user.role === 'owner') {
        whereClause.ownerId = user.id;
      }

      // Filter by property if provided
      if (propertyId) {
        const rooms = await sequelize.query(`
          SELECT id FROM rooms WHERE property_details->>'propertyId' = :propertyId
        `, { replacements: { propertyId }, type: sequelize.QueryTypes.SELECT });
        const roomIds = rooms.map(r => r.id);
        if (roomIds.length > 0) {
          whereClause.roomId = { [Op.in]: roomIds };
        } else {
          return res.json({ success: true, data: [] });
        }
      }

      const bookings = await Booking.findAll({
        where: whereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
        ],
        order: [['checkOut', 'ASC']]
      });

      const pendingCheckouts = bookings.map(booking => {
        const roomNumber = booking.room?.roomNumber || booking.room?.room_number || booking.room?.title?.replace('Room ', '') || 'N/A';
        return {
          id: booking.id,
          guestName: booking.user?.name || booking.contactInfo?.name || 'Guest',
          guestPhone: booking.contactInfo?.phone || booking.user?.phone || '',
          roomNumber,
          roomId: booking.roomId,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          checkInDate: booking.checkIn,
          checkOutDate: booking.checkOut,
          status: booking.status,
          guests: booking.guests
        };
      });

      res.json({ success: true, data: pendingCheckouts });
    } catch (dbError) {
      console.error('Database error fetching pending check-outs:', dbError);
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    console.error('Internal pending check-outs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending check-outs' });
  }
});

// @desc    Get single booking by ID
// @route   GET /api/internal/bookings/:id
// @access  Private
router.get('/internal/bookings/:id', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    // No bookings exist yet - return 404
    res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  } catch (error) {
    console.error('Internal booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking details'
    });
  }
});

// @desc    Cancel booking
// @route   POST /api/internal/bookings/:id/cancel
// @access  Private
router.post('/internal/bookings/:id/cancel', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Find the booking
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    // Update booking status to cancelled
    await booking.update({
      status: 'cancelled',
      specialRequests: reason ? (booking.specialRequests ? `${booking.specialRequests}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`) : booking.specialRequests
    });

    // If room was occupied, set it back to vacant_dirty
    if (booking.roomId && booking.actualCheckInTime) {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'vacant_dirty', updated_at = NOW() WHERE id = $1`,
        { bind: [booking.roomId] }
      );
    }

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const roomNumber = updatedBooking.room?.roomNumber || updatedBooking.room?.title?.replace('Room ', '') || 'N/A';
    const contactInfo = updatedBooking.contactInfo || {};

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        id: updatedBooking.id,
        roomId: updatedBooking.roomId,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        totalAmount: parseFloat(updatedBooking.totalAmount) || 0,
        guests: updatedBooking.guests,
        specialRequests: updatedBooking.specialRequests,
        user: {
          id: updatedBooking.user?.id,
          name: contactInfo.name || updatedBooking.user?.name || 'Guest',
          email: contactInfo.email || updatedBooking.user?.email || '',
          phone: contactInfo.phone || updatedBooking.user?.phone || ''
        },
        room: {
          id: updatedBooking.room?.id,
          roomNumber: roomNumber,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: updatedBooking.room?.currentStatus || 'vacant_clean'
        }
      }
    });
  } catch (error) {
    console.error('Internal booking cancellation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling booking'
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/internal/bookings/:id/status
// @access  Private
router.put('/internal/bookings/:id/status', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the booking
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    await booking.update({ status });

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const roomNumber = updatedBooking.room?.roomNumber || updatedBooking.room?.title?.replace('Room ', '') || 'N/A';
    const contactInfo = updatedBooking.contactInfo || {};

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: {
        id: updatedBooking.id,
        roomId: updatedBooking.roomId,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        totalAmount: parseFloat(updatedBooking.totalAmount) || 0,
        guests: updatedBooking.guests,
        specialRequests: updatedBooking.specialRequests,
        user: {
          id: updatedBooking.user?.id,
          name: contactInfo.name || updatedBooking.user?.name || 'Guest',
          email: contactInfo.email || updatedBooking.user?.email || '',
          phone: contactInfo.phone || updatedBooking.user?.phone || ''
        },
        room: {
          id: updatedBooking.room?.id,
          roomNumber: roomNumber,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: updatedBooking.room?.currentStatus || 'vacant_clean'
        }
      }
    });
  } catch (error) {
    console.error('Internal booking status update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating booking status'
    });
  }
});

// @desc    Check in booking
// @route   POST /api/internal/bookings/:id/checkin
// @access  Private
router.post('/internal/bookings/:id/checkin', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { securityDepositAmount, securityDepositMethod, notes, paidAmount, paymentStatus } = req.body;

    // Find the booking
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be checked in
    if (booking.actualCheckInTime) {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been checked in'
      });
    }

    // Update booking with check-in details
    const now = new Date();
    const updateData = {
      status: 'confirmed',
      actualCheckInTime: now,
      checkInBy: user.id,
      specialRequests: notes ? (booking.specialRequests ? `${booking.specialRequests}\n\nCheck-in notes: ${notes}` : `Check-in notes: ${notes}`) : booking.specialRequests
    };

    if (paidAmount !== undefined) {
      updateData.paidAmount = parseFloat(paidAmount) + parseFloat(booking.paidAmount || 0);
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    await booking.update(updateData);

    // Update room status to occupied
    if (booking.roomId) {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'occupied',
          property_details = property_details || '{"currentStatus":"occupied"}'::jsonb,
          updated_at = NOW() WHERE id = $1`,
        { bind: [booking.roomId] }
      );
    }

    // Handle security deposit if provided
    if (securityDepositAmount && parseFloat(securityDepositAmount) > 0) {
      try {
        // Create deposit record
        await sequelize.query(`
          INSERT INTO deposits (id, booking_id, amount, payment_method, status, collected_date, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'collected', NOW(), NOW(), NOW())
          ON CONFLICT (booking_id) DO UPDATE SET
            amount = $3,
            payment_method = $4,
            status = 'collected',
            collected_date = NOW(),
            updated_at = NOW()
        `, {
          bind: [require('uuid').v4(), id, parseFloat(securityDepositAmount), securityDepositMethod || 'cash']
        });
      } catch (depositError) {
        console.error('Error creating deposit:', depositError);
        // Continue even if deposit creation fails
      }
    }

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const roomNumber = updatedBooking.room?.roomNumber || updatedBooking.room?.title?.replace('Room ', '') || 'N/A';
    const contactInfo = updatedBooking.contactInfo || {};

    res.json({
      success: true,
      message: 'Booking checked in successfully',
      data: {
        id: updatedBooking.id,
        roomId: updatedBooking.roomId,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        totalAmount: parseFloat(updatedBooking.totalAmount) || 0,
        guests: updatedBooking.guests,
        specialRequests: updatedBooking.specialRequests,
        actualCheckInTime: updatedBooking.actualCheckInTime,
        checkInBy: updatedBooking.checkInBy,
        user: {
          id: updatedBooking.user?.id,
          name: contactInfo.name || updatedBooking.user?.name || 'Guest',
          email: contactInfo.email || updatedBooking.user?.email || '',
          phone: contactInfo.phone || updatedBooking.user?.phone || ''
        },
        room: {
          id: updatedBooking.room?.id,
          roomNumber: roomNumber,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: 'occupied'
        }
      }
    });
  } catch (error) {
    console.error('Internal booking check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking in booking'
    });
  }
});

// @desc    Check out booking
// @route   POST /api/internal/bookings/:id/checkout
// @access  Private
router.post('/internal/bookings/:id/checkout', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { notes, refundDeposit, deductions } = req.body;

    // Find the booking
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking has been checked in
    if (!booking.actualCheckInTime) {
      return res.status(400).json({
        success: false,
        message: 'Booking has not been checked in yet'
      });
    }

    // Check if booking has already been checked out
    if (booking.actualCheckOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been checked out'
      });
    }

    // Update booking with check-out details
    const now = new Date();
    await booking.update({
      status: 'completed',
      actualCheckOutTime: now,
      checkOutBy: user.id,
      specialRequests: notes ? (booking.specialRequests ? `${booking.specialRequests}\n\nCheck-out notes: ${notes}` : `Check-out notes: ${notes}`) : booking.specialRequests
    });

    // Update room status to vacant_dirty (needs cleaning after checkout)
    if (booking.roomId) {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'vacant_dirty',
          property_details = property_details || '{"currentStatus":"vacant_dirty"}'::jsonb,
          updated_at = NOW() WHERE id = $1`,
        { bind: [booking.roomId] }
      );
    }

    // Handle security deposit refund if applicable
    if (refundDeposit) {
      try {
        const deductionAmount = deductions ? parseFloat(deductions) : 0;
        await sequelize.query(`
          UPDATE deposits 
          SET status = 'refunded', 
              refund_date = NOW(), 
              refunded_by = $1,
              deductions = $2,
              updated_at = NOW()
          WHERE booking_id = $3
        `, {
          bind: [user.id, deductionAmount, id]
        });
      } catch (depositError) {
        console.error('Error updating deposit:', depositError);
        // Continue even if deposit update fails
      }
    }

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const roomNumber = updatedBooking.room?.roomNumber || updatedBooking.room?.title?.replace('Room ', '') || 'N/A';
    const contactInfo = updatedBooking.contactInfo || {};

    res.json({
      success: true,
      message: 'Booking checked out successfully',
      data: {
        id: updatedBooking.id,
        roomId: updatedBooking.roomId,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        totalAmount: parseFloat(updatedBooking.totalAmount) || 0,
        guests: updatedBooking.guests,
        specialRequests: updatedBooking.specialRequests,
        actualCheckInTime: updatedBooking.actualCheckInTime,
        actualCheckOutTime: updatedBooking.actualCheckOutTime,
        checkInBy: updatedBooking.checkInBy,
        checkOutBy: updatedBooking.checkOutBy,
        user: {
          id: updatedBooking.user?.id,
          name: contactInfo.name || updatedBooking.user?.name || 'Guest',
          email: contactInfo.email || updatedBooking.user?.email || '',
          phone: contactInfo.phone || updatedBooking.user?.phone || ''
        },
        room: {
          id: updatedBooking.room?.id,
          roomNumber: roomNumber,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: 'vacant_dirty'
        }
      }
    });
  } catch (error) {
    console.error('Internal booking check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking out booking'
    });
  }
});

// @desc    Create new booking
// @route   POST /api/internal/bookings
// @access  Private
router.post('/internal/bookings', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const user = req.user;
    const bookingData = req.body;
    console.log('Creating booking with data:', bookingData);

    // Validate required fields
    if (!bookingData.roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    if (!bookingData.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date is required'
      });
    }

    // Get room details to find owner
    const [rooms] = await sequelize.query(
      `SELECT id, title, price, owner_id, property_details FROM rooms WHERE id = $1`,
      { bind: [bookingData.roomId] }
    );

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = rooms[0];
    const propertyDetails = room.property_details || {};

    // Get the property owner (not the room owner) for proper booking association
    let propertyOwnerId = room.owner_id;
    if (propertyDetails.propertyId) {
      const [properties] = await sequelize.query(
        `SELECT owner_id FROM properties WHERE id = $1`,
        { bind: [propertyDetails.propertyId] }
      );
      if (properties && properties.length > 0) {
        propertyOwnerId = properties[0].owner_id;
      }
    }
    // Create or find guest user
    let guestUserId = user.id; // Default to current user
    if (bookingData.guestPhone || bookingData.guestEmail) {
      // Check if guest exists
      const [existingGuests] = await sequelize.query(
        `SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1`,
        { bind: [bookingData.guestEmail || '', bookingData.guestPhone || ''] }
      );
      
      if (existingGuests && existingGuests.length > 0) {
        guestUserId = existingGuests[0].id;
      }
    }

    // Calculate check-out date if not provided (default 30 days for monthly)
    const checkIn = new Date(bookingData.checkIn);
    let checkOut;
    if (bookingData.checkOut) {
      checkOut = new Date(bookingData.checkOut);
    } else if (bookingData.bookingType === 'monthly') {
      checkOut = new Date(checkIn);
      checkOut.setMonth(checkOut.getMonth() + 1);
    } else {
      checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
    }

    // Calculate total amount based on booking type
    let totalAmount = bookingData.totalAmount;
    if (!totalAmount) {
      if (bookingData.bookingType === 'monthly') {
        // Use monthly rate for monthly bookings
        totalAmount = propertyDetails.monthlyRate || (propertyDetails.dailyRate * 30) || room.price * 30 || 0;
      } else {
        // Calculate daily rate * number of days
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const dailyRate = propertyDetails.dailyRate || room.price || 0;
        totalAmount = dailyRate * days;
      }
    }

    // Create booking in database
    const bookingId = require('uuid').v4();
    
    // Extract bed number from virtual bed ID (e.g., "uuid-bed-1" -> 1)
    let bedNumber = null;
    if (bookingData.bedId && bookingData.bedId.includes('-bed-')) {
      const parts = bookingData.bedId.split('-bed-');
      bedNumber = parseInt(parts[1]) || null;
    }

    const bookingType = bookingData.bookingType || 'daily';
    
    const [result] = await sequelize.query(`
      INSERT INTO bookings (
        id, room_id, room_id_old, user_id, owner_id, check_in, check_out, 
        guests, total_amount, paid_amount, status, payment_status,
        booking_type, booking_source,
        special_requests, contact_info,
        created_at, updated_at
      ) VALUES (
        $1, $2, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, $11,
        $12, $13,
        $14, $15,
        NOW(), NOW()
      ) RETURNING *
    `, {
      bind: [
        bookingId,
        bookingData.roomId,
        guestUserId,
        propertyOwnerId || user.id,
        checkIn,
        checkOut,
        bookingData.guests || 1,
        totalAmount,
        bookingData.paidAmount || (bookingData.paymentStatus === 'paid' ? totalAmount : 0),
        'confirmed',
        bookingData.paymentStatus || 'pending',
        bookingType,
        'offline',
        bookingData.specialRequests || null,
        JSON.stringify({
          name: bookingData.guestName || 'Walk-in Guest',
          phone: bookingData.guestPhone || '',
          email: bookingData.guestEmail || '',
          bedNumber: bedNumber,
          bookingType: bookingType
        })
      ]
    });

    // Mark room as occupied and update bed counts in property_details
    try {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'occupied', updated_at = NOW() WHERE id = $1`,
        { bind: [bookingData.roomId] }
      );

      // Update occupiedBeds / availableBeds in property_details JSONB
      const totalBeds = parseInt(propertyDetails.totalBeds) || 1;
      const [activeBookingsResult] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM bookings
         WHERE room_id = $1 AND status NOT IN ('cancelled','completed','refunded')`,
        { bind: [bookingData.roomId] }
      );
      const occupiedBeds = parseInt(activeBookingsResult[0]?.cnt) || 1;
      const availableBeds = Math.max(0, totalBeds - occupiedBeds);

      await sequelize.query(
        `UPDATE rooms
         SET property_details = property_details
           || jsonb_build_object(
               'occupiedBeds', $1::int,
               'availableBeds', $2::int,
               'currentStatus', CASE WHEN $2::int = 0 THEN 'occupied' ELSE 'occupied' END
             ),
           updated_at = NOW()
         WHERE id = $3`,
        { bind: [occupiedBeds, availableBeds, bookingData.roomId] }
      );
    } catch (roomUpdateError) {
      console.error('Warning: failed to update room status after booking creation:', roomUpdateError.message);
      // Don't fail the booking — room status update is best-effort
    }

    // Get room title for response
    const roomNumber = (room.title || '').replace('Room ', '');

    const newBooking = {
      id: bookingId,
      guestName: bookingData.guestName || 'Walk-in Guest',
      guestPhone: bookingData.guestPhone || '',
      guestEmail: bookingData.guestEmail || '',
      roomId: bookingData.roomId,
      roomNumber: roomNumber,
      floorNumber: propertyDetails.floorNumber || 1,
      checkInDate: checkIn.toISOString().split('T')[0],
      checkOutDate: checkOut.toISOString().split('T')[0],
      status: 'confirmed',
      paymentStatus: bookingData.paymentStatus || 'pending',
      totalAmount: totalAmount,
      paidAmount: bookingData.paymentStatus === 'paid' ? totalAmount : 0,
      guests: bookingData.guests || 1,
      specialRequests: bookingData.specialRequests || null,
      bedId: bookingData.bedId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Booking created successfully:', newBooking.id);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: newBooking
    });
  } catch (error) {
    console.error('Internal booking creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating booking',
      error: error.message
    });
  }
});

// @desc    Update booking details
// @route   PUT /api/internal/bookings/:id
// @access  Private
router.put('/internal/bookings/:id', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Prepare fields to update
    const fieldsToUpdate = {};
    
    if (updateData.checkIn) fieldsToUpdate.checkIn = updateData.checkIn;
    if (updateData.checkOut) fieldsToUpdate.checkOut = updateData.checkOut;
    if (updateData.guests) fieldsToUpdate.guests = updateData.guests;
    if (updateData.totalAmount !== undefined) fieldsToUpdate.totalAmount = updateData.totalAmount;
    if (updateData.paidAmount !== undefined) fieldsToUpdate.paidAmount = updateData.paidAmount;
    if (updateData.paymentStatus) fieldsToUpdate.paymentStatus = updateData.paymentStatus;
    if (updateData.specialRequests !== undefined) fieldsToUpdate.specialRequests = updateData.specialRequests;
    
    // Update contact info if provided
    if (updateData.guestName || updateData.guestPhone || updateData.guestEmail) {
      const currentContact = booking.contactInfo || {};
      fieldsToUpdate.contactInfo = {
        ...currentContact,
        name: updateData.guestName || currentContact.name,
        phone: updateData.guestPhone || currentContact.phone,
        email: updateData.guestEmail || currentContact.email
      };
      
      // Update user name/email/phone as well if needed
      if (booking.userId) {
        await User.update({
          name: updateData.guestName || undefined,
          phone: updateData.guestPhone || undefined
        }, { where: { id: booking.userId } });
      }
    }

    await booking.update(fieldsToUpdate);

    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Internal booking update error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating booking' });
  }
});

// @desc    Change room for booking
// @route   POST /api/internal/bookings/:id/change-room
// @access  Private
router.post('/internal/bookings/:id/change-room', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newRoomId, reason } = req.body;

    if (!newRoomId) {
      return res.status(400).json({
        success: false,
        message: 'New room ID is required'
      });
    }

    // Find the booking
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the new room
    const newRoom = await Room.findByPk(newRoomId);
    if (!newRoom) {
      return res.status(404).json({
        success: false,
        message: 'New room not found'
      });
    }

    // Check if new room is available
    const newRoomStatus = newRoom.currentStatus || newRoom.current_status;
    if (newRoomStatus === 'occupied' || newRoomStatus === 'maintenance' || newRoomStatus === 'blocked') {
      return res.status(400).json({
        success: false,
        message: `Room is not available (status: ${newRoomStatus})`
      });
    }

    const oldRoomId = booking.roomId;

    // Update booking with new room
    await booking.update({
      roomId: newRoomId,
      specialRequests: reason ? (booking.specialRequests ? `${booking.specialRequests}\n\nRoom changed: ${reason}` : `Room changed: ${reason}`) : booking.specialRequests
    });

    // If guest was checked in, update room statuses
    if (booking.actualCheckInTime && !booking.actualCheckOutTime) {
      // Set old room to vacant_dirty
      if (oldRoomId) {
        await sequelize.query(
          `UPDATE rooms SET current_status = 'vacant_dirty', updated_at = NOW() WHERE id = $1`,
          { bind: [oldRoomId] }
        );
      }
      // Set new room to occupied
      await sequelize.query(
        `UPDATE rooms SET current_status = 'occupied', updated_at = NOW() WHERE id = $1`,
        { bind: [newRoomId] }
      );
    }

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'currentStatus'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const roomNumber = updatedBooking.room?.roomNumber || updatedBooking.room?.title?.replace('Room ', '') || 'N/A';
    const contactInfo = updatedBooking.contactInfo || {};

    res.json({
      success: true,
      message: 'Room changed successfully',
      data: {
        id: updatedBooking.id,
        roomId: updatedBooking.roomId,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        totalAmount: parseFloat(updatedBooking.totalAmount) || 0,
        guests: updatedBooking.guests,
        specialRequests: updatedBooking.specialRequests,
        user: {
          id: updatedBooking.user?.id,
          name: contactInfo.name || updatedBooking.user?.name || 'Guest',
          email: contactInfo.email || updatedBooking.user?.email || '',
          phone: contactInfo.phone || updatedBooking.user?.phone || ''
        },
        room: {
          id: updatedBooking.room?.id,
          roomNumber: roomNumber,
          floorNumber: Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: updatedBooking.room?.currentStatus || 'vacant_clean'
        }
      }
    });
  } catch (error) {
    console.error('Internal room change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing room'
    });
  }
});

module.exports = router;

// ==================== ADMIN BOOKING MANAGEMENT ====================

// @desc    Admin: Assign/reassign room and bed to a booking
// @route   PUT /api/internal/bookings/:id/assign-room
// @access  Private (admin, owner, superuser)
router.put('/internal/bookings/:id/assign-room', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { roomId, bedNumber, notes } = req.body;
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const updateData = {};
    if (roomId) updateData.roomId = roomId;
    if (bedNumber !== undefined) updateData.bedId = bedNumber;

    await booking.update(updateData);

    // Update room occupancy counts
    if (roomId) {
      const room = await Room.findByPk(roomId);
      if (room && room.propertyDetails) {
        const pd = { ...room.propertyDetails };
        const activeBookings = await Booking.count({
          where: {
            roomId,
            status: { [Op.notIn]: ['cancelled', 'completed', 'refunded'] }
          }
        });
        pd.occupiedBeds = activeBookings;
        pd.availableBeds = Math.max(0, (parseInt(pd.totalBeds) || 1) - activeBookings);
        await room.update({ propertyDetails: pd });
      }
    }

    const updated = await Booking.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'propertyDetails'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.json({ success: true, message: 'Room assigned successfully', data: updated });
  } catch (error) {
    console.error('Assign room error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error assigning room' });
  }
});

// @desc    Admin: Update booking price and type
// @route   PUT /api/internal/bookings/:id/update-pricing
// @access  Private (admin, owner, superuser)
router.put('/internal/bookings/:id/update-pricing', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { totalAmount, bookingType, paidAmount, notes } = req.body;
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const updateData = {};
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (bookingType) updateData.bookingType = bookingType;
    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount;
      updateData.paymentStatus = paidAmount >= (totalAmount || booking.totalAmount) ? 'paid' : 'pending';
    }

    await booking.update(updateData);
    res.json({ success: true, message: 'Pricing updated', data: await Booking.findByPk(req.params.id) });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating pricing' });
  }
});

// @desc    Admin: Get available rooms/beds for a date range (for assignment)
// @route   GET /api/internal/bookings/available-rooms
// @access  Private
router.get('/internal/bookings/available-rooms', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, sharingType } = req.query;
    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'propertyId, checkIn, checkOut are required' });
    }

    const [rooms] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.price,
        r.property_details->>'sharingType' as sharing_type,
        COALESCE((r.property_details->>'totalBeds')::int, 1) as total_beds,
        COALESCE((r.property_details->>'monthlyRate')::numeric, r.price) as monthly_rate,
        (
          SELECT COUNT(*) FROM bookings b
          WHERE b.room_id = r.id
          AND b.status NOT IN ('cancelled', 'completed', 'refunded')
          AND b.check_in < $3 AND b.check_out > $2
        ) as booked_beds,
        COALESCE((r.property_details->>'totalBeds')::int, 1) - (
          SELECT COUNT(*) FROM bookings b
          WHERE b.room_id = r.id
          AND b.status NOT IN ('cancelled', 'completed', 'refunded')
          AND b.check_in < $3 AND b.check_out > $2
        ) as available_beds
      FROM rooms r
      WHERE r.is_active = true AND r.approval_status = 'approved'
      AND (r.property_details->>'propertyId' = $1 OR r.property_id = $1::uuid)
      ${sharingType ? `AND r.property_details->>'sharingType' = '${sharingType}'` : ''}
      HAVING COALESCE((r.property_details->>'totalBeds')::int, 1) > (
        SELECT COUNT(*) FROM bookings b
        WHERE b.room_id = r.id
        AND b.status NOT IN ('cancelled', 'completed', 'refunded')
        AND b.check_in < $3 AND b.check_out > $2
      )
      ORDER BY r.title
    `, { bind: [propertyId, checkIn, checkOut] });

    res.json({
      success: true,
      data: rooms.map(r => ({
        id: r.id,
        title: r.title,
        sharingType: r.sharing_type,
        totalBeds: parseInt(r.total_beds),
        bookedBeds: parseInt(r.booked_beds),
        availableBeds: parseInt(r.available_beds),
        price: parseFloat(r.price),
        monthlyRate: parseFloat(r.monthly_rate)
      }))
    });
  } catch (error) {
    console.error('Available rooms error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching available rooms' });
  }
});

// @desc    Admin: Create a manual/walk-in booking with room assignment
// @route   POST /api/internal/bookings/manual
// @access  Private (admin, owner, superuser)
router.post('/internal/bookings/manual', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const {
      roomId, guestName, guestEmail, guestPhone,
      checkIn, checkOut, totalAmount, bookingType,
      notes, bedNumber
    } = req.body;

    if (!roomId || !guestName || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'roomId, guestName, checkIn, checkOut are required' });
    }

    const room = await Room.findByPk(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    // Find or create guest user
    let user = guestEmail ? await User.findOne({ where: { email: guestEmail } }) : null;
    if (!user && guestEmail) {
      const tempPwd = Math.random().toString(36).slice(-8) + 'A1!';
      user = await User.create({
        name: guestName,
        email: guestEmail,
        phone: guestPhone ? guestPhone.replace(/[^0-9+]/g, '') : null,
        password: tempPwd,
        role: 'user',
        isVerified: true
      });
    }

    // Generate booking number
    const bookingNumber = `GR-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(-4).toUpperCase()}`;

    const booking = await Booking.create({
      roomId,
      bedId: bedNumber || null,
      userId: user?.id || req.user.id,
      ownerId: room.ownerId,
      propertyId: room.propertyId || room.propertyDetails?.propertyId || null,
      bookingNumber,
      bookingSource: 'offline',
      bookingType: bookingType || 'monthly',
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: 1,
      totalAmount: totalAmount || room.price,
      paidAmount: 0,
      status: 'confirmed',
      paymentStatus: 'pending',
      specialRequests: notes || '',
      contactInfo: {
        name: guestName,
        email: guestEmail || '',
        phone: guestPhone || ''
      }
    });

    // Update room occupancy
    if (room.propertyDetails) {
      const pd = { ...room.propertyDetails };
      const activeBookings = await Booking.count({
        where: { roomId, status: { [Op.notIn]: ['cancelled', 'completed', 'refunded'] } }
      });
      pd.occupiedBeds = activeBookings;
      pd.availableBeds = Math.max(0, (parseInt(pd.totalBeds) || 1) - activeBookings);
      await room.update({ propertyDetails: pd });
    }

    res.status(201).json({ success: true, message: 'Manual booking created', data: booking });
  } catch (error) {
    console.error('Manual booking error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating booking' });
  }
});
