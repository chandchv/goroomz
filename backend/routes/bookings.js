const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { 
  validateBooking, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const crypto = require('crypto');

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

// @desc    Create guest booking (without authentication)
// @route   POST /api/bookings/guest
// @access  Public
router.post('/guest', async (req, res) => {
  try {
    const { room, checkIn, checkOut, guests, name, email, phone, specialRequests } = req.body;

    // Validate required fields
    if (!room || !checkIn || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: room, checkIn, name, email, phone'
      });
    }

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

    // Check or create user
    let user = await User.findOne({ where: { email } });
    let generatedPassword = null;
    let isNewUser = false;

    if (!user) {
      // Create new user with generated password
      generatedPassword = generatePassword();
      isNewUser = true;

      user = await User.create({
        name,
        email,
        phone,
        password: generatedPassword,
        role: 'user',
        isVerified: false
      });

      console.log(`New user created for booking: ${email}`);
      console.log(`Generated password: ${generatedPassword}`);
      // TODO: Send email with password to user
    } else {
      // Update phone if provided and different
      if (phone && user.phone !== phone) {
        await user.update({ phone });
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

    // Calculate total amount
    const duration = Math.ceil((finalCheckOut - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = roomData.price * duration;

    // Sanitize phone number - extract only digits
    const sanitizedPhone = phone.replace(/\D/g, ''); // Remove all non-digit characters
    const phoneFor10Digits = sanitizedPhone.slice(-10); // Get last 10 digits

    // Validate phone
    if (phoneFor10Digits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Create booking
    const bookingData = {
      roomId: room,
      userId: user.id,
      ownerId: roomData.ownerId,
      checkIn: checkInDate,
      checkOut: finalCheckOut,
      guests: guests || 1,
      totalAmount,
      contactInfo: {
        phone: phoneFor10Digits,
        email: email.trim()
      },
      specialRequests: specialRequests || '',
      status: 'pending'
    };

    const booking = await Booking.create(bookingData);
    
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
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, validateBooking, handleValidationErrors, async (req, res) => {
  try {
    const { room, checkIn, checkOut, guests, contactInfo, specialRequests } = req.body;

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

    // Check date conflicts
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

    // Calculate total amount
    const duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = roomData.price * duration;

    // Check for existing bookings in the same date range
    const { Op } = require('sequelize');
    const existingBooking = await Booking.findOne({
      where: {
        roomId: room,
        status: { [Op.in]: ['pending', 'confirmed'] },
        [Op.or]: [
          {
            checkIn: { [Op.lt]: checkOutDate },
            checkOut: { [Op.gt]: checkInDate }
          }
        ]
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Create booking
    const bookingData = {
      roomId: room,
      userId: req.user.id,
      ownerId: roomData.ownerId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
      contactInfo,
      specialRequests
    };

    const booking = await Booking.create(bookingData);
    
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

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
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

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['title', 'location', 'price', 'images', 'category']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['name', 'email', 'phone']
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
          attributes: ['id', 'title', 'location', 'price', 'images', 'category', 'amenities']
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
router.put('/:id/status', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'ownerId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
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
      booking.userId === req.user.id || // User can cancel their own booking
      booking.ownerId === req.user.id || // Owner can confirm/cancel
      req.user.role === 'admin'; // Admin can do anything

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

    // Update booking
    const updateData = { status };
    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = req.user.role === 'admin' ? 'admin' : 
                              booking.userId === req.user.id ? 'user' : 'owner';
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
    }

    await booking.update(updateData);

    // Fetch updated booking with all associations
    const updatedBooking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'location']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking
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

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['title', 'location', 'price', 'images']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone']
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

module.exports = router;
