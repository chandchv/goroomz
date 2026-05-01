/**
 * Check-Out API Routes
 * 
 * Handles check-out processing and due check-outs listing
 * Requirements: 5.1, 5.2, 5.10
 */

const express = require('express');
const { Op } = require('sequelize');
const { body, query } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const GuestProfile = require('../models/GuestProfile');
const Deposit = require('../models/Deposit');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const checkOutService = require('../services/checkOutService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Validation for check-out
const validateCheckOut = [
  body('roomInspected').isBoolean().withMessage('Room inspection confirmation is required'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('deductions').optional().isArray().withMessage('Deductions must be an array'),
  body('deductions.*.reason').optional().isString().isLength({ min: 1, max: 200 }).withMessage('Deduction reason is required'),
  body('deductions.*.amount').optional().isFloat({ min: 0 }).withMessage('Deduction amount must be a positive number'),
  body('managerApproval').optional().isBoolean().withMessage('Manager approval must be a boolean'),
  body('managerApprovalBy').optional().isUUID().withMessage('Manager approval by must be a valid UUID')
];

// Validation for due check-outs query
const validateDueCheckOutsQuery = [
  query('propertyId').isUUID().withMessage('Valid property ID is required'),
  query('date').optional().isISO8601().withMessage('Valid date is required')
];

/**
 * @desc    Process check-out for a booking
 * @route   POST /api/bookings/:id/check-out
 * @access  Private (Staff/Admin)
 * Requirements: 5.1, 5.2, 7.6
 */
router.post(
  '/:id/check-out',
  protect,
  validateObjectId('id'),
  validateCheckOut,
  handleValidationErrors,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { 
        roomInspected, 
        notes, 
        deductions = [],
        managerApproval = false,
        managerApprovalBy
      } = req.body;

      // Get client IP for audit
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Process check-out with manager approval support (Requirement 7.6)
      const result = await checkOutService.processCheckOut(bookingId, {
        performedBy: req.user.id,
        roomInspected,
        notes,
        deductions,
        ipAddress,
        managerApproval,
        managerApprovalBy: managerApprovalBy || (managerApproval ? req.user.id : null)
      });

      res.json({
        success: true,
        message: 'Check-out completed successfully',
        data: {
          booking: result.booking,
          room: {
            id: result.room.id,
            title: result.room.title,
            roomNumber: result.room.roomNumber,
            currentStatus: result.room.currentStatus
          },
          finalCharges: result.finalCharges,
          refund: result.refund
        }
      });

      // Send check-out notification to property owner - Requirement 2.3
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
          await notificationService.sendCheckOutNotification(fullBooking, {
            finalAmount: result.finalCharges?.totalAmount || fullBooking.totalAmount,
            paidAmount: result.finalCharges?.paidAmount || fullBooking.paidAmount,
            outstandingBalance: result.finalCharges?.outstandingBalance || 0,
            refundAmount: result.refund?.amount || 0,
            deductions: result.refund?.deductions || []
          });
        }
      } catch (notificationError) {
        console.error('Failed to send check-out notification:', notificationError);
      }
    } catch (error) {
      console.error('Check-out error:', error);
      
      // Check if error is about outstanding balance
      if (error.message && error.message.includes('Outstanding balance')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          requiresManagerApproval: true
        });
      }
      
      res.status(400).json({
        success: false,
        message: error.message || 'Error processing check-out'
      });
    }
  }
);

/**
 * @desc    Get due check-outs for a property
 * @route   GET /api/check-outs/due
 * @access  Private (Staff/Admin)
 * Requirements: 5.10
 */
router.get(
  '/due',
  protect,
  validateDueCheckOutsQuery,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId, date } = req.query;
      const checkOutDate = date ? new Date(date) : new Date();

      const dueCheckOuts = await checkOutService.getDueCheckOuts(propertyId, {
        date: checkOutDate
      });

      res.json({
        success: true,
        count: dueCheckOuts.length,
        date: checkOutDate.toISOString().split('T')[0],
        data: dueCheckOuts
      });
    } catch (error) {
      console.error('Get due check-outs error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching due check-outs',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Check if a booking can be checked out
 * @route   GET /api/bookings/:id/check-out/eligibility
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/check-out/eligibility',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const eligibility = await checkOutService.validateCheckOutEligibility(req.params.id);

      // Get final charges preview if eligible
      let finalCharges = null;
      if (eligibility.eligible) {
        finalCharges = await checkOutService.calculateFinalCharges(req.params.id);
      }

      // Get deposit info if exists
      let depositInfo = null;
      if (eligibility.booking) {
        const deposit = await Deposit.findOne({
          where: {
            bookingId: req.params.id,
            status: { [Op.in]: ['collected', 'held'] }
          }
        });
        if (deposit) {
          depositInfo = {
            id: deposit.id,
            amount: deposit.amount,
            status: deposit.status,
            paymentMethod: deposit.paymentMethod
          };
        }
      }

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
            checkOut: eligibility.booking.checkOut,
            actualCheckInTime: eligibility.booking.actualCheckInTime
          } : null,
          room: eligibility.room ? {
            id: eligibility.room.id,
            title: eligibility.room.title,
            roomNumber: eligibility.room.roomNumber,
            currentStatus: eligibility.room.currentStatus
          } : null,
          finalCharges,
          deposit: depositInfo
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
 * @desc    Get final charges preview for a booking
 * @route   GET /api/bookings/:id/check-out/charges
 * @access  Private (Staff/Admin)
 * Requirements: 5.3
 */
router.get(
  '/:id/check-out/charges',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const finalCharges = await checkOutService.calculateFinalCharges(req.params.id);

      // Get deposit info
      const deposit = await Deposit.findOne({
        where: {
          bookingId: req.params.id,
          status: { [Op.in]: ['collected', 'held'] }
        }
      });

      res.json({
        success: true,
        data: {
          charges: finalCharges,
          deposit: deposit ? {
            id: deposit.id,
            amount: parseFloat(deposit.amount),
            status: deposit.status,
            paymentMethod: deposit.paymentMethod
          } : null,
          potentialRefund: deposit ? parseFloat(deposit.amount) : 0
        }
      });
    } catch (error) {
      console.error('Get charges error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating charges',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Calculate deposit refund preview
 * @route   POST /api/bookings/:id/check-out/refund-preview
 * @access  Private (Staff/Admin)
 * Requirements: 4.4, 4.5
 */
router.post(
  '/:id/check-out/refund-preview',
  protect,
  validateObjectId('id'),
  [
    body('deductions').optional().isArray().withMessage('Deductions must be an array'),
    body('deductions.*.reason').optional().isString().withMessage('Deduction reason is required'),
    body('deductions.*.amount').optional().isFloat({ min: 0 }).withMessage('Deduction amount must be positive')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { deductions = [] } = req.body;

      // Get deposit
      const deposit = await Deposit.findOne({
        where: {
          bookingId: req.params.id,
          status: { [Op.in]: ['collected', 'held'] }
        }
      });

      if (!deposit) {
        return res.json({
          success: true,
          data: {
            hasDeposit: false,
            message: 'No deposit found for this booking'
          }
        });
      }

      // Calculate refund
      const refundCalculation = checkOutService.calculateRefundAmount(
        deposit.amount,
        deductions
      );

      res.json({
        success: true,
        data: {
          hasDeposit: true,
          originalDeposit: parseFloat(deposit.amount),
          ...refundCalculation
        }
      });
    } catch (error) {
      console.error('Refund preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating refund',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get outstanding balance for a booking
 * @route   GET /api/check-outs/:id/balance
 * @access  Private (Staff/Admin)
 * Requirements: 7.6
 */
router.get(
  '/:id/balance',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const balanceInfo = await checkOutService.getOutstandingBalance(req.params.id);

      res.json({
        success: true,
        data: balanceInfo
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(error.message === 'Booking not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Error fetching balance'
      });
    }
  }
);

/**
 * @desc    Search for active booking by room number or guest name
 * @route   GET /api/check-outs/search
 * @access  Private (Staff/Admin)
 * Requirements: 5.1
 */
router.get(
  '/search',
  protect,
  [
    query('propertyId').isUUID().withMessage('Valid property ID is required'),
    query('roomNumber').optional().isString().withMessage('Room number must be a string'),
    query('guestName').optional().isString().withMessage('Guest name must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId, roomNumber, guestName } = req.query;

      if (!roomNumber && !guestName) {
        return res.status(400).json({
          success: false,
          message: 'Either roomNumber or guestName is required'
        });
      }

      const booking = await checkOutService.findActiveBooking(propertyId, {
        roomNumber,
        guestName
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'No active booking found'
        });
      }

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      console.error('Search active booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching for booking',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get all check-outs for today (both due and completed)
 * @route   GET /api/check-outs/today
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

      // Get all bookings with check-out today
      const bookings = await Booking.findAll({
        where: {
          propertyId,
          checkOut: {
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
          },
          {
            association: 'deposits',
            required: false
          }
        ],
        order: [['checkOut', 'ASC']]
      });

      // Separate into due and completed
      const due = bookings.filter(b => b.status === 'confirmed');
      const completed = bookings.filter(b => b.status === 'completed');

      res.json({
        success: true,
        date: new Date().toISOString().split('T')[0],
        summary: {
          total: bookings.length,
          due: due.length,
          completed: completed.length
        },
        data: {
          due,
          completed
        }
      });
    } catch (error) {
      console.error('Get today check-outs error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching today\'s check-outs',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Generate check-out receipt
 * @route   GET /api/bookings/:id/check-out/receipt
 * @access  Private (Staff/Admin)
 * Requirements: 5.10
 */
router.get(
  '/:id/check-out/receipt',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const booking = await Booking.findByPk(req.params.id, {
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'location']
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
          },
          {
            association: 'deposits',
            required: false
          },
          {
            association: 'payments',
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

      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Receipt can only be generated for checked-out bookings'
        });
      }

      // Build receipt data
      const receipt = {
        receiptNumber: `RCP-${booking.bookingNumber}`,
        generatedAt: new Date().toISOString(),
        booking: {
          bookingNumber: booking.bookingNumber,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          actualCheckInTime: booking.actualCheckInTime,
          actualCheckOutTime: booking.actualCheckOutTime,
          duration: booking.getDuration()
        },
        guest: {
          name: booking.guestProfile?.name || booking.contactInfo?.name,
          phone: booking.guestProfile?.phone || booking.contactInfo?.phone,
          email: booking.guestProfile?.email || booking.contactInfo?.email
        },
        room: {
          title: booking.room?.title,
          roomNumber: booking.room?.roomNumber,
          location: booking.room?.location
        },
        charges: {
          roomCharges: parseFloat(booking.totalAmount),
          paidAmount: parseFloat(booking.paidAmount),
          outstandingBalance: booking.getOutstandingBalance()
        },
        deposit: booking.deposits?.[0] ? {
          originalAmount: parseFloat(booking.deposits[0].amount),
          refundAmount: parseFloat(booking.deposits[0].refundAmount || 0),
          deductions: booking.deposits[0].deductions || [],
          status: booking.deposits[0].status
        } : null,
        payments: booking.payments?.map(p => ({
          amount: parseFloat(p.amount),
          method: p.paymentMethod,
          date: p.createdAt,
          reference: p.referenceNumber
        })) || []
      };

      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Generate receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating receipt',
        error: error.message
      });
    }
  }
);

module.exports = router;
