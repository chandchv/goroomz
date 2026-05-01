const express = require('express');
const { Op } = require('sequelize');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const GuestProfile = require('../models/GuestProfile');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { 
  validateBooking, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const { body, query } = require('express-validator');
const crypto = require('crypto');
const bookingService = require('../services/bookingService');
const instantCheckInService = require('../services/instantCheckInService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Helper function to generate random password
const generatePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// Validation for enhanced booking creation
const validateEnhancedBooking = [
  body('room').isUUID().withMessage('Valid room ID is required'),
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('guests').isInt({ min: 1, max: 10 }).withMessage('Number of guests must be between 1 and 10'),
  body('contactInfo.phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('contactInfo.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('bookingSource').optional().isIn(['online', 'offline', 'walk_in']).withMessage('Invalid booking source'),
  body('bookingType').optional().isIn(['daily', 'monthly']).withMessage('Invalid booking type'),
  body('propertyId').optional().isUUID().withMessage('Valid property ID is required'),
  body('bedId').optional().isUUID().withMessage('Valid bed ID is required')
];

// Validation for instant check-in
const validateInstantCheckIn = [
  body('roomId').isUUID().withMessage('Valid room ID is required'),
  body('propertyId').optional({ checkFalsy: true }).isString().withMessage('Valid property ID is required'),
  body('ownerId').optional({ checkFalsy: true }).isString().withMessage('Valid owner ID is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('guestInfo.name').trim().isLength({ min: 2 }).withMessage('Guest name is required (min 2 characters)'),
  body('guestInfo.phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('guestInfo.email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('bedId').optional({ checkFalsy: true }).isString().withMessage('Valid bed ID is required'),
  body('guests').optional().isInt({ min: 1, max: 10 }).withMessage('Number of guests must be between 1 and 10'),
  body('deposit.amount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Deposit amount must be a positive number'),
  body('deposit.method').optional({ checkFalsy: true }).isIn(['cash', 'card', 'upi', 'bank_transfer']).withMessage('Invalid payment method')
];

// @desc    Create guest booking (without authentication)
// @route   POST /api/bookings/guest
// @access  Public
// Requirements: 11.1, 11.2, 11.3, 11.4
router.post('/guest', async (req, res) => {
  try {
    const { room, checkIn, checkOut, guests, name, email, phone, specialRequests, paymentStatus, totalAmount: clientTotalAmount, sharingType } = req.body;

    // Validate required fields
    if (!room || !checkIn || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: room, checkIn, name, email, phone'
      });
    }

    // Check if room exists and is available
    // The ID might be a property ID instead of a room ID
    let roomData = await Room.findByPk(room, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Property, as: 'property', attributes: ['id', 'name'] }
      ]
    });
    
    // If not found as a room, try finding a room linked to this property
    if (!roomData) {
      const { sequelize } = require('../models');
      const checkInDate = new Date(checkIn);
      const checkOutDate = checkOut ? new Date(checkOut) : new Date(checkInDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      try {
        // Find available rooms with free beds for this property
        // For PG: a room is available if active bookings < total beds (bed-level availability)
        const checkInISO = checkInDate.toISOString();
        const checkOutISO = checkOutDate.toISOString();
        const availabilityFilter = `
          AND (
            COALESCE((property_details->>'totalBeds')::int, 1) > (
              SELECT COUNT(*) FROM bookings b
              WHERE b.room_id = rooms.id
              AND b.status NOT IN ('cancelled', 'completed', 'refunded')
              AND b.check_in < '${checkOutISO}'
              AND b.check_out > '${checkInISO}'
            )
          )
        `;

        let roomQuery = `
          SELECT id FROM rooms 
          WHERE is_active = true AND approval_status = 'approved'
          AND (property_details->>'propertyId' = $1 OR property_id = $1::uuid)
          ${availabilityFilter}
        `;
        const bindParams = [room];
        
        if (sharingType) {
          const sharingMap = { 'single': 'single', 'double': '2_sharing', 'triple': '3_sharing', 'quad': '4_sharing' };
          const dbSharingType = sharingMap[sharingType] || sharingType;
          roomQuery += ` AND property_details->>'sharingType' = $2 ORDER BY price ASC LIMIT 1`;
          bindParams.push(dbSharingType);
        } else {
          roomQuery += ` ORDER BY price ASC LIMIT 1`;
        }

        const [propertyRooms] = await sequelize.query(roomQuery, { bind: bindParams });
        
        // If no available room with sharing type, try any available room of same type
        if ((!propertyRooms || propertyRooms.length === 0) && sharingType) {
          const [fallbackRooms] = await sequelize.query(`
            SELECT id FROM rooms 
            WHERE is_active = true AND approval_status = 'approved'
            AND (property_details->>'propertyId' = $1 OR property_id = $1::uuid)
            ${availabilityFilter}
            ORDER BY price ASC LIMIT 1
          `, { bind: [room] });
          if (fallbackRooms && fallbackRooms.length > 0) {
            roomData = await Room.findByPk(fallbackRooms[0].id, {
              include: [
                { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone'] },
                { model: Property, as: 'property', attributes: ['id', 'name'] }
              ]
            });
          }
        } else if (propertyRooms && propertyRooms.length > 0) {
          roomData = await Room.findByPk(propertyRooms[0].id, {
            include: [
              { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone'] },
              { model: Property, as: 'property', attributes: ['id', 'name'] }
            ]
          });
        }
      } catch (propErr) {
        console.warn('Property room lookup failed:', propErr.message);
      }
    }
    
    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!roomData.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for booking'
      });
    }

    // Check or create user
    // Normalize phone: keep digits and optional leading +
    const sanitizedPhone = phone ? phone.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '') : null;
    
    // Look up by email first, then by phone to avoid duplicate constraint errors
    let user = await User.findOne({ where: { email } });
    if (!user && sanitizedPhone) {
      user = await User.findOne({ where: { phone: sanitizedPhone } });
      if (user) {
        // Found by phone — update email if different
        if (user.email !== email.toLowerCase()) {
          console.log(`Found user by phone, email mismatch: ${user.email} vs ${email}`);
        }
      }
    }
    let generatedPassword = null;
    let isNewUser = false;

    if (!user) {
      // Create new user with generated password
      generatedPassword = generatePassword();
      isNewUser = true;

      user = await User.create({
        name,
        email,
        phone: sanitizedPhone,
        password: generatedPassword,
        role: 'user',
        isVerified: false
      });

      console.log(`New user created for booking: ${email}`);
    } else {
      // Update phone if provided and different
      if (sanitizedPhone && user.phone !== sanitizedPhone) {
        await user.update({ phone: sanitizedPhone });
      }
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = checkOut ? new Date(checkOut) : null;

    if (checkInDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    if (checkOutDate && checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // For monthly bookings, set check-out to 30 days later if not provided
    const finalCheckOut = checkOutDate || new Date(checkInDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Extract 10-digit phone for validation
    const phoneFor10Digits = sanitizedPhone.replace(/[^0-9]/g, '').slice(-10);

    // Validate phone
    if (phoneFor10Digits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Use booking service to create booking with status 'pending' for online bookings
    // Requirements: 11.1, 11.2, 11.9
    const booking = await bookingService.createBooking({
      roomId: roomData.id,
      userId: user.id,
      ownerId: roomData.ownerId,
      propertyId: roomData.propertyId,
      checkIn: checkInDate,
      checkOut: finalCheckOut,
      guests: guests || 1,
      totalAmount: clientTotalAmount || undefined,
      contactInfo: {
        name,
        phone: phoneFor10Digits,
        email: email.trim()
      },
      specialRequests: specialRequests || '',
      bookingSource: 'online',
      bookingType: roomData.pricingType || 'daily',
      // Online bookings start as 'pending' - Requirement 11.1
      status: 'pending',
      // Handle payment status from online payment - Requirement 11.9
      paymentStatus: paymentStatus || 'pending'
    });
    
    // Populate the booking with room and user details
    const populatedBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'location', 'price', 'images']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    // Send notifications - Requirements: 11.3, 11.4
    try {
      await notificationService.sendOnlineBookingCreatedNotification({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        guestName: name,
        guestEmail: email.trim(),
        checkIn: checkInDate,
        checkOut: finalCheckOut,
        guests: guests || 1,
        totalAmount: booking.totalAmount,
        specialRequests: specialRequests || '',
        propertyName: roomData.property?.name || 'Property',
        roomTitle: roomData.title,
        ownerName: roomData.owner?.name,
        ownerEmail: roomData.owner?.email,
        ownerId: roomData.ownerId
      });
    } catch (notificationError) {
      // Log notification error but don't fail the booking
      console.error('Failed to send booking notifications:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: isNewUser 
        ? 'Booking created successfully! An account has been created for you. Check your email for login credentials.'
        : 'Booking created successfully!',
      data: {
        booking: populatedBooking,
        ...(isNewUser && generatedPassword ? {
          credentials: {
            email,
            password: generatedPassword,
            message: 'Please save these credentials. You can use them to login and track your bookings.'
          }
        } : {})
      }
    });
  } catch (error) {
    console.error('Create guest booking error:', error);

    // Provide user-friendly error messages for common DB constraint violations
    let userMessage = 'Error creating booking. Please try again.';
    if (error.parent?.code === '23505') {
      // Unique constraint violation
      const detail = error.parent?.detail || '';
      if (detail.includes('phone')) {
        userMessage = 'This phone number is already registered with another account. Please use a different phone number or log in with your existing account.';
      } else if (detail.includes('email')) {
        userMessage = 'This email is already registered. Please log in with your existing account.';
      } else {
        userMessage = 'An account with these details already exists. Please try with different information.';
      }
    } else if (error.message?.includes('not available')) {
      userMessage = error.message;
    } else if (error.message?.includes('not found')) {
      userMessage = error.message;
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new booking (enhanced with booking_source, booking_type)
// @route   POST /api/bookings
// @access  Private
// Requirements: 1.1, 1.6, 2.3
router.post('/', protect, validateEnhancedBooking, handleValidationErrors, async (req, res) => {
  try {
    const { 
      room, 
      checkIn, 
      checkOut, 
      guests, 
      contactInfo, 
      specialRequests,
      bookingSource = 'offline',
      bookingType = 'daily',
      propertyId,
      bedId
    } = req.body;

    // Check if room exists and is available
    const roomData = await Room.findByPk(room);
    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!roomData.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for booking'
      });
    }

    // Check if room owner is trying to book their own room
    if (roomData.ownerId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own room'
      });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // Use booking service to create booking with enhanced fields
    const booking = await bookingService.createBooking({
      roomId: room,
      bedId,
      userId: req.user.id,
      ownerId: roomData.ownerId,
      propertyId: propertyId || roomData.propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      contactInfo,
      specialRequests,
      bookingSource,
      bookingType
    });
    
    // Populate the booking with room and user details
    const populatedBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'location', 'price', 'images']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: GuestProfile,
          as: 'guestProfile',
          required: false
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'location'],
          required: false
        }
      ]
    });

    // Send booking created notification to property owner
    // Requirements: 2.1
    try {
      await notificationService.sendBookingCreatedNotification(populatedBooking);
    } catch (notificationError) {
      // Log notification error but don't fail the booking
      console.error('Failed to send booking created notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating booking',
      error: error.message
    });
  }
});

// @desc    Instant check-in for walk-in guests
// @route   POST /api/bookings/instant-checkin
// @access  Private (Staff/Admin)
// Requirements: 1A.1, 1A.2, 1A.3, 1A.4, 1A.5, 1A.6
router.post('/instant-checkin', protect, validateInstantCheckIn, handleValidationErrors, async (req, res) => {
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
      notes
    } = req.body;

    // Get client IP for audit
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Use instant check-in service
    const result = await instantCheckInService.instantCheckIn({
      roomId,
      bedId,
      propertyId,
      ownerId,
      guestInfo,
      checkOut,
      guests,
      specialRequests,
      deposit,
      performedBy: req.user.id,
      notes,
      ipAddress
    });

    res.status(201).json({
      success: true,
      message: 'Instant check-in completed successfully',
      data: {
        booking: result.booking,
        room: {
          id: result.room.id,
          title: result.room.title,
          roomNumber: result.room.roomNumber,
          currentStatus: result.room.currentStatus
        },
        guestProfile: result.guestProfile,
        deposit: result.deposit
      }
    });
  } catch (error) {
    console.error('Instant check-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error processing instant check-in'
    });
  }
});

// @desc    Confirm pending booking
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Owner/Admin)
// Requirements: 2.3, 11.6
router.put('/:id/confirm', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'name', 'address'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - only owner or admin can confirm
    if (booking.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    // Check if booking can be confirmed
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status: ${booking.status}. Only pending bookings can be confirmed.`
      });
    }

    // Use booking service to update status
    const updatedBooking = await bookingService.updateBookingStatus(
      booking.id,
      'confirmed',
      req.user.id,
      { notes: req.body.notes || 'Booking confirmed' }
    );

    // Reload with associations
    const populatedBooking = await Booking.findByPk(updatedBooking.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'location', 'roomNumber'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: GuestProfile, as: 'guestProfile', required: false },
        { model: Property, as: 'property', attributes: ['id', 'name', 'address'] }
      ]
    });

    // Send confirmation notification to guest - Requirement 11.6
    if (booking.bookingSource === 'online') {
      try {
        await notificationService.sendBookingConfirmedNotification(populatedBooking);
      } catch (notificationError) {
        console.error('Failed to send booking confirmation notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: populatedBooking
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming booking',
      error: error.message
    });
  }
});

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = { userId: req.user.id };
    
    if (req.query.status) {
      whereClause.status = req.query.status;
    }

    if (req.query.bookingSource) {
      whereClause.bookingSource = req.query.bookingSource;
    }

    if (req.query.propertyId) {
      whereClause.propertyId = req.query.propertyId;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['title', 'location', 'price', 'images', 'category', 'roomNumber']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['name', 'email', 'phone']
        },
        {
          model: GuestProfile,
          as: 'guestProfile',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: bookings.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'location', 'price', 'images', 'category', 'amenities', 'roomNumber', 'currentStatus']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: GuestProfile,
          as: 'guestProfile',
          required: false
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (booking.userId !== req.user.id && 
        booking.ownerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
// Requirements: 11.11
router.put('/:id/status', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { status, cancellationReason, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'ownerId', 'title'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'name'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const canUpdate = 
      booking.userId === req.user.id ||
      booking.ownerId === req.user.id ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Validate status transitions
    if (status === 'cancelled' && !booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled (check-in is within 24 hours)'
      });
    }

    // Use booking service to update status
    const cancelledBy = req.user.role === 'admin' ? 'admin' : 
                        booking.userId === req.user.id ? 'user' : 'owner';

    const updatedBooking = await bookingService.updateBookingStatus(
      booking.id,
      status,
      req.user.id,
      { 
        reason: cancellationReason,
        cancelledBy,
        notes 
      }
    );

    // Send cancellation notification for online bookings - Requirement 11.11
    if (status === 'cancelled' && booking.bookingSource === 'online' && booking.contactInfo?.email) {
      try {
        await notificationService.sendBookingCancelledNotification({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          guestName: booking.contactInfo?.name || booking.user?.name,
          guestEmail: booking.contactInfo?.email || booking.user?.email,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          propertyName: booking.property?.name || 'Property',
          cancellationReason: cancellationReason
        }, cancelledBy);
      } catch (notificationError) {
        console.error('Failed to send cancellation notification:', notificationError);
      }
    }

    // Send cancellation notification to property owner - Requirement 2.4
    if (status === 'cancelled') {
      try {
        await notificationService.sendBookingCancelledOwnerNotification(booking, cancelledBy);
      } catch (notificationError) {
        console.error('Failed to send cancellation notification to owner:', notificationError);
      }
    }

    // Fetch updated booking with all associations
    const populatedBooking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'location'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: populatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
});

// @desc    Get bookings for room owner
// @route   GET /api/bookings/owner/my-bookings
// @access  Private (Owner)
router.get('/owner/my-bookings', protect, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = { ownerId: req.user.id };
    
    if (req.query.status) {
      whereClause.status = req.query.status;
    }

    if (req.query.bookingSource) {
      whereClause.bookingSource = req.query.bookingSource;
    }

    if (req.query.propertyId) {
      whereClause.propertyId = req.query.propertyId;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['title', 'location', 'price', 'images', 'roomNumber']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone']
        },
        {
          model: GuestProfile,
          as: 'guestProfile',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: bookings.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: bookings
    });
  } catch (error) {
    console.error('Get owner bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your bookings'
    });
  }
});

// @desc    Get bookings by property
// @route   GET /api/bookings/property/:propertyId
// @access  Private (Owner/Admin)
router.get('/property/:propertyId', protect, validateObjectId('propertyId'), handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = { propertyId: req.params.propertyId };
    
    if (req.query.status) {
      whereClause.status = req.query.status;
    }

    if (req.query.bookingSource) {
      whereClause.bookingSource = req.query.bookingSource;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      whereClause.checkIn = {
        [Op.between]: [new Date(req.query.startDate), new Date(req.query.endDate)]
      };
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'currentStatus']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: GuestProfile,
          as: 'guestProfile',
          required: false
        }
      ],
      order: [['checkIn', 'ASC']],
      offset,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: bookings.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: bookings
    });
  } catch (error) {
    console.error('Get property bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property bookings'
    });
  }
});

// Validation for date modification
const validateDateModification = [
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];

// Validation for room change
const validateRoomChange = [
  body('newRoomId').isUUID().withMessage('Valid new room ID is required'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('newBedId').optional().isUUID().withMessage('Valid bed ID is required')
];

// @desc    Modify booking dates
// @route   PUT /api/bookings/:id/modify-dates
// @access  Private (Owner/Admin/Staff)
// Requirements: 8.1, 8.3, 8.6
router.put('/:id/modify-dates', protect, validateObjectId('id'), validateDateModification, handleValidationErrors, async (req, res) => {
  try {
    const { checkIn, checkOut, reason, notes } = req.body;

    // Find the booking first to check authorization
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - owner, admin, or the booking user can modify
    const canModify = 
      booking.ownerId === req.user.id ||
      booking.userId === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'category_owner' ||
      req.user.role === 'superuser';

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this booking'
      });
    }

    // Use booking service to modify dates
    const result = await bookingService.modifyBookingDates(
      req.params.id,
      checkIn,
      checkOut,
      req.user.id,
      { reason, notes }
    );

    // Send booking modified notification to property owner - Requirement 2.5
    if (result.recalculated) {
      try {
        // Get the full booking with associations for notification
        const fullBooking = await Booking.findByPk(req.params.id, {
          include: [
            { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
            { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
            { model: Property, as: 'property', attributes: ['id', 'name'] }
          ]
        });

        await notificationService.sendBookingModifiedNotification(fullBooking, {
          oldCheckIn: booking.checkIn,
          oldCheckOut: booking.checkOut,
          newCheckIn: checkIn,
          newCheckOut: checkOut,
          oldAmount: result.oldAmount,
          newAmount: result.newAmount,
          amountDifference: result.amountDifference,
          modifiedBy: req.user.id,
          reason
        });
      } catch (notificationError) {
        console.error('Failed to send booking modified notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: result.recalculated 
        ? `Booking dates modified successfully. Amount ${result.amountDifference >= 0 ? 'increased' : 'decreased'} by ${Math.abs(result.amountDifference).toFixed(2)}`
        : 'No changes made to booking dates',
      data: {
        booking: result.booking,
        recalculated: result.recalculated,
        oldAmount: result.oldAmount,
        newAmount: result.newAmount,
        amountDifference: result.amountDifference,
        oldDuration: result.oldDuration,
        newDuration: result.newDuration
      }
    });
  } catch (error) {
    console.error('Modify booking dates error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error modifying booking dates'
    });
  }
});

// @desc    Change room assignment for booking
// @route   PUT /api/bookings/:id/change-room
// @access  Private (Owner/Admin/Staff)
// Requirements: 8.2
router.put('/:id/change-room', protect, validateObjectId('id'), validateRoomChange, handleValidationErrors, async (req, res) => {
  try {
    const { newRoomId, reason, notes, newBedId } = req.body;

    // Find the booking first to check authorization
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - owner, admin, or staff can change room
    const canModify = 
      booking.ownerId === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'category_owner' ||
      req.user.role === 'superuser';

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change room for this booking'
      });
    }

    // Use booking service to change room
    const result = await bookingService.changeBookingRoom(
      req.params.id,
      newRoomId,
      req.user.id,
      { reason, notes, newBedId }
    );

    res.json({
      success: true,
      message: result.message || `Room changed successfully from ${result.oldRoom.roomNumber || result.oldRoom.title} to ${result.newRoom.roomNumber || result.newRoom.title}`,
      data: {
        booking: result.booking,
        oldRoom: result.oldRoom,
        newRoom: result.newRoom
      }
    });
  } catch (error) {
    console.error('Change booking room error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error changing booking room'
    });
  }
});

// @desc    Extend booking duration
// @route   PUT /api/bookings/:id/extend
// @access  Private (Owner/Admin/Staff)
// Requirements: 8.4
router.put('/:id/extend', protect, validateObjectId('id'), [
  body('newCheckOut').isISO8601().withMessage('Valid new check-out date is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { newCheckOut, reason, notes } = req.body;

    // Find the booking first to check authorization
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const canModify = 
      booking.ownerId === req.user.id ||
      booking.userId === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'category_owner' ||
      req.user.role === 'superuser';

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to extend this booking'
      });
    }

    // Use booking service to extend booking
    const result = await bookingService.extendBooking(
      req.params.id,
      newCheckOut,
      req.user.id,
      { reason, notes }
    );

    res.json({
      success: true,
      message: `Booking extended successfully. New duration: ${result.newDuration} days. Additional amount: ${(result.newAmount - result.oldAmount).toFixed(2)}`,
      data: {
        booking: result.booking,
        oldDuration: result.oldDuration,
        newDuration: result.newDuration,
        oldAmount: result.oldAmount,
        newAmount: result.newAmount,
        additionalAmount: result.newAmount - result.oldAmount
      }
    });
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error extending booking'
    });
  }
});

// @desc    Shorten booking duration
// @route   PUT /api/bookings/:id/shorten
// @access  Private (Owner/Admin/Staff)
// Requirements: 8.5
router.put('/:id/shorten', protect, validateObjectId('id'), [
  body('newCheckOut').isISO8601().withMessage('Valid new check-out date is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { newCheckOut, reason, notes } = req.body;

    // Find the booking first to check authorization
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const canModify = 
      booking.ownerId === req.user.id ||
      booking.userId === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'category_owner' ||
      req.user.role === 'superuser';

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to shorten this booking'
      });
    }

    // Use booking service to shorten booking
    const result = await bookingService.shortenBooking(
      req.params.id,
      newCheckOut,
      req.user.id,
      { reason, notes }
    );

    res.json({
      success: true,
      message: `Booking shortened successfully. New duration: ${result.newDuration} days. Refund amount: ${(result.oldAmount - result.newAmount).toFixed(2)}`,
      data: {
        booking: result.booking,
        oldDuration: result.oldDuration,
        newDuration: result.newDuration,
        oldAmount: result.oldAmount,
        newAmount: result.newAmount,
        refundAmount: result.oldAmount - result.newAmount
      }
    });
  } catch (error) {
    console.error('Shorten booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error shortening booking'
    });
  }
});

// @desc    Get booking audit trail
// @route   GET /api/bookings/:id/audit
// @access  Private (Owner/Admin)
// Requirements: 8.6, 10.1
router.get('/:id/audit', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const BookingAuditLog = require('../models/BookingAuditLog');
    
    // Find the booking first to check authorization
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - owner or admin can view audit trail
    const canView = 
      booking.ownerId === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'category_owner' ||
      req.user.role === 'superuser';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view audit trail for this booking'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action; // Optional filter by action type

    const auditLogs = await BookingAuditLog.getAuditTrail(req.params.id, {
      limit,
      offset,
      action
    });

    res.json({
      success: true,
      count: auditLogs.length,
      data: auditLogs
    });
  } catch (error) {
    console.error('Get booking audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking audit trail'
    });
  }
});

module.exports = router;
