const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const { 
  validateBooking, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, validateBooking, handleValidationErrors, async (req, res) => {
  try {
    const { room, checkIn, checkOut, guests, contactInfo, specialRequests } = req.body;

    // Check if room exists and is available
    const roomData = await Room.findById(room);
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
    if (roomData.owner.toString() === req.user._id) {
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

    // Check for existing bookings in the same date range
    const existingBooking = await Booking.findOne({
      room,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          checkIn: { $lt: checkOutDate },
          checkOut: { $gt: checkInDate }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Create booking
    const bookingData = {
      room,
      user: req.user._id,
      owner: roomData.owner,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      contactInfo,
      specialRequests
    };

    const booking = await Booking.create(bookingData);
    
    // Populate the booking with room and user details
    await booking.populate([
      { path: 'room', select: 'title location price images' },
      { path: 'user', select: 'name email' },
      { path: 'owner', select: 'name email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking'
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
    const skip = (page - 1) * limit;

    let filter = { user: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate([
        { path: 'room', select: 'title location price images category' },
        { path: 'owner', select: 'name email phone' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
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
    const booking = await Booking.findById(req.params.id)
      .populate([
        { path: 'room', select: 'title location price images category amenities' },
        { path: 'user', select: 'name email phone' },
        { path: 'owner', select: 'name email phone' }
      ]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (booking.user._id.toString() !== req.user._id && 
        booking.owner._id.toString() !== req.user._id && 
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
      message: 'Error fetching booking'
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

    const booking = await Booking.findById(req.params.id)
      .populate('room', 'owner')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const canUpdate = 
      booking.user._id.toString() === req.user._id || // User can cancel their own booking
      booking.room.owner.toString() === req.user._id || // Owner can confirm/cancel
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
                              booking.user._id.toString() === req.user._id ? 'user' : 'owner';
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate([
      { path: 'room', select: 'title location' },
      { path: 'user', select: 'name email' },
      { path: 'owner', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status'
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
    const skip = (page - 1) * limit;

    let filter = { owner: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate([
        { path: 'room', select: 'title location price images' },
        { path: 'user', select: 'name email phone' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
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
