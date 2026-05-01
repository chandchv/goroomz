const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Lead = require('../models/Lead');
const PropertyOwner = require('../models/PropertyOwner');
const Territory = require('../models/Territory');
const User = require('../models/User');
const Property = require('../models/Property');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { sequelize, Payment, Staff, Deposit, HousekeepingTask } = require('../models');
const territoryService = require('../services/territoryService');
const { Op } = require('sequelize');
const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Validation middleware for lead creation
const validateLeadCreation = [
  body('propertyOwnerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Property owner name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .matches(/^[0-9+\-\s()]+$/)
    .isLength({ min: 10, max: 15 })
    .withMessage('Valid phone number is required'),
  
  body('propertyType')
    .isIn(['hotel', 'pg', 'homestay', 'apartment'])
    .withMessage('Property type must be one of: hotel, pg, homestay, apartment'),
  
  body('estimatedRooms')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Estimated rooms must be between 1 and 1000'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 10 })
    .withMessage('Pincode must be 5-10 digits'),
  
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Business name cannot exceed 200 characters'),
  
  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Landmark cannot exceed 200 characters'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  body('amenities.*')
    .optional()
    .isIn([
      'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 
      'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
      'refrigerator', 'microwave', 'iron', 'heater', 'cctv'
    ])
    .withMessage('Invalid amenity provided'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  body('expectedLaunchDate')
    .optional()
    .isISO8601()
    .withMessage('Expected launch date must be a valid date'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  
  body('frontendSubmissionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Frontend submission ID cannot exceed 100 characters')
];

// Internal Auth Routes for Management System

// @desc    Internal login for management system
// @route   POST /api/internal/auth/login
// @access  Public
router.post('/internal/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const normalizedEmail = email.toLowerCase();

    // Find user and check if they have internal management access
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Internal login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
});

// @desc    Get current internal user
// @route   GET /api/internal/auth/me
// @access  Private
router.get('/internal/auth/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user still has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Internal auth me error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Internal Dashboard Routes for Management System

// @desc    Get dashboard KPIs
// @route   GET /api/internal/dashboard/kpis
// @access  Private
router.get('/internal/dashboard/kpis', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    // Get propertyId from query parameters
    const { propertyId } = req.query;

    try {
      // Get real room data filtered by propertyId
      let rooms = [];
      if (propertyId) {
        rooms = await sequelize.query(`
          SELECT id, title, price, max_guests as "maxGuests", property_details as "propertyDetails"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = :propertyId
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });
      }

      // Calculate real statistics from room data
      const totalRooms = rooms.length;
      let occupiedRooms = 0;
      let vacantCleanRooms = 0;
      let vacantDirtyRooms = 0;
      let totalBeds = 0;
      let occupiedBeds = 0;

      rooms.forEach(room => {
        const details = room.propertyDetails || {};
        const status = details.currentStatus || 'vacant_clean';
        const beds = details.totalBeds || room.maxGuests || 1;
        totalBeds += beds;
        
        if (status === 'occupied') {
          occupiedRooms++;
          occupiedBeds += details.occupiedBeds || beds;
        } else if (status === 'vacant_clean') {
          vacantCleanRooms++;
        } else if (status === 'vacant_dirty') {
          vacantDirtyRooms++;
        }
      });

      const vacantRooms = totalRooms - occupiedRooms;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
      
      // Get actual revenue from bookings
      let currentMonthRevenue = 0;
      let pendingCount = 0;
      let pendingAmount = 0;

      try {
        // Get current month revenue from confirmed/completed bookings
        const [revenueResult] = await sequelize.query(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM bookings 
          WHERE status IN ('confirmed', 'completed')
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
          ${propertyId ? `AND room_id IN (SELECT id FROM rooms WHERE property_details->>'propertyId' = '${propertyId}')` : ''}
        `);
        currentMonthRevenue = parseFloat(revenueResult[0]?.total) || 0;

        // Get pending payments
        const [pendingResult] = await sequelize.query(`
          SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
          FROM bookings 
          WHERE payment_status IN ('pending', 'partial')
          AND status = 'confirmed'
          ${propertyId ? `AND room_id IN (SELECT id FROM rooms WHERE property_details->>'propertyId' = '${propertyId}')` : ''}
        `);
        pendingCount = parseInt(pendingResult[0]?.count) || 0;
        pendingAmount = parseFloat(pendingResult[0]?.amount) || 0;
      } catch (err) {
        console.error('Error fetching revenue/payments:', err);
      }

      // Get total properties count
      let totalPropertiesCount = 1;
      if (!propertyId) {
        try {
          const [propCount] = await sequelize.query('SELECT COUNT(*) as count FROM properties');
          totalPropertiesCount = parseInt(propCount[0]?.count) || 0;
        } catch (err) {
          console.error('Error fetching properties count:', err);
        }
      }

      res.json({
        success: true,
        data: {
          totalProperties: totalPropertiesCount,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          totalRevenue: currentMonthRevenue,
          pendingPayments: pendingAmount,
          occupancy: {
            rate: occupancyRate,
            totalRooms: totalRooms,
            occupiedRooms: occupiedRooms,
            vacantRooms: vacantRooms
          },
          revenue: {
            currentMonth: currentMonthRevenue,
            currency: 'INR'
          },
          payments: {
            pendingCount: pendingCount,
            pendingAmount: pendingAmount
          },
          roomStatus: {
            occupied: occupiedRooms,
            vacant_clean: vacantCleanRooms,
            vacant_dirty: vacantDirtyRooms
          }
        }
      });
    } catch (dbError) {
      console.error('Database query error in KPIs:', dbError);
      res.json({
        success: true,
        data: {
          totalProperties: 0,
          occupancyRate: 0,
          totalRevenue: 0,
          pendingPayments: 0,
          occupancy: { rate: 0, totalRooms: 0, occupiedRooms: 0, vacantRooms: 0 },
          revenue: { currentMonth: 0, currency: 'INR' },
          payments: { pendingCount: 0, pendingAmount: 0 },
          roomStatus: { occupied: 0, vacant_clean: 0, vacant_dirty: 0 }
        }
      });
    }
  } catch (error) {
    console.error('Internal dashboard KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard KPIs'
    });
  }
});

// @desc    Get dashboard activities
// @route   GET /api/internal/dashboard/activities
// @access  Private
router.get('/internal/dashboard/activities', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId } = req.query;

    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Build where clause for bookings
      let roomIds = [];
      if (propertyId) {
        const rooms = await sequelize.query(`
          SELECT id FROM rooms 
          WHERE is_active = true 
          AND (property_id::text = :propertyId OR property_details->>'propertyId' = :propertyId)
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });
        roomIds = rooms.map(r => r.id);
      }

      // Fetch today's check-ins (confirmed bookings with check-in today)
      const checkInWhereClause = {
        status: { [Op.in]: ['confirmed', 'pending'] },
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      };
      if (user.role === 'owner') {
        checkInWhereClause.ownerId = user.id;
      }
      if (roomIds.length > 0) {
        checkInWhereClause.roomId = { [Op.in]: roomIds };
      }

      const checkInBookings = await Booking.findAll({
        where: checkInWhereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'propertyDetails'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }
        ],
        order: [['checkIn', 'ASC']],
        limit: 10
      });

      const checkIns = checkInBookings.map(booking => {
        const roomNumber = booking.room?.roomNumber || booking.room?.room_number || booking.room?.title?.replace('Room ', '') || 'N/A';
        const contactInfo = booking.contactInfo || {};
        return {
          id: booking.id,
          guestName: contactInfo.name || booking.user?.name || 'Guest',
          guestPhone: contactInfo.phone || booking.user?.phone || '',
          roomNumber: roomNumber,
          floorNumber: booking.room?.propertyDetails?.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          checkInTime: booking.checkIn,
          guests: booking.guests,
          status: booking.status
        };
      });

      // Fetch today's check-outs (confirmed bookings with check-out today)
      const checkOutWhereClause = {
        status: 'confirmed',
        checkOut: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      };
      if (user.role === 'owner') {
        checkOutWhereClause.ownerId = user.id;
      }
      if (roomIds.length > 0) {
        checkOutWhereClause.roomId = { [Op.in]: roomIds };
      }

      const checkOutBookings = await Booking.findAll({
        where: checkOutWhereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber', 'propertyDetails'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }
        ],
        order: [['checkOut', 'ASC']],
        limit: 10
      });

      const checkOuts = checkOutBookings.map(booking => {
        const roomNumber = booking.room?.roomNumber || booking.room?.room_number || booking.room?.title?.replace('Room ', '') || 'N/A';
        const contactInfo = booking.contactInfo || {};
        return {
          id: booking.id,
          guestName: contactInfo.name || booking.user?.name || 'Guest',
          guestPhone: contactInfo.phone || booking.user?.phone || '',
          roomNumber: roomNumber,
          floorNumber: booking.room?.propertyDetails?.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          checkOutTime: booking.checkOut,
          guests: booking.guests,
          status: 'pending'
        };
      });

      // Payments due - for now return empty (would need Payment model integration)
      const paymentsDue = [];

      res.json({
        success: true,
        data: {
          checkIns,
          checkOuts,
          paymentsDue
        }
      });
    } catch (dbError) {
      console.error('Database query error in activities:', dbError);
      res.json({
        success: true,
        data: { checkIns: [], checkOuts: [], paymentsDue: [] }
      });
    }
  } catch (error) {
    console.error('Internal dashboard activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard activities'
    });
  }
});

// @desc    Get dashboard alerts
// @route   GET /api/internal/dashboard/alerts
// @access  Private
router.get('/internal/dashboard/alerts', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId } = req.query;

    try {
      // Get rooms for this property
      let rooms = [];
      if (propertyId) {
        rooms = await sequelize.query(`
          SELECT id, title, property_details as "propertyDetails"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = :propertyId
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });
      }

      // Generate alerts based on actual room data
      const dirtyRooms = rooms
        .filter(r => r.propertyDetails?.currentStatus === 'vacant_dirty')
        .map(room => {
          const roomNumber = room.roomNumber || room.room_number || room.title.replace('Room ', '');
          return {
            id: `dirty_${room.id}`,
            roomNumber: roomNumber,
            floorNumber: room.propertyDetails?.floorNumber || 1,
            title: 'Room needs cleaning',
            hoursDirty: 24,
            lastCleanedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          };
        });

      // Get actual overdue payments from bookings
      let overduePayments = [];
      if (propertyId) {
        try {
          const [overdueBookings] = await sequelize.query(`
            SELECT b.id, b.total_amount, b.payment_status, b.check_in, b.contact_info,
                   r.title as room_title, r.room_number,
                   u.name as guest_name, u.phone as guest_phone
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.payment_status IN ('pending', 'partial')
            AND b.status = 'confirmed'
            AND r.property_details->>'propertyId' = $1
            AND b.check_in < NOW()
            LIMIT 10
          `, { bind: [propertyId] });

          overduePayments = overdueBookings.map(booking => {
            const contactInfo = booking.contact_info || {};
            return {
              id: booking.id,
              bookingId: booking.id,
              guestName: contactInfo.name || booking.guest_name || 'Guest',
              guestPhone: contactInfo.phone || booking.guest_phone || '',
              roomNumber: booking.room_number || booking.room_title?.replace('Room ', '') || 'N/A',
              amount: parseFloat(booking.total_amount) || 0,
              dueDate: booking.check_in,
              daysOverdue: Math.floor((Date.now() - new Date(booking.check_in).getTime()) / (24 * 60 * 60 * 1000))
            };
          });
        } catch (err) {
          console.error('Error fetching overdue payments:', err);
        }
      }

      // Get actual maintenance requests from housekeeping tasks
      let pendingMaintenance = [];
      if (propertyId) {
        try {
          const [maintenanceTasks] = await sequelize.query(`
            SELECT ht.id, ht.task_type, ht.priority, ht.status, ht.created_at,
                   r.title as room_title, r.room_number, r.property_details
            FROM housekeeping_tasks ht
            LEFT JOIN rooms r ON ht.room_id = r.id
            WHERE ht.status IN ('pending', 'in_progress')
            AND ht.task_type = 'maintenance'
            AND r.property_details->>'propertyId' = $1
            LIMIT 10
          `, { bind: [propertyId] });

          pendingMaintenance = maintenanceTasks.map(task => ({
            id: task.id,
            roomNumber: task.room_number || task.room_title?.replace('Room ', '') || 'N/A',
            floorNumber: task.property_details?.floorNumber || 1,
            title: 'Maintenance required',
            priority: task.priority || 'medium',
            status: task.status,
            reportedDate: task.created_at
          }));
        } catch (err) {
          console.error('Error fetching maintenance tasks:', err);
        }
      }

      res.json({
        success: true,
        data: {
          overduePayments,
          pendingMaintenance,
          dirtyRooms
        }
      });
    } catch (dbError) {
      console.error('Database query error in alerts:', dbError);
      res.json({
        success: true,
        data: { overduePayments: [], pendingMaintenance: [], dirtyRooms: [] }
      });
    }
  } catch (error) {
    console.error('Internal dashboard alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard alerts'
    });
  }
});

// Territory assignment service function
const assignTerritory = async (city, state) => {
  try {
    // Use the territory service for assignment
    const territory = await territoryService.findTerritoryByLocation(city, state);
    
    if (territory) {
      return territory;
    }

    return null;
  } catch (error) {
    console.error('Territory assignment error:', error);
    return null;
  }
};

// Property owner account creation service function
const createPropertyOwnerAccount = async (leadData, leadId) => {
  try {
    const propertyOwner = await PropertyOwner.create({
      leadId: leadId,
      name: leadData.propertyOwnerName,
      email: leadData.email,
      phone: leadData.phone,
      businessName: leadData.businessName || null,
      onboardingStatus: 'not_started',
      accountStatus: 'pending',
      verificationStatus: 'not_started',
      trainingStatus: 'not_scheduled',
      communicationPreferences: {
        email: true,
        sms: true,
        whatsapp: false,
        preferredTime: 'business_hours',
        language: 'en'
      }
    });

    return propertyOwner;
  } catch (error) {
    console.error('Property owner creation error:', error);
    throw error;
  }
};

// POST /api/internal/leads - Create new lead from frontend submission
router.post('/internal/leads', validateLeadCreation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadData = req.body;

    // Check for duplicate submission
    if (leadData.frontendSubmissionId) {
      const existingLead = await Lead.findOne({
        where: { frontendSubmissionId: leadData.frontendSubmissionId }
      });

      if (existingLead) {
        return res.status(409).json({
          success: false,
          message: 'Lead already exists for this submission',
          leadId: existingLead.id
        });
      }
    }

    // Assign territory based on location
    const territory = await assignTerritory(leadData.city, leadData.state);
    
    // Create the lead
    const lead = await Lead.create({
      // Property Information
      propertyOwnerName: leadData.propertyOwnerName,
      email: leadData.email,
      phone: leadData.phone,
      businessName: leadData.businessName || null,
      propertyType: leadData.propertyType,
      estimatedRooms: leadData.estimatedRooms,
      
      // Location Information
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      country: leadData.country || 'India',
      pincode: leadData.pincode || null,
      landmark: leadData.landmark || null,
      
      // Lead Management
      status: 'pending',
      source: 'website',
      territoryId: territory ? territory.id : null,
      
      // Frontend Sync Fields
      frontendSubmissionId: leadData.frontendSubmissionId || null,
      syncStatus: 'synced',
      lastSyncAt: new Date(),
      
      // Additional Data
      amenities: leadData.amenities || [],
      images: leadData.images || [],
      expectedLaunchDate: leadData.expectedLaunchDate || null,
      notes: leadData.notes || null,
      priority: 'medium',
      
      // Property Details (store additional frontend data)
      propertyDetails: {
        description: leadData.description || null,
        category: leadData.category || null,
        additionalInfo: leadData.additionalInfo || null
      }
    });

    // Assign lead to territory and update lead count
    if (territory) {
      try {
        await territoryService.assignLeadToTerritory(lead.id, territory.id);
      } catch (assignmentError) {
        console.error('Failed to assign lead to territory:', assignmentError);
        // Continue without failing the lead creation
      }
    }

    // Create property owner account
    let propertyOwner = null;
    try {
      propertyOwner = await createPropertyOwnerAccount(leadData, lead.id);
    } catch (ownerError) {
      console.error('Failed to create property owner account:', ownerError);
      // Continue without failing the lead creation
    }

    // TODO: Send notifications to territory head (will be implemented in task 4.1)
    
    // Prepare response
    const response = {
      success: true,
      message: 'Lead created successfully',
      data: {
        lead: {
          id: lead.id,
          status: lead.status,
          submissionDate: lead.submissionDate,
          trackingReference: lead.id.substring(0, 8).toUpperCase(),
          expectedTimeline: '3-5 business days'
        },
        territory: territory ? {
          id: territory.id,
          name: territory.name,
          code: territory.code
        } : null,
        propertyOwner: propertyOwner ? {
          id: propertyOwner.id,
          onboardingStatus: propertyOwner.onboardingStatus
        } : null
      }
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/internal/leads - Get leads with filtering and pagination
router.get('/internal/leads', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      territoryId,
      agentId,
      city,
      state,
      propertyType,
      priority,
      sortBy = 'submissionDate',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (territoryId) whereClause.territoryId = territoryId;
    if (agentId) whereClause.agentId = agentId;
    if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
    if (state) whereClause.state = { [Op.iLike]: `%${state}%` };
    if (propertyType) whereClause.propertyType = propertyType;
    if (priority) whereClause.priority = priority;

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch leads with associations
    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Territory,
          as: 'territory',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        },
        {
          model: PropertyOwner,
          as: 'propertyOwner',
          attributes: ['id', 'onboardingStatus', 'accountStatus']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/internal/leads/:id - Get specific lead details
router.get('/internal/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: Territory,
          as: 'territory',
          attributes: ['id', 'name', 'code', 'territoryHeadId']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: PropertyOwner,
          as: 'propertyOwner'
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: { lead }
    });

  } catch (error) {
    console.error('Lead fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/internal/leads/:id/assign-agent - Assign lead to agent
router.post('/internal/leads/:id/assign-agent', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    if (!lead.canBeAssigned()) {
      return res.status(400).json({
        success: false,
        message: 'Lead cannot be assigned in current status'
      });
    }

    // Update lead with agent assignment
    await lead.update({
      agentId: agentId,
      status: 'assigned',
      lastContactDate: new Date()
    });

    res.json({
      success: true,
      message: 'Lead assigned to agent successfully',
      data: { lead }
    });

  } catch (error) {
    console.error('Agent assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/internal/leads/:id/auto-assign - Auto-assign lead to best available agent
router.post('/internal/leads/:id/auto-assign', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    if (!lead.territoryId) {
      return res.status(400).json({
        success: false,
        message: 'Lead must be assigned to a territory first'
      });
    }

    const assignmentResult = await territoryService.autoAssignLeadToAgent(id, lead.territoryId);

    res.json({
      success: true,
      message: assignmentResult.agent ? 
        'Lead auto-assigned to agent successfully' : 
        'No available agents, lead remains unassigned',
      data: assignmentResult
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/territories/:id/workload - Get territory workload distribution
router.get('/territories/:id/workload', async (req, res) => {
  try {
    const { id } = req.params;

    const workloadData = await territoryService.getTerritoryWorkloadDistribution(id);

    res.json({
      success: true,
      data: workloadData
    });

  } catch (error) {
    console.error('Workload fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territory workload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/territories/:id/rebalance - Rebalance territory workload
router.post('/territories/:id/rebalance', async (req, res) => {
  try {
    const { id } = req.params;

    const rebalanceResult = await territoryService.rebalanceTerritoryWorkload(id);

    res.json({
      success: true,
      message: 'Territory workload rebalanced successfully',
      data: rebalanceResult
    });

  } catch (error) {
    console.error('Rebalance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebalance territory workload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/territories/:id/performance - Get territory performance metrics
router.get('/territories/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const performanceData = await territoryService.getTerritoryPerformanceMetrics(id, parseInt(days));

    res.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territory performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Internal Management System Endpoints

// @desc    Get bookings for internal management
// @route   GET /api/internal/bookings
// @access  Private
router.get('/internal/bookings', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
      if (user.role === 'owner') {
        whereClause.ownerId = user.id;
      }

      // If propertyId is provided, filter by rooms in that property
      let roomIds = null;
      if (propertyId) {
        const rooms = await sequelize.query(`
          SELECT id FROM rooms 
          WHERE property_details->>'propertyId' = :propertyId
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });
        roomIds = rooms.map(r => r.id);
        if (roomIds.length > 0) {
          whereClause.roomId = { [Op.in]: roomIds };
        } else {
          // No rooms for this property, return empty
          return res.json({
            success: true,
            count: 0,
            total: 0,
            page,
            pages: 1,
            data: []
          });
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
          bookingSource: 'offline', // Default for now
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
            currentStatus: booking.room?.currentStatus || booking.room?.current_status || booking.room?.propertyDetails?.currentStatus || 'vacant_clean'
          },
          // Also include flat fields for backward compatibility
          guestName: contactInfo.name || booking.user?.name || 'Guest',
          guestPhone: contactInfo.phone || booking.user?.phone || '',
          guestEmail: contactInfo.email || booking.user?.email || '',
          roomNumber: roomNumber,
          floorNumber: floorNumber,
          checkInDate: booking.checkIn,
          checkOutDate: booking.checkOut,
          paidAmount: 0
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
router.get('/internal/bookings/pending-checkin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

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
router.get('/internal/bookings/pending-checkout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

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

// @desc    Get room status for internal management
// @route   GET /api/internal/rooms/status
// @access  Private
router.get('/internal/rooms/status', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId } = req.query;
    console.log('Room status request - User:', user.id, 'Role:', user.role, 'PropertyId:', propertyId);

    try {
      // Build where clause for filtering
      let whereClause = {
        isActive: true,
        approvalStatus: 'approved'
      };

      // If propertyId is provided, filter by property
      if (propertyId) {
        // Use raw SQL for JSON filtering - ONLY get rooms with matching propertyId
        const rooms = await sequelize.query(`
          SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId", property_details as "propertyDetails", created_at as "createdAt", updated_at as "updatedAt"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = :propertyId
          ORDER BY title
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });

        console.log('Found', rooms.length, 'rooms for propertyId:', propertyId);

        // Transform rooms to match frontend expectations
        const transformedRooms = rooms.map(room => {
          const propertyDetails = room.propertyDetails || {};
          const roomNumber = room.roomNumber || room.room_number || room.title.replace('Room ', '');
          
          return {
            id: room.id,
            roomNumber: roomNumber,
            room_number: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            currentStatus: propertyDetails.currentStatus || 'vacant_clean',
            current_status: propertyDetails.currentStatus || 'vacant_clean',
            sharingType: propertyDetails.sharingType || 'single',
            sharing_type: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
            total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            occupied_beds: propertyDetails.occupiedBeds || 0,
            price: propertyDetails.dailyRate || room.price || 0,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            propertyId: propertyDetails.propertyId || propertyId,
            property_id: propertyDetails.propertyId || propertyId,
            isActive: true,
            roomType: 'standard',
            category: propertyDetails.sharingType || 'single',
            pricingType: propertyDetails.pricingType || 'daily',
            lastCleanedAt: null,
            lastMaintenanceAt: null
          };
        });

        res.json({
          success: true,
          message: 'Room status retrieved successfully',
          data: {
            rooms: transformedRooms,
            total: transformedRooms.length,
            propertyId: propertyId || null
          }
        });
        return;
      } else if (user.role === 'owner') {
        // Property owners can only see their own rooms - use raw SQL
        const rooms = await sequelize.query(`
          SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId", property_details as "propertyDetails"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND owner_id = :ownerId
          ORDER BY title
        `, {
          replacements: { ownerId: user.id },
          type: sequelize.QueryTypes.SELECT
        });

        console.log('Found rooms:', rooms.length, 'rooms for owner:', user.id);

        // Transform rooms to match frontend expectations
        const transformedRooms = rooms.map(room => {
          const propertyDetails = room.propertyDetails || {};
          const roomNumber = (room.title || '').replace('Room ', '');
          
          return {
            id: room.id,
            roomNumber: roomNumber,
            room_number: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            currentStatus: propertyDetails.currentStatus || 'vacant_clean',
            current_status: propertyDetails.currentStatus || 'vacant_clean',
            sharingType: propertyDetails.sharingType || 'single',
            sharing_type: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
            total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            occupied_beds: propertyDetails.occupiedBeds || 0,
            price: propertyDetails.dailyRate || room.price || 0,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            propertyId: propertyDetails.propertyId || null,
            property_id: propertyDetails.propertyId || null,
            isActive: true,
            roomType: 'standard',
            category: propertyDetails.sharingType || 'single',
            pricingType: propertyDetails.pricingType || 'daily',
            lastCleanedAt: null,
            lastMaintenanceAt: null
          };
        });

        res.json({
          success: true,
          message: 'Room status retrieved successfully',
          data: {
            rooms: transformedRooms,
            total: transformedRooms.length,
            propertyId: null
          }
        });
        return;
      }

      // For admin/superuser - get all rooms using raw SQL
      const rooms = await sequelize.query(`
        SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId", property_details as "propertyDetails"
        FROM rooms 
        WHERE is_active = true 
        AND approval_status = 'approved'
        ORDER BY title
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      console.log('Found rooms:', rooms.length, 'rooms for propertyId:', propertyId);

      // Transform rooms to match frontend expectations
      const transformedRooms = rooms.map(room => {
        const propertyDetails = room.propertyDetails || {};
        const roomNumber = room.roomNumber || room.room_number || room.title.replace('Room ', '');
        
        return {
          id: room.id,
          roomNumber: roomNumber,
          room_number: roomNumber,
          floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: propertyDetails.currentStatus || 'vacant_clean',
          current_status: propertyDetails.currentStatus || 'vacant_clean',
          sharingType: propertyDetails.sharingType || 'single',
          sharing_type: propertyDetails.sharingType || 'single',
          totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
          total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
          occupiedBeds: propertyDetails.occupiedBeds || 0,
          occupied_beds: propertyDetails.occupiedBeds || 0,
          price: propertyDetails.dailyRate || room.price || 0,
          dailyRate: propertyDetails.dailyRate || room.price || 0,
          monthlyRate: propertyDetails.monthlyRate || 0,
          propertyId: propertyDetails.propertyId || null,
          property_id: propertyDetails.propertyId || null,
          isActive: true,
          roomType: 'standard',
          category: propertyDetails.sharingType || 'single',
          pricingType: propertyDetails.pricingType || 'daily',
          lastCleanedAt: null,
          lastMaintenanceAt: null
        };
      });

      res.json({
        success: true,
        message: 'Room status retrieved successfully',
        data: {
          rooms: transformedRooms,
          total: transformedRooms.length,
          propertyId: propertyId || null
        }
      });

    } catch (dbError) {
      console.error('Database error in room status:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching room status',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room status'
    });
  }
});

// @desc    Get beds for a specific room
// @route   GET /api/internal/rooms/:roomId/beds
// @access  Private
router.get('/internal/rooms/:roomId/beds', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { roomId } = req.params;
    
    // Get room details
    const [rooms] = await sequelize.query(
      `SELECT id, title, total_beds, max_guests, property_details FROM rooms WHERE id = $1`,
      { bind: [roomId] }
    );

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = rooms[0];
    const propertyDetails = room.property_details || {};
    
    // Get total beds from property_details or fallback to total_beds column or max_guests
    const totalBeds = propertyDetails.totalBeds || room.total_beds || room.max_guests || 1;
    const occupiedBeds = propertyDetails.occupiedBeds || 0;
    
    // Check for existing bookings to determine which beds are occupied
    const [activeBookings] = await sequelize.query(
      `SELECT id, bed_id FROM bookings 
       WHERE room_id = $1 
       AND status IN ('confirmed', 'pending')
       AND check_out > NOW()`,
      { bind: [roomId] }
    );
    
    // Create a map of occupied bed IDs
    const occupiedBedIds = new Set();
    if (activeBookings) {
      activeBookings.forEach(booking => {
        if (booking.bed_id) {
          occupiedBedIds.add(booking.bed_id);
        }
      });
    }
    
    // Generate virtual beds based on total bed count
    const beds = [];
    for (let i = 1; i <= totalBeds; i++) {
      const bedId = `${roomId}-bed-${i}`;
      const bedNumber = `Bed ${i}`;
      const isOccupied = occupiedBedIds.has(bedId);
      
      beds.push({
        id: bedId,
        bedNumber: bedNumber,
        bed_number: bedNumber,
        roomId: roomId,
        room_id: roomId,
        status: isOccupied ? 'occupied' : 'vacant',
        guestName: null,
        guest_name: null
      });
    }

    res.json({
      success: true,
      message: 'Beds retrieved successfully',
      data: beds
    });

  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beds for room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get housekeeping tasks for internal management
// @route   GET /api/internal/housekeeping/tasks
// @access  Private
router.get('/internal/housekeeping/tasks', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId, status, priority } = req.query;

    try {
      // First try to get tasks from the database
      const whereClause = {};
      if (propertyId) whereClause.propertyId = propertyId;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;

      const tasks = await HousekeepingTask.findAll({
        where: whereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
          { model: Staff, as: 'assignee', attributes: ['id', 'name'] }
        ],
        order: [['priority', 'DESC'], ['dueDate', 'ASC']]
      });

      // Calculate summary
      const allTasks = await HousekeepingTask.findAll({ where: propertyId ? { propertyId } : {} });
      const now = new Date();

      res.json({
        success: true,
        data: tasks.map(task => ({
          id: task.id,
          roomId: task.roomId,
          roomNumber: task.room?.title?.replace('Room ', '') || 'N/A',
          floorNumber: 1,
          taskType: task.taskType,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignee?.name || null,
          description: task.description,
          estimatedDuration: task.estimatedDuration,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        })),
        summary: {
          total: allTasks.length,
          pending: allTasks.filter(t => t.status === 'pending').length,
          in_progress: allTasks.filter(t => t.status === 'in_progress').length,
          completed: allTasks.filter(t => t.status === 'completed').length,
          overdue: allTasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now).length
        }
      });
    } catch (dbError) {
      console.error('Database query error in housekeeping tasks:', dbError);
      res.json({
        success: true,
        data: [],
        summary: { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
      });
    }
  } catch (error) {
    console.error('Internal housekeeping tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching housekeeping tasks'
    });
  }
});

// @desc    Get single booking by ID
// @route   GET /api/internal/bookings/:id
// @access  Private
router.get('/internal/bookings/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
router.post('/internal/bookings/:id/cancel', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
      message: 'Error cancelling booking'
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/internal/bookings/:id/status
// @access  Private
router.put('/internal/bookings/:id/status', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
      message: 'Error updating booking status'
    });
  }
});

// @desc    Check in booking
// @route   POST /api/internal/bookings/:id/checkin
// @access  Private
router.post('/internal/bookings/:id/checkin', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;
    const { securityDepositAmount, securityDepositMethod, notes } = req.body;

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
    await booking.update({
      status: 'confirmed',
      actualCheckInTime: now,
      checkedInBy: user.id,
      specialRequests: notes ? (booking.specialRequests ? `${booking.specialRequests}\n\nCheck-in notes: ${notes}` : `Check-in notes: ${notes}`) : booking.specialRequests
    });

    // Update room status to occupied
    if (booking.roomId) {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'occupied', updated_at = NOW() WHERE id = $1`,
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
        checkedInBy: updatedBooking.checkedInBy,
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
      message: 'Error checking in booking'
    });
  }
});

// @desc    Check out booking
// @route   POST /api/internal/bookings/:id/checkout
// @access  Private
router.post('/internal/bookings/:id/checkout', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
      checkedOutBy: user.id,
      specialRequests: notes ? (booking.specialRequests ? `${booking.specialRequests}\n\nCheck-out notes: ${notes}` : `Check-out notes: ${notes}`) : booking.specialRequests
    });

    // Update room status to vacant_dirty (needs cleaning after checkout)
    if (booking.roomId) {
      await sequelize.query(
        `UPDATE rooms SET current_status = 'vacant_dirty', updated_at = NOW() WHERE id = $1`,
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
        checkedInBy: updatedBooking.checkedInBy,
        checkedOutBy: updatedBooking.checkedOutBy,
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
      message: 'Error checking out booking'
    });
  }
});

// @desc    Create new booking
// @route   POST /api/internal/bookings
// @access  Private
router.post('/internal/bookings', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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
    
    const [result] = await sequelize.query(`
      INSERT INTO bookings (
        id, room_id, room_id_old, user_id, owner_id, check_in, check_out, 
        guests, total_amount, status, payment_status, 
        special_requests, contact_info,
        created_at, updated_at
      ) VALUES (
        $1, $2, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, 
        $11, $12,
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
        'confirmed',
        bookingData.paymentStatus || 'pending',
        bookingData.specialRequests || null,
        JSON.stringify({
          name: bookingData.guestName || 'Walk-in Guest',
          phone: bookingData.guestPhone || '',
          email: bookingData.guestEmail || '',
          bedNumber: bedNumber,
          bookingType: bookingData.bookingType || 'daily'
        })
      ]
    });

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
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Change room for booking
// @route   POST /api/internal/bookings/:id/change-room
// @access  Private
router.post('/internal/bookings/:id/change-room', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

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

// @desc    Get single property details for internal management
// @route   GET /api/internal/properties/:id
// @access  Private
router.get('/internal/properties/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;

    try {
      // Get property from the database using raw query
      let whereClause = 'WHERE p.id = $1';
      let queryParams = [id];
      
      if (user.role === 'owner') {
        whereClause = 'WHERE p.id = $1 AND p.owner_id = $2';
        queryParams = [id, user.id];
      }

      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        ${whereClause}
      `, {
        bind: queryParams
      });

      if (!properties || properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      const property = properties[0];

      // Get rooms for this property
      let rooms = [];
      let roomCount = 0;
      let occupiedCount = 0;
      try {
        const [roomsData] = await sequelize.query(`
          SELECT id, title, price, max_guests, property_details
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = $1
          ORDER BY title
        `, {
          bind: [id]
        });
        
        rooms = (roomsData || []).map((room) => {
          const propertyDetails = room.property_details || {};
          const roomNumber = (room.title || '').replace('Room ', '');
          return {
            id: room.id,
            roomNumber: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            sharingType: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.max_guests || 1,
            currentStatus: propertyDetails.currentStatus || 'vacant_clean',
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            availableBeds: propertyDetails.availableBeds || propertyDetails.totalBeds || room.max_guests || 1,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            description: `Room ${roomNumber} - ${propertyDetails.sharingType || 'single'} sharing`
          };
        });
        
        roomCount = rooms.length;
        occupiedCount = rooms.filter(r => r.currentStatus === 'occupied').length;
      } catch (roomError) {
        console.error('Error fetching rooms:', roomError);
      }

      // Parse JSONB fields
      const location = typeof property.location === 'string' ? JSON.parse(property.location) : (property.location || {});
      const contactInfo = typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : (property.contact_info || {});
      const images = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);

      // Format the property data with all fields
      const formattedProperty = {
        id: property.id,
        name: property.name || 'Unnamed Property',
        description: property.description || '',
        type: property.type || 'hotel',
        ownerId: property.owner_id,
        ownerName: property.owner_name,
        ownerEmail: property.owner_email,
        ownerPhone: property.owner_phone,
        location: {
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          country: location.country || 'India',
          pincode: location.pincode || '',
          latitude: location.latitude || null,
          longitude: location.longitude || null
        },
        contactInfo: {
          phone: contactInfo.phone || property.owner_phone || '',
          email: contactInfo.email || property.owner_email || '',
          website: contactInfo.website || ''
        },
        amenities: property.amenities || [],
        images: images,
        rules: property.rules || [],
        checkInTime: property.check_in_time || '14:00',
        checkOutTime: property.check_out_time || '11:00',
        totalFloors: property.total_floors || 1,
        totalRooms: roomCount || property.total_rooms || 0,
        occupiedRooms: occupiedCount,
        availableRooms: (roomCount || property.total_rooms || 0) - occupiedCount,
        occupancyRate: roomCount > 0 ? ((occupiedCount / roomCount) * 100).toFixed(1) : 0,
        isActive: property.is_active !== false,
        isFeatured: property.is_featured === true,
        approvalStatus: property.approval_status || 'pending',
        rating: typeof property.rating === 'string' ? JSON.parse(property.rating) : (property.rating || {}),
        metadata: typeof property.metadata === 'string' ? JSON.parse(property.metadata) : (property.metadata || {}),
        rooms: rooms,
        createdAt: property.created_at,
        updatedAt: property.updated_at
      };

      res.json({
        success: true,
        data: formattedProperty
      });
    } catch (dbError) {
      console.error('Database query error in property details:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property details from database'
      });
    }
  } catch (error) {
    console.error('Internal property details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property details'
    });
  }
});

// @desc    Get properties for internal management
// @route   GET /api/internal/properties
// @access  Private
router.get('/internal/properties', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default high limit for properties
    const offset = (page - 1) * limit;

    // For property owners, filter to show only their properties
    // For superusers/admins, show all properties
    let whereClause = {};
    
    if (user.role === 'owner') {
      // Property owners should only see their own properties
      // For now, we'll use email matching since we don't have propertyId in User model yet
      whereClause.email = user.email;
    }

    try {
      // Get properties from the database using raw query
      let whereClause = '';
      let queryParams = [];
      
      if (user.role === 'owner') {
        // Property owners should only see their own properties
        whereClause = 'WHERE p.owner_id = $1';
        queryParams = [user.id];
      }

      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        ${whereClause}
        ORDER BY p.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `, {
        bind: queryParams
      });

      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count FROM properties p ${whereClause}
      `, {
        bind: queryParams
      });
      
      const totalProperties = parseInt(countResult[0].count);

      // Convert properties to frontend format
      const formattedProperties = properties.map((property) => {
        return {
          id: property.id,
          name: property.title || property.name || property.property_name || 'Unnamed Property',
          ownerName: property.owner_name || user.name,
          ownerEmail: property.owner_email || user.email,
          ownerPhone: property.owner_phone || '+91 98765 43210',
          type: property.category || property.property_type || 'hotel',
          address: {
            street: property.address || (property.location && typeof property.location === 'object' ? property.location.address : 'Address not provided'),
            city: property.city || (property.location && typeof property.location === 'object' ? property.location.city : 'Unknown'),
            state: property.state || (property.location && typeof property.location === 'object' ? property.location.state : 'Unknown'),
            country: property.country || (property.location && typeof property.location === 'object' ? property.location.country : 'India'),
            pincode: property.pincode || (property.location && typeof property.location === 'object' ? property.location.pincode : '')
          },
          totalRooms: property.total_rooms || property.totalRooms || 0,
          occupiedRooms: Math.floor((property.total_rooms || property.totalRooms || 0) * 0.75),
          availableRooms: Math.ceil((property.total_rooms || property.totalRooms || 0) * 0.25),
          status: (property.is_active !== false && property.isActive !== false) ? 'active' : 'inactive',
          onboardingStatus: (property.approval_status === 'approved' || property.approvalStatus === 'approved') ? 'completed' : 'in_progress',
          revenue: {
            currentMonth: (property.total_rooms || property.totalRooms || 0) * 3000,
            currency: 'INR'
          },
          occupancyRate: 75.0,
          createdAt: property.created_at || property.createdAt,
          updatedAt: property.updated_at || property.updatedAt
        };
      });

      res.json({
        success: true,
        count: formattedProperties.length,
        total: totalProperties,
        page,
        pages: Math.ceil(totalProperties / limit),
        data: formattedProperties
      });
    } catch (dbError) {
      console.error('Database query error in properties:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching properties from database'
      });
    }
  } catch (error) {
    console.error('Internal properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties'
    });
  }
});

// @desc    Update property details for internal management
// @route   PUT /api/internal/properties/:id
// @access  Private
router.put('/internal/properties/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // For property owners, ensure they can only update their own properties
    let whereClause = 'WHERE p.id = $1';
    let queryParams = [id];
    
    if (user.role === 'owner') {
      whereClause = 'WHERE p.id = $1 AND p.owner_id = $2';
      queryParams = [id, user.id];
    }

    // Check if property exists and user has access
    const [existingProperties] = await sequelize.query(`
      SELECT * FROM properties p ${whereClause}
    `, {
      bind: queryParams
    });

    if (!existingProperties || existingProperties.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or access denied'
      });
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = user.role === 'owner' ? 3 : 2;

    // Basic info
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }
    if (updateData.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(updateData.type);
    }

    // Location (JSONB)
    if (updateData.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.location));
    }

    // Contact info (JSONB)
    if (updateData.contactInfo !== undefined) {
      updateFields.push(`contact_info = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.contactInfo));
    }

    // Amenities (array)
    if (updateData.amenities !== undefined) {
      updateFields.push(`amenities = $${paramIndex++}`);
      updateValues.push(updateData.amenities);
    }

    // Images (JSONB)
    if (updateData.images !== undefined) {
      updateFields.push(`images = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.images));
    }

    // Rules (array)
    if (updateData.rules !== undefined) {
      updateFields.push(`rules = $${paramIndex++}`);
      updateValues.push(updateData.rules);
    }

    // Check-in/Check-out times
    if (updateData.checkInTime !== undefined) {
      updateFields.push(`check_in_time = $${paramIndex++}`);
      updateValues.push(updateData.checkInTime);
    }
    if (updateData.checkOutTime !== undefined) {
      updateFields.push(`check_out_time = $${paramIndex++}`);
      updateValues.push(updateData.checkOutTime);
    }

    // Total floors/rooms
    if (updateData.totalFloors !== undefined) {
      updateFields.push(`total_floors = $${paramIndex++}`);
      updateValues.push(updateData.totalFloors);
    }
    if (updateData.totalRooms !== undefined) {
      updateFields.push(`total_rooms = $${paramIndex++}`);
      updateValues.push(updateData.totalRooms);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at, nothing else to update
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Execute update
    const updateWhereClause = user.role === 'owner'
      ? 'WHERE id = $1 AND owner_id = $2'
      : 'WHERE id = $1';

    await sequelize.query(`
      UPDATE properties 
      SET ${updateFields.join(', ')}
      ${updateWhereClause}
    `, {
      bind: [...queryParams, ...updateValues]
    });

    // Fetch updated property
    const [updatedProperties] = await sequelize.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p 
      LEFT JOIN users u ON p.owner_id = u.id 
      ${whereClause}
    `, {
      bind: queryParams
    });

    const property = updatedProperties[0];

    // Format response
    const formattedProperty = {
      id: property.id,
      name: property.name,
      description: property.description,
      type: property.type,
      location: typeof property.location === 'string' ? JSON.parse(property.location) : property.location,
      contactInfo: typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : property.contact_info,
      amenities: property.amenities || [],
      images: typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []),
      rules: property.rules || [],
      checkInTime: property.check_in_time,
      checkOutTime: property.check_out_time,
      totalFloors: property.total_floors,
      totalRooms: property.total_rooms,
      isActive: property.is_active,
      isFeatured: property.is_featured,
      approvalStatus: property.approval_status,
      ownerId: property.owner_id,
      ownerName: property.owner_name,
      ownerEmail: property.owner_email,
      createdAt: property.created_at,
      updatedAt: property.updated_at
    };

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: formattedProperty
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property'
    });
  }
});

// @desc    Direct property creation for superusers/platform admins (bypasses lead workflow)
// @route   POST /api/internal/properties/direct
// @access  Private (superuser, platform_admin only)
router.post('/internal/properties/direct', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Only superusers and platform admins can create properties directly
    const allowedRoles = ['superuser', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only superusers and platform admins can create properties directly.'
      });
    }

    const {
      // Property details
      name,
      description,
      type,
      location,
      contactInfo,
      amenities,
      images,
      rules,
      totalFloors,
      totalRooms,
      checkInTime,
      checkOutTime,
      // Owner details
      ownerName,
      ownerEmail,
      ownerPhone,
      existingOwnerId,
      createNewOwner
    } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Property name and type are required'
      });
    }

    if (!location || !location.city || !location.state) {
      return res.status(400).json({
        success: false,
        message: 'Property location (city and state) is required'
      });
    }

    // Validate owner information
    if (!existingOwnerId && createNewOwner) {
      if (!ownerName || !ownerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Owner name and email are required when creating a new owner'
        });
      }
    }

    let ownerId = existingOwnerId;

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create new owner if needed
      if (createNewOwner && !existingOwnerId) {
        // Check if user with this email already exists
        const existingUser = await User.findOne({
          where: { email: ownerEmail.toLowerCase() },
          transaction
        });

        if (existingUser) {
          // Use existing user as owner
          ownerId = existingUser.id;
          
          // Update role to owner if not already
          if (existingUser.role === 'user') {
            await existingUser.update({ role: 'owner' }, { transaction });
          }
        } else {
          // Create new user as property owner
          const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
          const newOwner = await User.create({
            name: ownerName,
            email: ownerEmail.toLowerCase(),
            phone: ownerPhone || null,
            password: tempPassword,
            role: 'owner',
            isVerified: true // Auto-verify since created by admin
          }, { transaction });

          ownerId = newOwner.id;

          // TODO: Send welcome email with temporary password
          console.log(`New owner created: ${ownerEmail} with temp password (should be emailed)`);
        }
      }

      // Validate that we have an owner
      if (!ownerId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Property owner is required. Either select an existing owner or create a new one.'
        });
      }

      // Create the property directly with approved status
      const property = await Property.create({
        name,
        description: description || null,
        type,
        ownerId,
        location: location || {},
        contactInfo: contactInfo || {},
        amenities: amenities || [],
        images: images || [],
        rules: rules || [],
        totalFloors: totalFloors || null,
        totalRooms: totalRooms || null,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        isActive: true,
        isFeatured: false,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user.id,
        metadata: {
          createdDirectly: true,
          createdBy: user.id,
          createdByName: user.name,
          createdByRole: user.role,
          bypassedLeadWorkflow: true
        }
      }, { transaction });

      // Commit transaction
      await transaction.commit();

      // Fetch the created property with owner details
      const createdProperty = await Property.findByPk(property.id, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Property created successfully (bypassed lead workflow)',
        data: {
          id: createdProperty.id,
          name: createdProperty.name,
          description: createdProperty.description,
          type: createdProperty.type,
          location: createdProperty.location,
          contactInfo: createdProperty.contactInfo,
          amenities: createdProperty.amenities,
          images: createdProperty.images,
          rules: createdProperty.rules,
          totalFloors: createdProperty.totalFloors,
          totalRooms: createdProperty.totalRooms,
          checkInTime: createdProperty.checkInTime,
          checkOutTime: createdProperty.checkOutTime,
          isActive: createdProperty.isActive,
          approvalStatus: createdProperty.approvalStatus,
          approvedAt: createdProperty.approvedAt,
          owner: createdProperty.owner ? {
            id: createdProperty.owner.id,
            name: createdProperty.owner.name,
            email: createdProperty.owner.email,
            phone: createdProperty.owner.phone
          } : null,
          createdAt: createdProperty.createdAt
        }
      });

    } catch (dbError) {
      await transaction.rollback();
      console.error('Database error creating property:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Direct property creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: error.message
    });
  }
});

// @desc    Get property owners for superuser management (legacy endpoint)
// @route   GET /api/internal/superuser/property-owners
// @access  Private
router.get('/internal/superuser/property-owners', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
      // Get property owners from leads data (unique by email)
      const leads = await Lead.findAll({
        attributes: [
          'id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 'created_at'
        ],
        order: [['created_at', 'DESC']]
      });

      // Group by email to get unique property owners
      const ownerMap = new Map();
      leads.forEach(lead => {
        if (!ownerMap.has(lead.email)) {
          ownerMap.set(lead.email, {
            id: `owner_${lead.id}`,
            name: lead.property_owner_name,
            email: lead.email,
            phone: lead.phone,
            businessName: lead.business_name,
            totalProperties: 0,
            activeProperties: 0,
            totalRooms: 0,
            cities: new Set(),
            joinedDate: lead.created_at,
            status: 'active',
            isVerified: lead.status === 'approved'
          });
        }
        
        const owner = ownerMap.get(lead.email);
        owner.totalProperties++;
        if (lead.status === 'approved') {
          owner.activeProperties++;
        }
        owner.totalRooms += lead.estimated_rooms || 0;
        if (lead.city) {
          owner.cities.add(lead.city);
        }
      });

      // Convert to array and apply pagination
      const allOwners = Array.from(ownerMap.values()).map(owner => ({
        ...owner,
        cities: Array.from(owner.cities).join(', '),
        propertiesCount: owner.totalProperties,
        createdAt: owner.joinedDate,
        updatedAt: owner.joinedDate
      }));

      const totalOwners = allOwners.length;
      const paginatedOwners = allOwners.slice(offset, offset + limit);

      // Return in the format expected by superuserService
      res.json({
        success: true,
        data: {
          propertyOwners: paginatedOwners
        },
        count: paginatedOwners.length,
        total: totalOwners,
        page,
        pages: Math.ceil(totalOwners / limit)
      });
    } catch (dbError) {
      console.error('Database query error in superuser property owners:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owners from database'
      });
    }
  } catch (error) {
    console.error('Internal superuser property owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owners'
    });
  }
});

// @desc    Get single property owner for superuser management
// @route   GET /api/internal/superuser/property-owners/:id
// @access  Private
router.get('/internal/superuser/property-owners/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id } = req.params;

    try {
      // Extract the lead ID from the owner ID (format: owner_123)
      const leadId = id.replace('owner_', '');
      
      // Get the specific lead/property owner
      const lead = await Lead.findByPk(leadId, {
        attributes: [
          'id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 
          'created_at', 'updated_at', 'address', 'pincode'
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      // Get all leads for this email to calculate totals
      const allLeadsForOwner = await Lead.findAll({
        where: { email: lead.email },
        attributes: ['id', 'status', 'estimated_rooms', 'city', 'property_type']
      });

      const totalProperties = allLeadsForOwner.length;
      const activeProperties = allLeadsForOwner.filter(l => l.status === 'approved').length;
      const totalRooms = allLeadsForOwner.reduce((sum, l) => sum + (l.estimated_rooms || 0), 0);
      const cities = [...new Set(allLeadsForOwner.map(l => l.city).filter(Boolean))];

      const propertyOwner = {
        id: `owner_${lead.id}`,
        name: lead.property_owner_name,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.business_name,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        totalProperties,
        activeProperties,
        totalRooms,
        cities: cities.join(', '),
        status: 'active',
        isVerified: lead.status === 'approved',
        propertiesCount: totalProperties,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        properties: allLeadsForOwner.map(l => ({
          id: l.id,
          type: l.property_type,
          status: l.status,
          estimatedRooms: l.estimated_rooms,
          city: l.city
        }))
      };

      res.json({
        success: true,
        data: {
          propertyOwner
        }
      });
    } catch (dbError) {
      console.error('Database query error in single property owner:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owner from database'
      });
    }
  } catch (error) {
    console.error('Internal superuser single property owner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owner'
    });
  }
});

// @desc    Get property owners for platform management
// @route   GET /api/internal/platform/property-owners
// @access  Private
router.get('/internal/platform/property-owners', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
      // Get property owners from leads data (unique by email)
      const leads = await Lead.findAll({
        attributes: [
          'id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 'created_at'
        ],
        order: [['created_at', 'DESC']]
      });

      // Group by email to get unique property owners
      const ownerMap = new Map();
      leads.forEach(lead => {
        if (!ownerMap.has(lead.email)) {
          ownerMap.set(lead.email, {
            id: `owner_${lead.id}`,
            name: lead.property_owner_name,
            email: lead.email,
            phone: lead.phone,
            businessName: lead.business_name,
            totalProperties: 0,
            activeProperties: 0,
            totalRooms: 0,
            cities: new Set(),
            joinedDate: lead.created_at,
            status: 'active'
          });
        }
        
        const owner = ownerMap.get(lead.email);
        owner.totalProperties++;
        if (lead.status === 'approved') {
          owner.activeProperties++;
        }
        owner.totalRooms += lead.estimated_rooms || 0;
        if (lead.city) {
          owner.cities.add(lead.city);
        }
      });

      // Convert to array and apply pagination
      const allOwners = Array.from(ownerMap.values()).map(owner => ({
        ...owner,
        cities: Array.from(owner.cities).join(', '),
        propertiesCount: owner.totalProperties
      }));

      const totalOwners = allOwners.length;
      const paginatedOwners = allOwners.slice(offset, offset + limit);

      res.json({
        success: true,
        count: paginatedOwners.length,
        total: totalOwners,
        page,
        pages: Math.ceil(totalOwners / limit),
        data: paginatedOwners
      });
    } catch (dbError) {
      console.error('Database query error in property owners:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owners from database'
      });
    }
  } catch (error) {
    console.error('Internal property owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owners'
    });
  }
});

// @desc    Get all properties for platform management (superusers/admins only)
// @route   GET /api/internal/platform/properties
// @access  Private
router.get('/internal/platform/properties', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions (superuser, admin, category_owner)
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;

    try {
      // Get all properties with actual room counts from the rooms table
      const [properties] = await sequelize.query(`
        SELECT p.*, 
               u.name as owner_name, 
               u.email as owner_email,
               COALESCE(r.total_rooms, 0) as actual_total_rooms,
               COALESCE(r.occupied_rooms, 0) as actual_occupied_rooms
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        LEFT JOIN (
          SELECT 
            property_details->>'propertyId' as property_id,
            COUNT(*) as total_rooms,
            COUNT(CASE WHEN property_details->>'currentStatus' = 'occupied' THEN 1 END) as occupied_rooms
          FROM rooms 
          WHERE is_active = true
          AND property_details->>'propertyId' IS NOT NULL
          GROUP BY property_details->>'propertyId'
        ) r ON r.property_id = p.id::text
        ORDER BY p.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `);

      const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM properties');
      const totalProperties = parseInt(countResult[0].count);

      // Convert properties to platform format
      const formattedProperties = properties.map((property) => {
        const totalRooms = parseInt(property.actual_total_rooms) || 0;
        const occupiedRooms = parseInt(property.actual_occupied_rooms) || 0;
        const availableRooms = totalRooms - occupiedRooms;
        
        return {
          id: property.id,
          name: property.title || property.name || property.property_name || 'Unnamed Property',
          title: property.title || property.name || property.property_name || 'Unnamed Property',
          category: {
            name: property.category || property.property_type || property.type || 'hotel',
            id: property.category || property.property_type || property.type || 'hotel'
          },
          location: property.location ? (typeof property.location === 'string' ? JSON.parse(property.location) : property.location) : {
            address: property.address || 'Address not provided',
            city: property.city || 'Unknown',
            state: property.state || 'Unknown',
            country: property.country || 'India'
          },
          owner: {
            id: property.owner_id || property.ownerId,
            name: property.owner_name || 'Unknown Owner',
            email: property.owner_email || 'unknown@example.com'
          },
          statistics: {
            totalRooms: totalRooms,
            occupiedRooms: occupiedRooms,
            availableRooms: availableRooms
          },
          isActive: property.is_active !== false && property.isActive !== false,
          status: (property.is_active !== false && property.isActive !== false) ? 'active' : 'inactive',
          onboardingStatus: (property.approval_status === 'approved' || property.approvalStatus === 'approved') ? 'completed' : 'in_progress',
          revenue: {
            currentMonth: totalRooms * 3000,
            currency: 'INR'
          },
          occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
          createdAt: property.created_at || property.createdAt,
          updatedAt: property.updated_at || property.updatedAt
        };
      });

      res.json({
        success: true,
        count: formattedProperties.length,
        total: totalProperties,
        page,
        pages: Math.ceil(totalProperties / limit),
        data: formattedProperties
      });
    } catch (dbError) {
      console.error('Database query error in platform properties:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching properties'
      });
    }
  } catch (error) {
    console.error('Internal platform properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform properties'
    });
  }
});

// @desc    Get single property details for platform management
// @route   GET /api/internal/platform/properties/:id
// @access  Private
router.get('/internal/platform/properties/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id } = req.params;

    try {
      // Get property from the properties table
      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.id = $1
      `, { bind: [id] });

      if (!properties || properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = properties[0];

      // Get actual room count and stats from rooms table
      const [roomStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_rooms,
          COUNT(CASE WHEN property_details->>'currentStatus' = 'occupied' THEN 1 END) as occupied_rooms
        FROM rooms 
        WHERE is_active = true 
        AND property_details->>'propertyId' = $1
      `, { bind: [id] });

      const totalRooms = parseInt(roomStats[0]?.total_rooms) || 0;
      const occupiedRooms = parseInt(roomStats[0]?.occupied_rooms) || 0;

      // Parse JSONB fields
      const location = typeof property.location === 'string' ? JSON.parse(property.location) : (property.location || {});
      const contactInfo = typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : (property.contact_info || {});
      const images = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);

      // Format the property data
      const formattedProperty = {
        id: property.id,
        name: property.name || 'Unnamed Property',
        description: property.description || '',
        type: property.type || 'hotel',
        ownerId: property.owner_id,
        ownerName: property.owner_name,
        ownerEmail: property.owner_email,
        ownerPhone: property.owner_phone,
        location: {
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          country: location.country || 'India',
          pincode: location.pincode || ''
        },
        contactInfo: contactInfo,
        amenities: property.amenities || [],
        images: images,
        rules: property.rules || [],
        checkInTime: property.check_in_time || '14:00',
        checkOutTime: property.check_out_time || '11:00',
        totalFloors: property.total_floors || 1,
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
        isActive: property.is_active !== false,
        isFeatured: property.is_featured === true,
        approvalStatus: property.approval_status || 'pending',
        status: property.is_active !== false ? 'active' : 'inactive',
        onboardingStatus: property.approval_status === 'approved' ? 'completed' : 'in_progress',
        revenue: {
          currentMonth: totalRooms * 3000,
          currency: 'INR'
        },
        createdAt: property.created_at,
        updatedAt: property.updated_at
      };

      res.json({
        success: true,
        data: formattedProperty
      });
    } catch (dbError) {
      console.error('Database query error in platform property details:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching property details'
      });
    }
  } catch (error) {
    console.error('Internal platform property details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform property details'
    });
  }
});

// @desc    Bulk create rooms for a property (Internal Management)
// @route   POST /api/internal/properties/:propertyId/rooms/bulk
// @access  Private
router.post('/internal/properties/:propertyId/rooms/bulk', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { propertyId } = req.params;
    const { 
      floorType = 'regular',
      floorNumber, 
      startRoom, 
      endRoom, 
      sharingType, 
      dailyRate, 
      monthlyRate 
    } = req.body;

    // Validate required fields
    if (!floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate room range
    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number cannot be greater than end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 50 rooms at once'
      });
    }

    // Check if property exists
    const [propertyCheck] = await sequelize.query(
      'SELECT id, owner_id FROM properties WHERE id = $1',
      { bind: [propertyId] }
    );

    if (!propertyCheck || propertyCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const property = propertyCheck[0];

    // For property owners, ensure they own the property
    if (user.role === 'owner' && property.owner_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add rooms to your own properties.'
      });
    }

    // Determine bed count based on sharing type
    const bedCounts = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[sharingType] || 1;

    // Map frontend sharing types to database enum values
    const sharingTypeMap = {
      'single': 'single',
      '2_sharing': 'double',
      '3_sharing': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory'
    };
    const dbSharingType = sharingTypeMap[sharingType] || 'single';

    // Generate room numbers and check for duplicates
    const roomsToCreate = [];
    const warnings = [];
    
    for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
      
      // Check if room already exists using property_details JSON (property_id column may be null)
      const roomTitle = `Room ${roomNumber}`;
      const [existingRoom] = await sequelize.query(
        `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
        { bind: [propertyId, roomNumber, roomTitle] }
      );

      if (existingRoom && existingRoom.length > 0) {
        warnings.push(`Room ${roomNumber} already exists, skipping`);
        continue;
      }

      // Create room data using correct database schema
      const roomData = {
        id: require('uuid').v4(),
        property_id: propertyId,
        title: roomTitle,
        room_number: roomNumber,
        description: `${sharingType} room on floor ${floorNumber}`,
        room_type: 'standard',
        sharing_type: dbSharingType,
        total_beds: totalBeds,
        price: dailyRate || 0,
        pricing_type: 'per_bed',
        current_status: 'vacant_clean',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        // Store additional pricing info in property_details JSON
        property_details: JSON.stringify({
          propertyId: propertyId,
          dailyRate: dailyRate || 0,
          monthlyRate: monthlyRate || (dailyRate || 0) * 30,
          floorNumber: floorNumber,
          roomNumber: roomNumber
        })
      };

      roomsToCreate.push(roomData);
    }

    if (roomsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms to create. All room numbers already exist.',
        warnings
      });
    }

    // Bulk insert rooms using correct column names
    const insertQuery = `
      INSERT INTO rooms (
        id, property_id, title, room_number, description, room_type, sharing_type, 
        total_beds, price, pricing_type, current_status, is_active, 
        created_at, updated_at, property_details
      ) VALUES ${roomsToCreate.map((_, index) => 
        `($${index * 15 + 1}, $${index * 15 + 2}, $${index * 15 + 3}, $${index * 15 + 4}, $${index * 15 + 5}, $${index * 15 + 6}, $${index * 15 + 7}, $${index * 15 + 8}, $${index * 15 + 9}, $${index * 15 + 10}, $${index * 15 + 11}, $${index * 15 + 12}, $${index * 15 + 13}, $${index * 15 + 14}, $${index * 15 + 15})`
      ).join(', ')}
      RETURNING id, title, room_number
    `;

    const bindValues = roomsToCreate.flatMap(room => [
      room.id, room.property_id, room.title, room.room_number, room.description, room.room_type, room.sharing_type,
      room.total_beds, room.price, room.pricing_type, room.current_status, room.is_active,
      room.created_at, room.updated_at, room.property_details
    ]);

    const [createdRooms] = await sequelize.query(insertQuery, { bind: bindValues });

    res.json({
      success: true,
      message: `Successfully created ${createdRooms.length} room(s)`,
      data: {
        created: createdRooms.length,
        total: roomCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        rooms: createdRooms
      }
    });

  } catch (dbError) {
    console.error('Database error in bulk room creation:', dbError);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
    });
  }
});

// @desc    Bulk create rooms (Superuser Service endpoint)
// @route   POST /api/internal/superuser/bulk-create-rooms
// @access  Private
router.post('/internal/superuser/bulk-create-rooms', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user is superuser
    if (user.role !== 'superuser') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superuser role required.'
      });
    }

    const { 
      propertyId, 
      floorType = 'regular',
      floorNumber, 
      startRoom, 
      endRoom, 
      sharingType, 
      dailyRate, 
      monthlyRate 
    } = req.body;

    // Validate required fields
    if (!propertyId || !floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate room range
    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number cannot be greater than end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 50 rooms at once'
      });
    }

    // Check if property exists
    const [propertyCheck] = await sequelize.query(
      'SELECT id, owner_id FROM properties WHERE id = $1',
      { bind: [propertyId] }
    );

    if (!propertyCheck || propertyCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Determine bed count based on sharing type
    const bedCounts = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[sharingType] || 1;

    // Map frontend sharing types to database enum values
    const sharingTypeMap = {
      'single': 'single',
      '2_sharing': 'double',
      '3_sharing': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory'
    };
    const dbSharingType = sharingTypeMap[sharingType] || 'single';

    // Generate room numbers and check for duplicates
    const roomsToCreate = [];
    const warnings = [];
    
    for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
      
      // Check if room already exists using property_details JSON (property_id column may be null)
      const roomTitle = `Room ${roomNumber}`;
      const [existingRoom] = await sequelize.query(
        `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
        { bind: [propertyId, roomNumber, roomTitle] }
      );

      if (existingRoom && existingRoom.length > 0) {
        warnings.push(`Room ${roomNumber} already exists, skipping`);
        continue;
      }

      // Create room data using correct database schema
      const roomData = {
        id: require('uuid').v4(),
        property_id: propertyId,
        title: roomTitle,
        room_number: roomNumber,
        description: `${sharingType} room on floor ${floorNumber}`,
        room_type: 'standard',
        sharing_type: dbSharingType,
        total_beds: totalBeds,
        price: dailyRate || 0,
        pricing_type: 'per_bed',
        current_status: 'vacant_clean',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        // Store additional pricing info in property_details JSON
        property_details: JSON.stringify({
          propertyId: propertyId,
          dailyRate: dailyRate || 0,
          monthlyRate: monthlyRate || (dailyRate || 0) * 30,
          floorNumber: floorNumber,
          roomNumber: roomNumber
        })
      };

      roomsToCreate.push(roomData);
    }

    if (roomsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms to create. All room numbers already exist.',
        warnings
      });
    }

    // Bulk insert rooms using correct column names
    const insertQuery = `
      INSERT INTO rooms (
        id, property_id, title, room_number, description, room_type, sharing_type, 
        total_beds, price, pricing_type, current_status, is_active, 
        created_at, updated_at, property_details
      ) VALUES ${roomsToCreate.map((_, index) => 
        `($${index * 15 + 1}, $${index * 15 + 2}, $${index * 15 + 3}, $${index * 15 + 4}, $${index * 15 + 5}, $${index * 15 + 6}, $${index * 15 + 7}, $${index * 15 + 8}, $${index * 15 + 9}, $${index * 15 + 10}, $${index * 15 + 11}, $${index * 15 + 12}, $${index * 15 + 13}, $${index * 15 + 14}, $${index * 15 + 15})`
      ).join(', ')}
      RETURNING id, title, room_number
    `;

    const bindValues = roomsToCreate.flatMap(room => [
      room.id, room.property_id, room.title, room.room_number, room.description, room.room_type, room.sharing_type,
      room.total_beds, room.price, room.pricing_type, room.current_status, room.is_active,
      room.created_at, room.updated_at, room.property_details
    ]);

    const [createdRooms] = await sequelize.query(insertQuery, { bind: bindValues });

    res.json({
      success: true,
      message: `Successfully created ${createdRooms.length} room(s)`,
      data: {
        created: createdRooms.length,
        total: roomCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        rooms: createdRooms
      }
    });

  } catch (dbError) {
    console.error('Database error in superuser bulk room creation:', dbError);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
    });
  }
});

// @desc    Bulk create rooms (Working endpoint with Room model)
// @route   POST /api/internal/rooms/bulk-create
// @access  Private
router.post('/internal/rooms/bulk-create', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId, floorType = 'regular', floorNumber, startRoom, endRoom, categoryId, sharingType, dailyRate, monthlyRate } = req.body;

    // Validation
    if (!propertyId || !floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate rates - at least one rate must be provided
    if (!dailyRate && !monthlyRate) {
      return res.status(400).json({
        success: false,
        message: 'At least one rate (dailyRate or monthlyRate) must be provided'
      });
    }

    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number must be less than or equal to end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 100 rooms at once'
      });
    }

    try {
      // Check if property exists
      const [propertyCheck] = await sequelize.query(
        'SELECT id, owner_id FROM properties WHERE id = $1',
        { bind: [propertyId] }
      );

      if (!propertyCheck || propertyCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = propertyCheck[0];

      // For property owners, ensure they own the property
      if (user.role === 'owner' && property.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only add rooms to your own properties.'
        });
      }

      // Determine bed count based on sharing type
      const bedCounts = {
        'single': 1,
        '2_sharing': 2,
        '3_sharing': 3,
        'quad': 4,
        'dormitory': 6
      };
      const totalBeds = bedCounts[sharingType] || 1;

      // Map frontend sharing types to database enum values
      const sharingTypeMap = {
        'single': 'single',
        '2_sharing': 'double',
        '3_sharing': 'triple',
        'quad': 'quad',
        'dormitory': 'dormitory'
      };
      const dbSharingType = sharingTypeMap[sharingType] || 'single';

      // Generate room data using Room model schema
      const roomsToCreate = [];
      const warnings = [];
      
      for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
        
        // Check if room already exists using property_details JSON (property_id column may be null)
        const roomTitle = `Room ${roomNumber}`;
        const [existingRoom] = await sequelize.query(
          `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
          { bind: [propertyId, roomNumber, roomTitle] }
        );

        if (existingRoom && existingRoom.length > 0) {
          warnings.push(`Room ${roomNumber} already exists, skipping`);
          continue;
        }

        // Try to create room with minimal data to avoid enum conflicts
        const roomData = {
          title: roomTitle,
          description: `Room ${roomNumber} on floor ${floorNumber} with ${sharingType} sharing type. This is a comfortable accommodation space.`,
          price: dailyRate || 0, // Use daily rate as primary price
          location: {
            address: 'Property Address',
            city: 'City',
            state: 'State',
            country: 'India'
          },
          category: 'PG',
          maxGuests: totalBeds,
          ownerId: property.owner_id,
          propertyId: propertyId
        };

        // Store room data without roomType to avoid enum conflicts
        roomsToCreate.push(roomData);
      }

      if (roomsToCreate.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No rooms to create. All room numbers already exist.',
          warnings
        });
      }

      // Create rooms using raw SQL to avoid model enum conflicts
      const createdRooms = [];
      for (const roomData of roomsToCreate) {
        try {
          // Use raw SQL to insert room with correct enum values and dual pricing
          const [result] = await sequelize.query(`
            INSERT INTO rooms (
              id, title, description, price, location, room_type, category, 
              max_guests, amenities, images, rules, rating, availability, 
              owner_id, is_active, featured, approval_status, hotel_room_types,
              property_details, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, 'shared', $5, 
              $6, '{}', '[]', '{}', '{"average":0,"count":0}', '{"isAvailable":true}',
              $7, true, false, 'approved', '{}',
              $8, NOW(), NOW()
            ) RETURNING id, title
          `, {
            bind: [
              roomData.title,
              roomData.description, 
              roomData.price, // Daily rate as primary price
              JSON.stringify(roomData.location),
              roomData.category,
              roomData.maxGuests,
              roomData.ownerId,
              JSON.stringify({
                floorNumber: floorNumber,
                sharingType: sharingType,
                totalBeds: totalBeds,
                occupiedBeds: 0,
                availableBeds: totalBeds,
                currentStatus: 'vacant_clean',
                propertyId: propertyId,
                dailyRate: dailyRate || 0,
                monthlyRate: monthlyRate || 0,
                pricingType: dailyRate && monthlyRate ? 'both' : (dailyRate ? 'daily' : 'monthly')
              })
            ]
          });
          
          if (result && result.length > 0) {
            createdRooms.push(result[0]);
          }
        } catch (roomError) {
          console.error('Error creating individual room:', roomError);
          warnings.push(`Failed to create room ${roomData.title}: ${roomError.message}`);
        }
      }

      res.json({
        success: true,
        message: `Successfully created ${createdRooms.length} room(s)`,
        data: {
          created: createdRooms.length,
          total: roomCount,
          warnings: warnings.length > 0 ? warnings : undefined,
          rooms: createdRooms.map(room => ({
            id: room.id,
            roomNumber: room.title
          }))
        }
      });

    } catch (dbError) {
      console.error('Database error in bulk room creation:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while creating rooms',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Bulk room creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating rooms'
    });
  }
});

// @desc    Update room details
// @route   PUT /api/internal/rooms/:id
// @access  Private
router.put('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;
    const { title, description, dailyRate, monthlyRate, maxGuests, sharingType, currentStatus } = req.body;

    try {
      // Check if room exists and user has permission to edit it
      const [existingRoom] = await sequelize.query(`
        SELECT r.*, p.owner_id 
        FROM rooms r 
        LEFT JOIN properties p ON r.owner_id = p.owner_id 
        WHERE r.id = $1
      `, { bind: [id] });

      if (!existingRoom || existingRoom.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const room = existingRoom[0];

      // For property owners, ensure they own the room
      if (user.role === 'owner' && room.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit your own rooms.'
        });
      }

      // Update room using raw SQL to avoid enum conflicts
      const [result] = await sequelize.query(`
        UPDATE rooms 
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          max_guests = COALESCE($4, max_guests),
          property_details = COALESCE($5, property_details),
          updated_at = NOW()
        WHERE id = $6
        RETURNING id, title, description, price, max_guests, property_details
      `, {
        bind: [
          title || null,
          description || null,
          dailyRate || null, // Store daily rate as main price
          maxGuests || null,
          JSON.stringify({
            ...room.property_details,
            sharingType: sharingType || room.property_details?.sharingType,
            currentStatus: currentStatus || room.property_details?.currentStatus,
            dailyRate: dailyRate || room.property_details?.dailyRate,
            monthlyRate: monthlyRate || room.property_details?.monthlyRate
          }),
          id
        ]
      });

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update room'
        });
      }

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: result[0]
      });

    } catch (dbError) {
      console.error('Database error in room update:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while updating room',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room'
    });
  }
});

// @desc    Delete room
// @route   DELETE /api/internal/rooms/:id
// @access  Private
router.delete('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;

    try {
      // Check if room exists and user has permission to delete it
      const [existingRoom] = await sequelize.query(`
        SELECT r.*, p.owner_id 
        FROM rooms r 
        LEFT JOIN properties p ON r.owner_id = p.owner_id 
        WHERE r.id = $1
      `, { bind: [id] });

      if (!existingRoom || existingRoom.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const room = existingRoom[0];

      // For property owners, ensure they own the room
      if (user.role === 'owner' && room.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own rooms.'
        });
      }

      // Check if room has active bookings (in a real system)
      // For now, we'll allow deletion but could add booking checks here

      // Delete room
      const [result] = await sequelize.query(`
        DELETE FROM rooms WHERE id = $1 RETURNING id, title
      `, { bind: [id] });

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete room'
        });
      }

      res.json({
        success: true,
        message: 'Room deleted successfully',
        data: result[0]
      });

    } catch (dbError) {
      console.error('Database error in room deletion:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while deleting room',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room'
    });
  }
});

// @desc    Edit/Update a room
// @route   PUT /api/internal/rooms/:id
// @access  Private
router.put('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { id: roomId } = req.params;
    const { 
      title, 
      description, 
      dailyRate, 
      monthlyRate, 
      maxGuests, 
      sharingType, 
      currentStatus 
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Check if room exists
    const [existingRoom] = await sequelize.query(
      'SELECT id, property_id FROM rooms WHERE id = $1',
      { bind: [roomId] }
    );

    if (!existingRoom || existingRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = existingRoom[0];

    // For property owners, check if they own the property
    if (user.role === 'owner') {
      const [propertyCheck] = await sequelize.query(
        'SELECT owner_id FROM properties WHERE id = $1',
        { bind: [room.property_id] }
      );

      if (!propertyCheck || propertyCheck.length === 0 || propertyCheck[0].owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit rooms in your own properties.'
        });
      }
    }

    // Determine bed count based on sharing type
    const bedCounts = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[sharingType] || maxGuests || 1;

    // Update room using raw SQL to match database schema
    const updateQuery = `
      UPDATE rooms 
      SET 
        title = $1,
        description = $2,
        sharing_type = $3,
        total_beds = $4,
        price = $5,
        current_status = $6,
        property_details = $7,
        updated_at = $8
      WHERE id = $9
      RETURNING id, title, description, sharing_type, total_beds, price, current_status, property_details
    `;

    const propertyDetails = JSON.stringify({
      dailyRate: dailyRate || 0,
      monthlyRate: monthlyRate || 0,
      floorNumber: Math.floor(parseInt(title) / 100) || 1
    });

    const [updatedRoom] = await sequelize.query(updateQuery, {
      bind: [
        title,
        description,
        sharingType,
        totalBeds,
        dailyRate || 0,
        currentStatus || 'vacant_clean',
        propertyDetails,
        new Date(),
        roomId
      ]
    });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: updatedRoom[0]
    });

  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Delete a room
// @route   DELETE /api/internal/rooms/:id
// @access  Private
router.delete('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { id: roomId } = req.params;

    // Check if room exists
    const [existingRoom] = await sequelize.query(
      'SELECT id, property_id FROM rooms WHERE id = $1',
      { bind: [roomId] }
    );

    if (!existingRoom || existingRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = existingRoom[0];

    // For property owners, check if they own the property
    if (user.role === 'owner') {
      const [propertyCheck] = await sequelize.query(
        'SELECT owner_id FROM properties WHERE id = $1',
        { bind: [room.property_id] }
      );

      if (!propertyCheck || propertyCheck.length === 0 || propertyCheck[0].owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete rooms in your own properties.'
        });
      }
    }

    // Check if room has any active bookings
    const [activeBookings] = await sequelize.query(
      'SELECT COUNT(*) as count FROM bookings WHERE room_id = $1 AND status IN (\'confirmed\', \'checked_in\')',
      { bind: [roomId] }
    );

    if (activeBookings && activeBookings.length > 0 && activeBookings[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with active bookings. Please cancel or complete all bookings first.'
      });
    }

    // Delete the room
    await sequelize.query('DELETE FROM rooms WHERE id = $1', { bind: [roomId] });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get audit logs
// @route   GET /api/internal/audit
// @access  Private
router.get('/internal/audit', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { isCritical, limit = 10, page = 1 } = req.query;

    // Return empty audit logs - audit logging not yet implemented
    res.json({
      success: true,
      data: {
        logs: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0
      },
      message: 'Audit logging not yet implemented'
    });

  } catch (error) {
    console.error('Error in audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Analytics Endpoints for Platform Management

// @desc    Get platform analytics
// @route   GET /api/internal/analytics/platform
// @access  Private
router.get('/internal/analytics/platform', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    try {
      // Get platform-wide metrics
      const [propertiesCount] = await sequelize.query('SELECT COUNT(*) as count FROM properties');
      const [usersCount] = await sequelize.query('SELECT COUNT(*) as count FROM users WHERE role = \'owner\'');
      const [roomsCount] = await sequelize.query('SELECT COUNT(*) as count FROM rooms');
      const [occupiedRoomsCount] = await sequelize.query('SELECT COUNT(*) as count FROM rooms WHERE current_status = \'occupied\'');
      const [bookingsCount] = await sequelize.query('SELECT COUNT(*) as count FROM bookings');
      const [revenueResult] = await sequelize.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status IN (\'confirmed\', \'completed\')');

      const totalProperties = parseInt(propertiesCount[0]?.count) || 0;
      const totalUsers = parseInt(usersCount[0]?.count) || 0;
      const totalRooms = parseInt(roomsCount[0]?.count) || 0;
      const occupiedRooms = parseInt(occupiedRoomsCount[0]?.count) || 0;
      const vacantRooms = totalRooms - occupiedRooms;
      const averageOccupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
      const totalBookings = parseInt(bookingsCount[0]?.count) || 0;
      const totalRevenue = parseFloat(revenueResult[0]?.total) || 0;

      // Get booking trends for last 7 days
      const [bookingTrends] = await sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as bookings,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      // Get regional breakdown from properties (location is JSONB with city field)
      const [regionalBreakdown] = await sequelize.query(`
        SELECT 
          COALESCE(location->>'city', 'Unknown') as region,
          COUNT(*) as properties
        FROM properties
        GROUP BY location->>'city'
        ORDER BY properties DESC
        LIMIT 5
      `);

      // Get property type breakdown
      const [propertyTypeBreakdown] = await sequelize.query(`
        SELECT 
          COALESCE(type::text, 'Unknown') as "propertyType",
          COUNT(*) as count
        FROM properties
        GROUP BY type
        ORDER BY count DESC
      `);

      const platformAnalytics = {
        metrics: {
          totalProperties,
          totalBookings,
          totalRevenue,
          averageOccupancy: Math.round(averageOccupancy * 100) / 100,
          activePropertyOwners: totalUsers,
          totalRooms,
          occupiedRooms,
          vacantRooms
        },
        bookingTrends: bookingTrends.map(t => ({
          date: t.date,
          bookings: parseInt(t.bookings) || 0,
          revenue: parseFloat(t.revenue) || 0,
          occupancy: averageOccupancy
        })),
        revenueTrends: bookingTrends.map(t => ({
          date: t.date,
          revenue: parseFloat(t.revenue) || 0,
          bookings: parseInt(t.bookings) || 0
        })),
        regionalBreakdown: regionalBreakdown.map(r => ({
          region: r.region,
          properties: parseInt(r.properties) || 0,
          bookings: 0,
          revenue: 0,
          occupancy: averageOccupancy
        })),
        propertyTypeBreakdown: propertyTypeBreakdown.map(p => ({
          propertyType: p.propertyType,
          count: parseInt(p.count) || 0,
          bookings: 0,
          revenue: 0,
          occupancy: averageOccupancy
        }))
      };

      res.json({
        success: true,
        data: platformAnalytics
      });

    } catch (dbError) {
      console.error('Database error in platform analytics:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching platform analytics from database'
      });
    }

  } catch (error) {
    console.error('Error in platform analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get property health metrics
// @route   GET /api/internal/analytics/property-health
// @access  Private
router.get('/internal/analytics/property-health', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    try {
      // Get property health data from database
      const [properties] = await sequelize.query(`
        SELECT 
          p.id as "propertyId",
          p.title as "propertyName",
          u.name as "ownerName",
          u.email as "ownerEmail",
          COUNT(DISTINCT r.id) as "totalRooms",
          COUNT(DISTINCT CASE WHEN r.current_status = 'occupied' THEN r.id END) as "occupiedRooms"
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN rooms r ON r.property_details->>'propertyId' = p.id::text
        GROUP BY p.id, p.title, u.name, u.email
        ORDER BY p.created_at DESC
        LIMIT 50
      `);

      const healthData = properties.map(p => {
        const totalRooms = parseInt(p.totalRooms) || 0;
        const occupiedRooms = parseInt(p.occupiedRooms) || 0;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        const healthScore = Math.min(100, occupancyRate + 20); // Simple health score based on occupancy

        return {
          propertyId: p.propertyId,
          propertyName: p.propertyName || 'Unnamed Property',
          ownerName: p.ownerName || 'Unknown',
          ownerEmail: p.ownerEmail || '',
          occupancyRate,
          totalRooms,
          occupiedRooms,
          healthScore,
          issues: occupancyRate < 50 ? ['Low occupancy'] : []
        };
      });

      res.json({
        success: true,
        data: healthData,
        total: healthData.length
      });
    } catch (dbError) {
      console.error('Database error in property health:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property health data from database'
      });
    }

  } catch (error) {
    console.error('Error in property health analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Change property owner (transfer ownership)
// @route   PUT /api/internal/platform/properties/:id/owner
// @access  Private
router.put('/internal/platform/properties/:id/owner', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id: propertyId } = req.params;
    const { newOwnerId, reason } = req.body;

    // Validate required fields
    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'New owner ID is required'
      });
    }

    try {
      // Check if property exists
      const [propertyCheck] = await sequelize.query(
        'SELECT id, name, owner_id FROM properties WHERE id = $1',
        { bind: [propertyId] }
      );

      if (!propertyCheck || propertyCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = propertyCheck[0];

      // Check if new owner exists and has owner role
      const newOwner = await User.findOne({
        where: {
          id: newOwnerId,
          role: 'owner',
          is_verified: true
        }
      });

      if (!newOwner) {
        return res.status(400).json({
          success: false,
          message: 'New owner not found or not verified'
        });
      }

      // Check if it's actually a different owner
      if (property.owner_id === newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'Property is already owned by this user'
        });
      }

      // Update property ownership
      await sequelize.query(
        'UPDATE properties SET owner_id = $1, updated_at = $2 WHERE id = $3',
        { bind: [newOwnerId, new Date(), propertyId] }
      );

      // Log the ownership change (you could create an audit log table for this)
      console.log(`Property ownership changed: ${propertyId} from ${property.owner_id} to ${newOwnerId} by ${user.id}. Reason: ${reason || 'No reason provided'}`);

      res.json({
        success: true,
        message: 'Property ownership transferred successfully',
        data: {
          propertyId,
          previousOwnerId: property.owner_id,
          newOwnerId,
          changedBy: user.id,
          reason: reason || null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (dbError) {
      console.error('Database error in change property owner:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error occurred',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }

  } catch (error) {
    console.error('Error in change property owner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get actual property owners (users with owner role) for change ownership
// @route   GET /api/internal/superuser/users/owners
// @access  Private
router.get('/internal/superuser/users/owners', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    try {
      // Get actual users with owner role
      const owners = await User.findAll({
        where: {
          role: 'owner',
          is_verified: true
        },
        attributes: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']]
      });

      // Transform to match expected format
      const propertyOwners = owners.map(owner => ({
        id: owner.id,
        name: owner.name || 'Unknown Owner',
        email: owner.email,
        phone: owner.phone,
        isVerified: true,
        createdAt: owner.created_at,
        updatedAt: owner.updated_at,
        propertiesCount: 0 // Could be calculated if needed
      }));

      res.json({
        success: true,
        data: {
          propertyOwners
        },
        count: propertyOwners.length,
        total: propertyOwners.length
      });

    } catch (dbError) {
      console.error('Database error in users/owners endpoint:', dbError);
      
      // Return empty array if database fails
      res.json({
        success: true,
        data: {
          propertyOwners: []
        },
        count: 0,
        total: 0
      });
    }

  } catch (error) {
    console.error('Error in users/owners endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// PAYMENT ROUTES
// ============================================

// @desc    Get all payments with filters
// @route   GET /api/internal/payments
// @access  Private
router.get('/internal/payments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, paymentType, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = {};
      if (status) whereClause.status = status;
      if (paymentType) whereClause.paymentType = paymentType;
      if (startDate) whereClause.paymentDate = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.paymentDate = whereClause.paymentDate || {};
        whereClause.paymentDate[Op.lte] = new Date(endDate);
      }

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'], required: false }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: payments,
        count: payments.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching payments:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

// @desc    Get overdue payments
// @route   GET /api/internal/payments/overdue
// @access  Private
router.get('/internal/payments/overdue', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { propertyId } = req.query;

    try {
      const whereClause = {
        status: 'overdue',
        dueDate: { [Op.lt]: new Date() }
      };
      if (propertyId) whereClause.propertyId = propertyId;

      const overduePayments = await Payment.findAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
        ],
        order: [['dueDate', 'ASC']]
      });

      res.json({
        success: true,
        data: overduePayments,
        count: overduePayments.length
      });
    } catch (dbError) {
      console.error('Database error fetching overdue payments:', dbError);
      res.json({ success: true, data: [], count: 0 });
    }
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching overdue payments' });
  }
});

// @desc    Record a new payment
// @route   POST /api/internal/payments
// @access  Private
router.post('/internal/payments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId, amount, paymentMethod, transactionReference, paymentType, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Map frontend payment types to database enum values
    const validPaymentTypes = ['booking', 'monthly_rent', 'security_deposit'];
    const mappedPaymentType = paymentType === 'rent' ? 'monthly_rent' : 
                              validPaymentTypes.includes(paymentType) ? paymentType : 'booking';

    try {
      const payment = await Payment.create({
        bookingId: bookingId || null,
        amount,
        paymentMethod: paymentMethod || 'cash',
        transactionReference,
        paymentType: mappedPaymentType,
        status: 'completed',
        paymentDate: new Date(),
        recordedBy: user.id,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: payment
      });
    } catch (dbError) {
      console.error('Database error recording payment:', dbError);
      res.status(500).json({ success: false, message: 'Error recording payment' });
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Error recording payment' });
  }
});

// ============================================
// STAFF ROUTES
// ============================================

// @desc    Get all staff users
// @route   GET /api/internal/staff
// @access  Private
router.get('/internal/staff', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { propertyId, role, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = { isActive: true };
      if (propertyId) whereClause.propertyId = propertyId;
      if (role) whereClause.role = role;

      const { count, rows: staffMembers } = await Staff.findAndCountAll({
        where: whereClause,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: staffMembers,
        count: staffMembers.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching staff:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ success: false, message: 'Error fetching staff' });
  }
});

// @desc    Create a new staff user
// @route   POST /api/internal/staff
// @access  Private
router.post('/internal/staff', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { propertyId, role, permissions, salary, contactInfo } = req.body;

    try {
      const staffMember = await Staff.create({
        propertyId: propertyId || null,
        role: role || 'staff',
        permissions: permissions || {},
        salary: salary || null,
        contactInfo: contactInfo || {},
        isActive: true,
        joinedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: staffMember
      });
    } catch (dbError) {
      console.error('Database error creating staff:', dbError);
      res.status(500).json({ success: false, message: 'Error creating staff member' });
    }
  } catch (error) {
    console.error('Error creating staff user:', error);
    res.status(500).json({ success: false, message: 'Error creating staff user' });
  }
});

// ============================================
// DEPOSIT ROUTES
// ============================================

// @desc    Get all security deposits
// @route   GET /api/internal/deposits
// @access  Private
router.get('/internal/deposits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = {};
      if (status) whereClause.status = status;

      const { count, rows: deposits } = await Deposit.findAndCountAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'], required: false }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: deposits,
        count: deposits.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching deposits:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ success: false, message: 'Error fetching deposits' });
  }
});

// @desc    Record a security deposit
// @route   POST /api/internal/deposits
// @access  Private
router.post('/internal/deposits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId, amount, paymentMethod, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    try {
      const deposit = await Deposit.create({
        bookingId: bookingId || null,
        amount,
        paymentMethod: paymentMethod || 'cash',
        status: 'held',
        collectedDate: new Date(),
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Security deposit recorded successfully',
        data: deposit
      });
    } catch (dbError) {
      console.error('Database error recording deposit:', dbError);
      res.status(500).json({ success: false, message: 'Error recording deposit' });
    }
  } catch (error) {
    console.error('Error recording deposit:', error);
    res.status(500).json({ success: false, message: 'Error recording deposit' });
  }
});

// @desc    Get deposit by booking ID
// @route   GET /api/internal/deposits/:bookingId
// @access  Private
router.get('/internal/deposits/:bookingId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId } = req.params;

    try {
      const deposit = await Deposit.findOne({
        where: { bookingId },
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
        ]
      });

      res.json({
        success: true,
        data: deposit
      });
    } catch (dbError) {
      console.error('Database error fetching deposit:', dbError);
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Error fetching deposit:', error);
    res.status(500).json({ success: false, message: 'Error fetching deposit' });
  }
});

// ============================================
// BULK UPLOAD ENDPOINTS
// ============================================

// @desc    Bulk upload leads/properties from CSV/JSON
// @route   POST /api/internal/leads/bulk
// @access  Private (admin, superuser)
router.post('/internal/leads/bulk', async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Only admin and superuser can bulk upload
    if (!['admin', 'superuser'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for bulk upload' });
    }

    const { leads, skipDuplicates = true } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'leads array is required and must not be empty'
      });
    }

    if (leads.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 500 leads can be uploaded at once'
      });
    }

    const results = {
      total: leads.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdLeads: []
    };

    // Valid property types
    const validPropertyTypes = ['hotel', 'pg', 'homestay', 'apartment'];

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];
      const rowIndex = i + 1;

      try {
        // Validate required fields
        const requiredFields = ['propertyOwnerName', 'email', 'phone', 'propertyType', 'address', 'city', 'state'];
        const missingFields = requiredFields.filter(field => !leadData[field]);
        
        if (missingFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email || 'N/A',
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(leadData.email)) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: 'Invalid email format'
          });
          continue;
        }

        // Validate phone format
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(leadData.phone) || leadData.phone.replace(/\D/g, '').length < 10) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: 'Invalid phone number (must be at least 10 digits)'
          });
          continue;
        }

        // Validate property type
        if (!validPropertyTypes.includes(leadData.propertyType.toLowerCase())) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: `Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`
          });
          continue;
        }

        // Check for duplicate email
        const existingLead = await Lead.findOne({ where: { email: leadData.email.toLowerCase() } });
        if (existingLead) {
          if (skipDuplicates) {
            results.skipped++;
            continue;
          } else {
            results.failed++;
            results.errors.push({
              row: rowIndex,
              email: leadData.email,
              error: 'Lead with this email already exists'
            });
            continue;
          }
        }

        // Assign territory
        const territory = await assignTerritory(leadData.city, leadData.state);

        // Create the lead
        const lead = await Lead.create({
          propertyOwnerName: leadData.propertyOwnerName.trim(),
          email: leadData.email.toLowerCase().trim(),
          phone: leadData.phone.trim(),
          businessName: leadData.businessName?.trim() || null,
          propertyType: leadData.propertyType.toLowerCase(),
          estimatedRooms: parseInt(leadData.estimatedRooms) || 1,
          address: leadData.address.trim(),
          city: leadData.city.trim(),
          state: leadData.state.trim(),
          country: leadData.country?.trim() || 'India',
          pincode: leadData.pincode?.trim() || null,
          landmark: leadData.landmark?.trim() || null,
          status: 'pending',
          source: leadData.source || 'bulk_upload',
          territoryId: territory?.id || null,
          frontendSubmissionId: `bulk_${Date.now()}_${i}`,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          amenities: leadData.amenities || [],
          notes: leadData.notes || null,
          priority: leadData.priority || 'medium',
          propertyDetails: {
            description: leadData.description || null,
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString()
          }
        });

        // Create property owner account
        try {
          await createPropertyOwnerAccount(leadData, lead.id);
        } catch (ownerError) {
          console.error(`Failed to create property owner for lead ${lead.id}:`, ownerError);
        }

        results.successful++;
        results.createdLeads.push({
          id: lead.id,
          email: lead.email,
          propertyOwnerName: lead.propertyOwnerName,
          city: lead.city
        });

      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        results.failed++;
        results.errors.push({
          row: rowIndex,
          email: leadData.email || 'N/A',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload completed: ${results.successful} created, ${results.skipped} skipped, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk upload failed',
      error: error.message
    });
  }
});

// @desc    Get bulk upload template
// @route   GET /api/internal/leads/bulk/template
// @access  Private
router.get('/internal/leads/bulk/template', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const template = {
      description: 'Bulk upload template for property leads',
      requiredFields: [
        { field: 'propertyOwnerName', type: 'string', description: 'Full name of property owner (2-100 chars)' },
        { field: 'email', type: 'string', description: 'Valid email address' },
        { field: 'phone', type: 'string', description: 'Phone number (10-15 digits)' },
        { field: 'propertyType', type: 'string', description: 'One of: hotel, pg, homestay, apartment' },
        { field: 'address', type: 'string', description: 'Complete address (10-500 chars)' },
        { field: 'city', type: 'string', description: 'City name (2-100 chars)' },
        { field: 'state', type: 'string', description: 'State name (2-100 chars)' }
      ],
      optionalFields: [
        { field: 'businessName', type: 'string', description: 'Business/property name' },
        { field: 'estimatedRooms', type: 'number', description: 'Number of rooms (1-1000)' },
        { field: 'country', type: 'string', description: 'Country (default: India)' },
        { field: 'pincode', type: 'string', description: 'Postal code (5-10 digits)' },
        { field: 'landmark', type: 'string', description: 'Nearby landmark' },
        { field: 'amenities', type: 'array', description: 'List of amenities' },
        { field: 'notes', type: 'string', description: 'Additional notes' },
        { field: 'priority', type: 'string', description: 'One of: low, medium, high, urgent' },
        { field: 'source', type: 'string', description: 'Lead source (default: bulk_upload)' },
        { field: 'description', type: 'string', description: 'Property description' }
      ],
      sampleData: [
        {
          propertyOwnerName: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          propertyType: 'hotel',
          estimatedRooms: 20,
          address: '123 Main Street, Downtown Area',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '560001',
          businessName: 'Sunrise Hotel',
          amenities: ['wifi', 'parking', 'ac'],
          notes: 'Premium location near IT park'
        },
        {
          propertyOwnerName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '8765432109',
          propertyType: 'pg',
          estimatedRooms: 15,
          address: '456 College Road, Student Area',
          city: 'Hyderabad',
          state: 'Telangana',
          businessName: 'Comfort PG',
          amenities: ['wifi', 'meals', 'laundry']
        }
      ]
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Error fetching template' });
  }
});

// @desc    Validate bulk upload data without creating
// @route   POST /api/internal/leads/bulk/validate
// @access  Private
router.post('/internal/leads/bulk/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !['admin', 'superuser'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ success: false, message: 'leads array is required' });
    }

    const validPropertyTypes = ['hotel', 'pg', 'homestay', 'apartment'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\-\s()]+$/;

    const validation = {
      total: leads.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      errors: []
    };

    // Get existing emails
    const existingEmails = new Set();
    const emails = leads.map(l => l.email?.toLowerCase()).filter(Boolean);
    if (emails.length > 0) {
      const existing = await Lead.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['email']
      });
      existing.forEach(l => existingEmails.add(l.email.toLowerCase()));
    }

    const seenEmails = new Set();

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowErrors = [];

      // Check required fields
      if (!lead.propertyOwnerName || lead.propertyOwnerName.length < 2) {
        rowErrors.push('propertyOwnerName is required (min 2 chars)');
      }
      if (!lead.email || !emailRegex.test(lead.email)) {
        rowErrors.push('Valid email is required');
      }
      if (!lead.phone || !phoneRegex.test(lead.phone)) {
        rowErrors.push('Valid phone is required');
      }
      if (!lead.propertyType || !validPropertyTypes.includes(lead.propertyType.toLowerCase())) {
        rowErrors.push(`propertyType must be one of: ${validPropertyTypes.join(', ')}`);
      }
      if (!lead.address || lead.address.length < 10) {
        rowErrors.push('address is required (min 10 chars)');
      }
      if (!lead.city || lead.city.length < 2) {
        rowErrors.push('city is required');
      }
      if (!lead.state || lead.state.length < 2) {
        rowErrors.push('state is required');
      }

      // Check for duplicates
      const email = lead.email?.toLowerCase();
      if (email) {
        if (existingEmails.has(email)) {
          rowErrors.push('Email already exists in database');
          validation.duplicates++;
        } else if (seenEmails.has(email)) {
          rowErrors.push('Duplicate email in upload data');
          validation.duplicates++;
        }
        seenEmails.add(email);
      }

      if (rowErrors.length > 0) {
        validation.invalid++;
        validation.errors.push({
          row: i + 1,
          email: lead.email || 'N/A',
          errors: rowErrors
        });
      } else {
        validation.valid++;
      }
    }

    res.json({
      success: true,
      message: `Validation complete: ${validation.valid} valid, ${validation.invalid} invalid`,
      data: validation
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, message: 'Validation failed', error: error.message });
  }
});

// ============================================
// INTERNAL USERS ROUTES
// ============================================

// @desc    Get internal users with filtering
// @route   GET /api/internal/users
// @access  Private
router.get('/internal/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { role, isActive, territoryId, search, page = 1, limit = 20 } = req.query;

    // Build where clause
    const whereClause = {};
    
    // Filter by internal roles only
    const internalRoles = ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser', 'admin', 'category_owner'];
    whereClause.role = { [Op.in]: internalRoles };

    if (role) {
      whereClause.role = role;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    // Map users to internal user format
    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      internalRole: user.role,
      internalPermissions: getPermissionsForRole(user.role),
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: mappedUsers
    });

  } catch (error) {
    console.error('Get internal users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching internal users' });
  }
});

// Helper function to get permissions based on role
function getPermissionsForRole(role) {
  const permissions = {
    canOnboardProperties: false,
    canApproveOnboardings: false,
    canManageAgents: false,
    canAccessAllProperties: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canManageCommissions: false,
    canManageTerritories: false,
    canManageTickets: false,
    canBroadcastAnnouncements: false
  };

  switch (role) {
    case 'superuser':
    case 'admin':
      return {
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canManageSystemSettings: true,
        canViewAuditLogs: true,
        canManageCommissions: true,
        canManageTerritories: true,
        canManageTickets: true,
        canBroadcastAnnouncements: true
      };
    case 'platform_admin':
      return {
        ...permissions,
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canViewAuditLogs: true,
        canManageTickets: true
      };
    case 'operations_manager':
      return {
        ...permissions,
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canViewAuditLogs: true
      };
    case 'regional_manager':
      return {
        ...permissions,
        canOnboardProperties: true,
        canManageAgents: true
      };
    case 'agent':
      return {
        ...permissions,
        canOnboardProperties: true
      };
    default:
      return permissions;
  }
}

// @desc    Get internal user by ID
// @route   GET /api/internal/users/:id
// @access  Private
router.get('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        internalRole: user.role,
        internalPermissions: getPermissionsForRole(user.role),
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get internal user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// @desc    Create internal user
// @route   POST /api/internal/users
// @access  Private
router.post('/internal/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser', 'platform_admin'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create users' });
    }

    const { name, email, phone, internalRole } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      role: internalRole || 'agent',
      password: tempPassword, // Will be hashed by model hook
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          internalRole: user.role,
          internalPermissions: getPermissionsForRole(user.role),
          isActive: true,
          createdAt: user.createdAt
        },
        tempPassword
      }
    });

  } catch (error) {
    console.error('Create internal user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// @desc    Update internal user
// @route   PUT /api/internal/users/:id
// @access  Private
router.put('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser', 'platform_admin'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update users' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, email, phone, internalRole, isActive } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (internalRole) user.role = internalRole;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        internalRole: user.role,
        internalPermissions: getPermissionsForRole(user.role),
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update internal user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// @desc    Deactivate internal user
// @route   DELETE /api/internal/users/:id
// @access  Private
router.delete('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to deactivate users' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - just deactivate
    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Deactivate internal user error:', error);
    res.status(500).json({ success: false, message: 'Error deactivating user' });
  }
});

// @desc    Get user performance metrics
// @route   GET /api/internal/users/:id/performance
// @access  Private
router.get('/internal/users/:id/performance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    jwt.verify(token, process.env.JWT_SECRET);

    // Return mock performance data for now
    res.json({
      success: true,
      data: {
        propertiesOnboarded: 0,
        conversionRate: 0,
        averageTimeToClose: 0,
        commissionEarned: 0,
        leadsInPipeline: 0
      }
    });

  } catch (error) {
    console.error('Get user performance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching performance metrics' });
  }
});

module.exports = router;

