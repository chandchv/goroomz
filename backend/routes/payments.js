/**
 * Payment Routes
 * 
 * API endpoints for payment management
 * Requirements: 7.1, 7.2, 7.3
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');

/**
 * GET /api/payments
 * Get all payments with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      bookingId,
      paymentType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {};

    if (bookingId) {
      whereClause.bookingId = bookingId;
    }

    if (paymentType) {
      whereClause.paymentType = paymentType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.paymentDate = {};
      if (startDate) {
        whereClause.paymentDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'booking',
          attributes: ['id', 'bookingNumber', 'checkIn', 'checkOut', 'totalAmount', 'paidAmount', 'paymentStatus', 'status'],
          include: [
            { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
            { association: 'user', attributes: ['id', 'name', 'email', 'phone'] }
          ]
        }
      ],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          association: 'booking',
          attributes: ['id', 'bookingNumber', 'checkIn', 'checkOut', 'totalAmount', 'paidAmount', 'paymentStatus', 'status'],
          include: [
            { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
            { association: 'user', attributes: ['id', 'name', 'email', 'phone'] }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
});

/**
 * POST /api/payments
 * Record a new payment
 * Requirements: 7.1, 7.2, 3.6
 */
router.post('/', async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
      transactionReference,
      paymentType,
      notes
    } = req.body;

    // Get user ID from auth (assuming auth middleware sets req.user)
    const recordedBy = req.user?.id || req.body.recordedBy;

    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'bookingId, amount, and paymentMethod are required'
      });
    }

    const result = await paymentService.recordPayment({
      bookingId,
      amount,
      paymentMethod,
      transactionReference,
      paymentType,
      recordedBy,
      notes
    });

    // Send payment received notification (Requirements: 3.6)
    try {
      await notificationService.sendPaymentReceivedNotification(result.payment, result.booking);
    } catch (notificationError) {
      // Log notification error but don't fail the payment recording
      console.error('Failed to send payment notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment: result.payment,
        booking: {
          id: result.booking.id,
          totalAmount: result.booking.totalAmount,
          paidAmount: result.booking.paidAmount,
          paymentStatus: result.paymentStatus
        }
      }
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
});

/**
 * GET /api/payments/booking/:bookingId/balance
 * Get outstanding balance for a booking
 * Requirements: 7.1, 7.2
 */
router.get('/booking/:bookingId/balance', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const balanceInfo = await paymentService.getOutstandingBalance(bookingId);

    res.json({
      success: true,
      data: balanceInfo
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(error.message === 'Booking not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch balance'
    });
  }
});

/**
 * GET /api/payments/booking/:bookingId
 * Get all payments for a booking
 * Requirements: 7.2
 */
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify booking exists
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const payments = await paymentService.getPaymentsByBooking(bookingId);
    const balanceInfo = await paymentService.getOutstandingBalance(bookingId);

    res.json({
      success: true,
      data: {
        payments,
        summary: balanceInfo
      }
    });
  } catch (error) {
    console.error('Error fetching booking payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking payments',
      error: error.message
    });
  }
});

/**
 * PUT /api/payments/:id
 * Update a payment
 */
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const {
      amount,
      paymentMethod,
      transactionReference,
      status,
      notes
    } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) updateData.transactionReference = transactionReference;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await payment.update(updateData);

    // If amount changed, update booking payment status
    if (amount !== undefined && payment.bookingId) {
      await paymentService.updatePaymentStatus(payment.bookingId);
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update payment'
    });
  }
});

module.exports = router;
