/**
 * Check-In API Routes
 * 
 * Handles check-in processing and pending check-ins listing
 * Requirements: 3.1, 3.2, 3.8
 */

const express = require('express');
const { Op } = require('sequelize');
const { body, query } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const GuestProfile = require('../models/GuestProfile');
const GuestDocument = require('../models/GuestDocument');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const checkInService = require('../services/checkInService');
const guestService = require('../services/guestService');
const documentService = require('../services/documentService');
const notificationService = require('../services/notificationService');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Max 2 files (front and back)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  }
});

// Validation for check-in
const validateCheckIn = [
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('guestData.name').optional().trim().isLength({ min: 2 }).withMessage('Guest name must be at least 2 characters'),
  body('guestData.phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('guestData.email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('guestData.idType').optional().isIn(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id']).withMessage('Invalid ID type'),
  body('guestData.idNumber').optional().isString().withMessage('ID number must be a string'),
  body('guestData.address.street').optional().isString().withMessage('Street must be a string'),
  body('guestData.address.city').optional().isString().withMessage('City must be a string'),
  body('guestData.address.state').optional().isString().withMessage('State must be a string'),
  body('guestData.address.pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pincode')
];

// Validation for pending check-ins query
const validatePendingCheckInsQuery = [
  query('propertyId').isUUID().withMessage('Valid property ID is required'),
  query('date').optional().isISO8601().withMessage('Valid date is required')
];

/**
 * @desc    Process check-in for a booking
 * @route   POST /api/bookings/:id/check-in
 * @access  Private (Staff/Admin)
 * Requirements: 3.1, 3.2, 3.8, 11.9, 11.10
 */
router.post(
  '/:id/check-in',
  protect,
  validateObjectId('id'),
  upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
  ]),
  validateCheckIn,
  handleValidationErrors,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { notes, guestData } = req.body;
      const files = req.files;

      // Parse guestData if it's a string (from multipart form)
      let parsedGuestData = guestData;
      if (typeof guestData === 'string') {
        try {
          parsedGuestData = JSON.parse(guestData);
        } catch (e) {
          parsedGuestData = {};
        }
      }

      // Get client IP for audit
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Process check-in
      const result = await checkInService.processCheckIn(bookingId, {
        performedBy: req.user.id,
        notes,
        guestData: parsedGuestData,
        ipAddress
      });

      // Handle ID document uploads if provided
      if (files && result.guestProfile) {
        const uploadPromises = [];

        if (files.idFront && files.idFront[0]) {
          uploadPromises.push(
            documentService.uploadDocument({
              guestProfileId: result.guestProfile.id,
              bookingId,
              documentType: 'id_front',
              file: files.idFront[0],
              uploadedBy: req.user.id
            })
          );
        }

        if (files.idBack && files.idBack[0]) {
          uploadPromises.push(
            documentService.uploadDocument({
              guestProfileId: result.guestProfile.id,
              bookingId,
              documentType: 'id_back',
              file: files.idBack[0],
              uploadedBy: req.user.id
            })
          );
        }

        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises);
        }
      }

      res.json({
        success: true,
        message: 'Check-in completed successfully',
        data: {
          booking: result.booking,
          room: {
            id: result.room.id,
            title: result.room.title,
            roomNumber: result.room.roomNumber,
            currentStatus: result.room.currentStatus
          },
          guestProfile: result.guestProfile,
          // Payment information for online bookings - Requirements: 11.9, 11.10
          paymentRequired: result.paymentRequired,
          paymentInfo: result.paymentInfo
        }
      });

      // Send check-in notification to property owner - Requirement 2.2
      try {
        // Get full booking with associations for notification
        const fullBooking = await Booking.findByPk(bookingId, {
          include: [
            { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
            { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
            { model: Property, as: 'property', attributes: ['id', 'name'] }
          ]
        });
        
        if (fullBooking) {
          await notificationService.sendCheckInNotification(fullBooking);
        }
      } catch (notificationError) {
        console.error('Failed to send check-in notification:', notificationError);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error processing check-in'
      });
    }
  }
);

/**
 * @desc    Get pending check-ins for a property
 * @route   GET /api/check-ins/pending
 * @access  Private (Staff/Admin)
 * Requirements: 3.1
 */
router.get(
  '/pending',
  protect,
  validatePendingCheckInsQuery,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId, date } = req.query;
      const checkInDate = date ? new Date(date) : new Date();

      const pendingCheckIns = await checkInService.getPendingCheckIns(propertyId, {
        date: checkInDate
      });

      res.json({
        success: true,
        count: pendingCheckIns.length,
        date: checkInDate.toISOString().split('T')[0],
        data: pendingCheckIns
      });
    } catch (error) {
      console.error('Get pending check-ins error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching pending check-ins',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Check if a booking can be checked in
 * @route   GET /api/bookings/:id/check-in/eligibility
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/check-in/eligibility',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const eligibility = await checkInService.validateCheckInEligibility(req.params.id);

      res.json({
        success: true,
        data: {
          eligible: eligibility.eligible,
          reason: eligibility.reason,
          booking: eligibility.booking ? {
            id: eligibility.booking.id,
            bookingNumber: eligibility.booking.bookingNumber,
            status: eligibility.booking.status,
            checkIn: eligibility.booking.checkIn,
            checkOut: eligibility.booking.checkOut
          } : null,
          room: eligibility.room ? {
            id: eligibility.room.id,
            title: eligibility.room.title,
            roomNumber: eligibility.room.roomNumber,
            currentStatus: eligibility.room.currentStatus
          } : null
        }
      });
    } catch (error) {
      console.error('Check eligibility error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking eligibility',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Search for booking by confirmation number or guest name
 * @route   GET /api/check-ins/search
 * @access  Private (Staff/Admin)
 * Requirements: 3.1
 */
router.get(
  '/search',
  protect,
  [
    query('propertyId').isUUID().withMessage('Valid property ID is required'),
    query('query').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId, query: searchQuery } = req.query;

      // Search by booking number or guest name/phone
      const whereClause = {
        propertyId,
        status: 'confirmed',
        [Op.or]: [
          { bookingNumber: { [Op.iLike]: `%${searchQuery}%` } },
          { 'contactInfo.name': { [Op.iLike]: `%${searchQuery}%` } },
          { 'contactInfo.phone': { [Op.like]: `%${searchQuery}%` } }
        ]
      };

      const bookings = await Booking.findAll({
        where: whereClause,
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'currentStatus']
          },
          {
            model: GuestProfile,
            as: 'guestProfile',
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['checkIn', 'ASC']],
        limit: 10
      });

      res.json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (error) {
      console.error('Search bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching bookings',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get all check-ins for today (both pending and completed)
 * @route   GET /api/check-ins/today
 * @access  Private (Staff/Admin)
 */
router.get(
  '/today',
  protect,
  [query('propertyId').isUUID().withMessage('Valid property ID is required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId } = req.query;
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Get all bookings with check-in today
      const bookings = await Booking.findAll({
        where: {
          propertyId,
          checkIn: {
            [Op.between]: [startOfDay, endOfDay]
          },
          status: {
            [Op.in]: ['confirmed', 'completed']
          }
        },
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'currentStatus']
          },
          {
            model: GuestProfile,
            as: 'guestProfile',
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['checkIn', 'ASC']]
      });

      // Separate into pending and completed
      const pending = bookings.filter(b => b.status === 'confirmed');
      const completed = bookings.filter(b => b.status === 'completed');

      res.json({
        success: true,
        date: new Date().toISOString().split('T')[0],
        summary: {
          total: bookings.length,
          pending: pending.length,
          completed: completed.length
        },
        data: {
          pending,
          completed
        }
      });
    } catch (error) {
      console.error('Get today check-ins error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching today\'s check-ins',
        error: error.message
      });
    }
  }
);

module.exports = router;
