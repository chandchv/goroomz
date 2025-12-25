const express = require('express');
const { Op } = require('sequelize');
const Booking = require('../../models/Booking');
const Room = require('../../models/Room');
const User = require('../../models/User');
const BedAssignment = require('../../models/BedAssignment');
const SecurityDeposit = require('../../models/SecurityDeposit');
const { internalAuth, checkPermission } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');

const router = express.Router();

// @desc    Create offline booking
// @route   POST /api/internal/bookings
// @access  Private (Internal - requires canManageBookings permission)
// Requirements: 2.2, 7.2
router.post('/', internalAuth, applyScopingMiddleware, checkPermission('canManageBookings'), async (req, res) => {
  console.log('🚨 BOOKING ENDPOINT HIT - START OF FUNCTION');
  try {
    console.log('🔍 Booking creation request received:', {
      body: req.body,
      user: req.user ? req.user.email : 'NO USER'
    });
    
    const {
      roomId,
      bedId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      specialRequests,
      paymentStatus,
      depositAmount
    } = req.body;

    console.log('🔍 Extracted fields:', { roomId, guestName, guestEmail, guestPhone, checkIn });

    // Validate required fields
    if (!roomId || !guestName || !guestEmail || !guestPhone || !checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: roomId, guestName, guestEmail, guestPhone, checkIn'
      });
    }

    // Find the room and check access through property ownership
    const room = await Room.findOne({ 
      where: { id: roomId }
    });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user has access to this room's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied'
        });
      }
    }

    // Get the property owner ID from the room's propertyId
    const { Property } = require('../../models');
    const property = await Property.findByPk(room.propertyId, {
      attributes: ['id', 'ownerId']
    });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for this room'
      });
    }

    // Validate dates
    console.log('🔍 Validating dates - checkIn:', checkIn, 'checkOut:', checkOut);
    const checkInDate = new Date(checkIn);
    let checkOutDate = checkOut ? new Date(checkOut) : null;

    console.log('🔍 Parsed dates - checkInDate:', checkInDate, 'checkOutDate:', checkOutDate);

    if (!checkOutDate) {
      // For PG (monthly), set check-out to 30 days later
      const defaultCheckOut = new Date(checkInDate);
      defaultCheckOut.setDate(defaultCheckOut.getDate() + 30);
      checkOutDate = defaultCheckOut;
      console.log('🔍 Set default checkOutDate for PG:', checkOutDate);
    }

    if (checkOutDate <= checkInDate) {
      console.log('❌ Check-out date validation failed');
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    console.log('✅ Date validation passed');

    // Check for existing bookings (double-booking prevention)
    const existingBooking = await Booking.findOne({
      where: {
        roomId,
        status: { [Op.in]: ['pending', 'confirmed'] },
        [Op.or]: [
          {
            checkIn: { [Op.lt]: checkOutDate },
            checkOut: { [Op.gt]: checkInDate }
          }
        ]
      }
    });

    if (existingBooking && !bedId) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates',
        conflict: {
          bookingId: existingBooking.id,
          checkIn: existingBooking.checkIn,
          checkOut: existingBooking.checkOut
        }
      });
    }

    // If bed is specified, check bed availability
    if (bedId) {
      // Validate bedId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(bedId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bed ID format. Bed ID must be a valid UUID.'
        });
      }

      const bed = await BedAssignment.findByPk(bedId);
      if (!bed) {
        return res.status(404).json({
          success: false,
          message: 'Bed not found'
        });
      }

      if (bed.roomId !== roomId) {
        return res.status(400).json({
          success: false,
          message: 'Bed does not belong to the specified room'
        });
      }

      // Check if bed is available for the date range
      const bedBooking = await Booking.findOne({
        where: {
          bedId,
          status: { [Op.in]: ['pending', 'confirmed'] },
          [Op.or]: [
            {
              checkIn: { [Op.lt]: checkOutDate },
              checkOut: { [Op.gt]: checkInDate }
            }
          ]
        }
      });

      if (bedBooking) {
        return res.status(400).json({
          success: false,
          message: 'Bed is not available for the selected dates',
          conflict: {
            bookingId: bedBooking.id,
            checkIn: bedBooking.checkIn,
            checkOut: bedBooking.checkOut
          }
        });
      }
    }

    // Find or create user
    console.log('🔍 Looking for user with email:', guestEmail);
    let user = await User.findOne({ where: { email: guestEmail } });
    
    console.log('🔍 User lookup result:', user ? `Found user: ${user.email}` : 'User not found, will create new');
    
    if (!user) {
      console.log('🔍 Creating new user for offline booking');
      try {
        // Create new user for offline booking
        const crypto = require('crypto');
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

        const userData = {
          name: guestName,
          email: guestEmail,
          phone: guestPhone.replace(/\D/g, '').slice(-10),
          password: generatePassword(),
          role: 'user',
          isVerified: false
        };
        
        console.log('🔍 Creating user with data:', userData);
        user = await User.create(userData);
        console.log('✅ New user created:', user.id);
      } catch (userError) {
        console.error('🚨 User creation error:', userError);
        throw userError;
      }
    }

    // Calculate total amount if not provided
    let finalTotalAmount = totalAmount;
    if (!finalTotalAmount) {
      const duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      finalTotalAmount = room.price * duration;
    }

    console.log('🔍 About to create booking with data:', {
      roomId,
      bedId: bedId || null,
      userId: user.id,
      ownerId: property.ownerId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || 1,
      totalAmount: finalTotalAmount,
      contactInfo: {
        phone: guestPhone.replace(/\D/g, '').slice(-10),
        email: guestEmail
      },
      specialRequests: specialRequests || '',
      status: 'confirmed',
      paymentStatus: paymentStatus || 'pending',
      bookingSource: 'offline'
    });

    // Create booking
    const booking = await Booking.create({
      roomId,
      bedId: bedId || null,
      userId: user.id,
      ownerId: property.ownerId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || 1,
      totalAmount: finalTotalAmount,
      contactInfo: {
        phone: guestPhone.replace(/\D/g, '').slice(-10),
        email: guestEmail
      },
      specialRequests: specialRequests || '',
      status: 'confirmed',
      paymentStatus: paymentStatus || 'pending',
      bookingSource: 'offline'
    });

    console.log('✅ Booking created successfully:', booking.id);

    // Update bed status to occupied if bedId is provided
    if (bedId) {
      await BedAssignment.update(
        { 
          status: 'occupied',
          bookingId: booking.id,
          occupantId: user.id
        },
        { where: { id: bedId } }
      );
    }

    // Note: Room status is NOT updated to occupied here
    // Room status will be updated to occupied during check-in process

    // Create security deposit if provided (for PG bookings)
    let securityDeposit = null;
    if (depositAmount && depositAmount > 0) {
      const SecurityDeposit = require('../../models/SecurityDeposit');
      securityDeposit = await SecurityDeposit.create({
        bookingId: booking.id,
        amount: depositAmount,
        status: 'collected', // For offline bookings, deposit is collected immediately
        paymentMethod: 'cash', // Default for offline bookings
        notes: 'Security deposit for PG booking'
      });
    }

    // Fetch created booking with associations
    const createdBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'price']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Offline booking created successfully',
      data: {
        ...createdBooking.toJSON(),
        securityDeposit: securityDeposit
      }
    });
  } catch (error) {
    console.error('🚨 Create offline booking error:', error);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error name:', error.name);
    
    // Check if it's a validation error
    if (error.name === 'SequelizeValidationError') {
      console.error('🚨 Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message,
          value: e.value
        }))
      });
    }
    
    // Check if it's a database error
    if (error.name === 'SequelizeDatabaseError') {
      console.error('🚨 Database error:', error.original);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating offline booking',
      error: error.message
    });
  }
});

// @desc    Process check-in
// @route   POST /api/internal/bookings/:id/checkin
// @access  Private (Internal - requires canCheckIn permission)
// Requirements: 2.2, 7.2
router.post('/:id/checkin', internalAuth, applyScopingMiddleware, checkPermission('canCheckIn'), async (req, res) => {
  try {
    const { id } = req.params;
    const { securityDepositAmount, securityDepositMethod, notes } = req.body;

    // Find the booking with data scoping applied
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          where: applyScopeToWhere(req.dataScope, {}, 'propertyId'),
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    // Verify booking is in correct status
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot check in booking with status: ${booking.status}`
      });
    }

    // Check if already checked in
    if (booking.actualCheckInTime) {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been checked in'
      });
    }

    // Verify room is available
    if (booking.room.currentStatus === 'occupied') {
      // Check if the room is occupied by a different booking
      const { Booking: BookingModel } = require('../../models');
      const occupyingBooking = await BookingModel.findOne({
        where: {
          roomId: booking.roomId,
          status: 'confirmed',
          actualCheckInTime: { [Op.ne]: null },
          actualCheckOutTime: null
        }
      });
      
      // If there's another booking occupying this room, prevent check-in
      if (occupyingBooking && occupyingBooking.id !== booking.id) {
        return res.status(400).json({
          success: false,
          message: 'Room is currently occupied by another booking'
        });
      }
      
      // If the room is occupied by the same booking, allow check-in (this shouldn't happen but handle it gracefully)
      if (occupyingBooking && occupyingBooking.id === booking.id) {
        return res.status(400).json({
          success: false,
          message: 'Booking has already been checked in'
        });
      }
      
      // If no occupying booking found but room status is occupied, reset room status
      console.log('🔧 Room marked as occupied but no active booking found, resetting status');
      await booking.room.update({
        currentStatus: 'vacant_clean'
      });
    }

    if (booking.room.currentStatus === 'vacant_dirty') {
      return res.status(400).json({
        success: false,
        message: 'Room needs cleaning before check-in'
      });
    }

    // Handle security deposit if provided
    let securityDeposit = null;
    
    // First, check if security deposit already exists for this booking
    const existingDeposit = await SecurityDeposit.findOne({
      where: { bookingId: booking.id }
    });

    if (existingDeposit) {
      console.log('✅ Security deposit already exists for booking:', booking.id);
      securityDeposit = existingDeposit;
      
      // If new deposit data is provided and different from existing, update it
      if (securityDepositAmount && securityDepositAmount > 0) {
        if (existingDeposit.amount !== securityDepositAmount || 
            (securityDepositMethod && existingDeposit.paymentMethod !== securityDepositMethod)) {
          await existingDeposit.update({
            amount: securityDepositAmount,
            paymentMethod: securityDepositMethod || existingDeposit.paymentMethod,
            collectedDate: new Date(),
            notes: notes || existingDeposit.notes
          });
          console.log('✅ Updated existing security deposit');
        }
      }
    } else if (securityDepositAmount && securityDepositAmount > 0) {
      // Create new security deposit only if none exists
      securityDeposit = await SecurityDeposit.create({
        bookingId: booking.id,
        amount: securityDepositAmount,
        collectedDate: new Date(),
        paymentMethod: securityDepositMethod || 'cash',
        status: 'collected',
        notes: notes || ''
      });
      console.log('✅ Created new security deposit');
    }

    // Update booking
    await booking.update({
      status: 'confirmed',
      actualCheckInTime: new Date(),
      checkedInBy: req.user.id,
      ...(securityDeposit && { securityDepositId: securityDeposit.id })
    });

    // Update room status to occupied
    await booking.room.update({
      currentStatus: 'occupied'
    });

    // If this is a bed booking, update bed status
    if (booking.bedId) {
      const bed = await BedAssignment.findByPk(booking.bedId);
      if (bed) {
        await bed.update({
          status: 'occupied',
          bookingId: booking.id,
          occupantId: booking.userId
        });
      }
    }

    // Fetch updated booking with all associations
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'checkedInByUser',
          attributes: ['id', 'name']
        },
        {
          model: SecurityDeposit,
          as: 'securityDeposit'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Check-in completed successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing check-in',
      error: error.message
    });
  }
});

// @desc    Process check-out
// @route   POST /api/internal/bookings/:id/checkout
// @access  Private (Internal - requires canCheckOut permission)
// Requirements: 2.2, 7.2
router.post('/:id/checkout', internalAuth, applyScopingMiddleware, checkPermission('canCheckOut'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Find the booking with data scoping applied
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          where: applyScopeToWhere(req.dataScope, {}, 'propertyId'),
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    // Verify booking is in correct status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out booking with status: ${booking.status}`
      });
    }

    // Check if already checked out
    if (booking.actualCheckOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been checked out'
      });
    }

    // Check if checked in
    if (!booking.actualCheckInTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out a booking that was never checked in'
      });
    }

    // Update booking
    await booking.update({
      status: 'completed',
      actualCheckOutTime: new Date(),
      checkedOutBy: req.user.id
    });

    // Update room status to vacant_dirty
    await booking.room.update({
      currentStatus: 'vacant_dirty'
    });

    // If this is a bed booking, update bed status
    if (booking.bedId) {
      const bed = await BedAssignment.findByPk(booking.bedId);
      if (bed) {
        await bed.update({
          status: 'vacant',
          bookingId: null,
          occupantId: null
        });
      }
    }

    // Fetch updated booking with all associations
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'checkedInByUser',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'checkedOutByUser',
          attributes: ['id', 'name']
        },
        {
          model: SecurityDeposit,
          as: 'securityDeposit'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Check-out completed successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing check-out',
      error: error.message
    });
  }
});

// IMPORTANT: Specific routes MUST come before parameterized routes
// @desc    Get today's pending check-ins
// @route   GET /api/internal/bookings/pending-checkin
// @access  Private (Internal)
// Requirements: 2.2, 7.2
router.get('/pending-checkin', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.findAll({
      where: {
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: {
          [Op.in]: ['pending', 'confirmed']
        },
        actualCheckInTime: null
      },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus'],
          where: applyScopeToWhere(req.dataScope, {}, 'propertyId'),
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['checkIn', 'ASC']]
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get pending check-ins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending check-ins',
      error: error.message
    });
  }
});

// @desc    Get today's pending check-outs
// @route   GET /api/internal/bookings/pending-checkout
// @access  Private (Internal)
// Requirements: 2.2, 7.2
router.get('/pending-checkout', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.findAll({
      where: {
        checkOut: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'confirmed',
        actualCheckInTime: {
          [Op.ne]: null
        },
        actualCheckOutTime: null
      },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus'],
          where: applyScopeToWhere(req.dataScope, {}, 'propertyId'),
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['checkOut', 'ASC']]
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get pending check-outs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending check-outs',
      error: error.message
    });
  }
});

// @desc    Get single booking by ID
// @route   GET /api/internal/bookings/:id
// @access  Private (Internal)
// Requirements: 2.2, 7.2
router.get('/:id', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Get booking by ID:', id, 'User:', req.user.email);

    // Find booking with all associations including security deposit
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId'],
          required: true // Ensure booking has a room
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber']
        },
        {
          model: User,
          as: 'checkedInByUser',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'checkedOutByUser',
          attributes: ['id', 'name']
        },
        {
          model: SecurityDeposit,
          as: 'securityDeposit',
          attributes: ['id', 'amount', 'status', 'paymentMethod', 'collectedDate', 'notes']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check data scoping access through room's property
    if (!req.dataScope.canBypassScoping) {
      console.log('🔍 Checking data scoping access for booking:', id);
      console.log('🔍 User accessible property IDs:', req.dataScope.propertyIds);
      console.log('🔍 Booking room property ID:', booking.room?.propertyId);
      
      if (!booking.room?.propertyId) {
        console.log('❌ Booking has no room or room has no propertyId');
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }
      
      const hasAccess = req.dataScope.propertyIds.includes(booking.room.propertyId);
      if (!hasAccess) {
        console.log('❌ User does not have access to property:', booking.room.propertyId);
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }
      
      console.log('✅ Data scoping access granted for booking:', id);
    }

    console.log('✅ Booking found with security deposit:', booking.securityDeposit ? 'Yes' : 'No');

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
});

// @desc    Get all bookings with filters
// @route   GET /api/internal/bookings
// @access  Private (Internal)
// Requirements: 2.2, 7.2
router.get('/', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const {
      status,
      bookingSource,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log('📋 Get bookings request:', { status, limit, search });
    console.log('📋 User data scope:', req.dataScope);

    // Build where clause
    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by booking source
    if (bookingSource) {
      whereClause.bookingSource = bookingSource;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.checkIn = {};
      if (startDate) {
        whereClause.checkIn[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.checkIn[Op.lte] = new Date(endDate);
      }
    }

    // Build room where clause with data scoping
    const roomWhere = {};
    
    // Apply data scoping to room's propertyId
    if (!req.dataScope.canBypassScoping) {
      if (!req.dataScope.propertyIds || req.dataScope.propertyIds.length === 0) {
        console.log('📋 No accessible properties for user, returning empty result');
        return res.json({
          success: true,
          count: 0,
          total: 0,
          page: parseInt(page),
          pages: 0,
          data: []
        });
      }
      
      roomWhere.propertyId = {
        [Op.in]: req.dataScope.propertyIds
      };
      console.log('📋 Applied property scoping:', roomWhere.propertyId);
    }
    
    // Add search filter if provided
    if (search) {
      roomWhere.roomNumber = {
        [Op.iLike]: `%${search}%`
      };
    }

    // Build include clause for search
    const includeClause = [
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId'],
        where: roomWhere,
        required: true // This ensures only bookings with accessible rooms are returned
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone'],
        ...(search && {
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } },
              { phone: { [Op.iLike]: `%${search}%` } }
            ]
          },
          required: false
        })
      },
      {
        model: BedAssignment,
        as: 'bed',
        attributes: ['id', 'bedNumber'],
        required: false
      },
      {
        model: SecurityDeposit,
        as: 'securityDeposit',
        attributes: ['id', 'amount', 'status', 'paymentMethod', 'collectedDate'],
        required: false
      }
    ];

    // If search is provided and no specific filters match, we need to use OR logic
    // This is a simplified approach - in production you might want more sophisticated search
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['checkIn', 'DESC']],
      offset,
      limit: parseInt(limit),
      distinct: true
    });

    console.log('📋 Found bookings:', bookings.length, 'Total:', count);

    res.json({
      success: true,
      count: bookings.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/internal/bookings/:id/status
// @access  Private (Internal - requires canManageBookings permission)
// Requirements: 2.2, 7.2
router.put('/:id/status', internalAuth, applyScopingMiddleware, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the booking with room details
    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check access to the booking's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(booking.room.propertyId);
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }
    }

    // Update booking status
    await booking.update({ status });

    // Fetch updated booking with all associations
    const updatedBooking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber']
        },
        {
          model: SecurityDeposit,
          as: 'securityDeposit',
          attributes: ['id', 'amount', 'status', 'paymentMethod', 'collectedDate']
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

// @desc    Cancel a booking
// @route   POST /api/internal/bookings/:id/cancel
// @access  Private (Internal - requires canManageBookings permission)
// Requirements: 2.2, 7.2
router.post('/:id/cancel', internalAuth, applyScopingMiddleware, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Find the booking with room details
    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        },
        {
          model: User,
          as: 'user',
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

    // Check access to the booking's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(booking.room.propertyId);
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }
    }

    // Verify booking can be cancelled
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

    // If booking was checked in, we need to free up the room/bed
    if (booking.actualCheckInTime && !booking.actualCheckOutTime) {
      // Update room status to vacant_dirty (needs cleaning)
      await booking.room.update({
        currentStatus: 'vacant_dirty'
      });

      // If this is a bed booking, update bed status
      if (booking.bedId) {
        const bed = await BedAssignment.findByPk(booking.bedId);
        if (bed) {
          await bed.update({
            status: 'vacant',
            bookingId: null,
            occupantId: null
          });
        }
      }
    }

    // Update booking status to cancelled
    await booking.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: 'admin', // Use ENUM value instead of user ID
      cancellationReason: reason || 'No reason provided'
    });

    // Log the cancellation
    console.log(`Booking ${booking.id} cancelled by user ${req.user.id}:`, {
      reason,
      cancelledAt: new Date()
    });

    // Fetch updated booking with all associations
    const updatedBooking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber']
        },
        {
          model: SecurityDeposit,
          as: 'securityDeposit',
          attributes: ['id', 'amount', 'status', 'paymentMethod', 'collectedDate']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
});

// @desc    Change room assignment for a booking
// @route   POST /api/internal/bookings/:id/change-room
// @access  Private (Internal - requires canManageBookings permission)
router.post('/:id/change-room', internalAuth, applyScopingMiddleware, checkPermission('canManageBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newRoomId, newBedId, reason, changedBy } = req.body;

    // Validate required fields
    if (!newRoomId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide newRoomId and reason for room change'
      });
    }

    // Find the booking with room details
    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check access to the booking's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(booking.room.propertyId);
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }
    }

    // Find the new room
    const newRoom = await Room.findByPk(newRoomId);
    
    if (!newRoom) {
      return res.status(404).json({
        success: false,
        message: 'New room not found'
      });
    }

    // Verify new room is in the same property
    if (newRoom.propertyId !== booking.room.propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change to a room in a different property'
      });
    }

    // Verify new room is available
    if (newRoom.currentStatus !== 'vacant_clean') {
      return res.status(400).json({
        success: false,
        message: `New room is not available. Current status: ${newRoom.currentStatus}`
      });
    }

    // Store old room info for logging
    const oldRoomId = booking.roomId;
    const oldBedId = booking.bedId;

    // Update the booking with new room
    await booking.update({
      roomId: newRoomId,
      bedId: newBedId || null
    });

    // If booking was already checked in, update room statuses
    if (booking.actualCheckInTime) {
      // Mark old room as vacant_dirty (needs cleaning after guest leaves)
      const oldRoom = await Room.findByPk(oldRoomId);
      if (oldRoom) {
        await oldRoom.update({
          currentStatus: 'vacant_dirty'
        });
      }

      // Mark new room as occupied
      await newRoom.update({
        currentStatus: 'occupied'
      });

      // Handle bed assignments if applicable
      if (oldBedId) {
        const oldBed = await BedAssignment.findByPk(oldBedId);
        if (oldBed) {
          await oldBed.update({
            status: 'available',
            bookingId: null,
            occupantId: null
          });
        }
      }

      if (newBedId) {
        const newBed = await BedAssignment.findByPk(newBedId);
        if (newBed) {
          await newBed.update({
            status: 'occupied',
            bookingId: booking.id,
            occupantId: booking.userId
          });
        }
      }
    }

    // Log the room change (you can create a RoomChangeLog model for this)
    console.log(`Room changed for booking ${booking.id}:`, {
      oldRoomId,
      newRoomId,
      oldBedId,
      newBedId,
      reason,
      changedBy: req.user.id,
      changedAt: new Date()
    });

    // Fetch updated booking with new room details
    const updatedBooking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'currentStatus', 'propertyId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Room changed successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Change room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing room',
      error: error.message
    });
  }
});

module.exports = router;