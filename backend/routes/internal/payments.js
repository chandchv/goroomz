const express = require('express');
const { Op } = require('sequelize');
const Payment = require('../../models/Payment');
const PaymentSchedule = require('../../models/PaymentSchedule');
const Booking = require('../../models/Booking');
const Room = require('../../models/Room');
const User = require('../../models/User');
const BedAssignment = require('../../models/BedAssignment');
const { internalAuth, checkPermission } = require('../../middleware/internalAuth');

const router = express.Router();

// @desc    Get all payments for property
// @route   GET /api/internal/payments
// @access  Private (Internal)
router.get('/', internalAuth, async (req, res) => {
  try {
    const {
      bookingId,
      paymentType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
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

    // Filter by date range
    if (startDate || endDate) {
      whereClause.paymentDate = {};
      if (startDate) {
        whereClause.paymentDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentDate[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'bookingSource'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['id', 'title', 'roomNumber', 'floorNumber']
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ]
        },
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['paymentDate', 'DESC']],
      offset,
      limit: parseInt(limit),
      distinct: true
    });

    res.json({
      success: true,
      count: payments.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
});

// @desc    Record a payment
// @route   POST /api/internal/payments
// @access  Private (Internal - requires canRecordPayments permission)
router.post('/', internalAuth, checkPermission('canRecordPayments'), async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
      transactionReference,
      paymentType,
      notes
    } = req.body;

    // Validate required fields
    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingId, amount, and paymentMethod'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Find the booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber']
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

    // Create payment
    const payment = await Payment.create({
      bookingId,
      amount,
      paymentDate: new Date(),
      paymentMethod,
      transactionReference: transactionReference || null,
      paymentType: paymentType || 'booking',
      status: 'completed',
      recordedBy: req.user.id,
      notes: notes || null
    });

    // Calculate total paid amount for this booking
    const totalPaid = await Payment.sum('amount', {
      where: {
        bookingId,
        status: 'completed'
      }
    });

    // Update booking payment status if fully paid
    if (totalPaid >= booking.totalAmount) {
      await booking.update({
        paymentStatus: 'paid'
      });
    } else if (totalPaid > 0) {
      await booking.update({
        paymentStatus: 'partial'
      });
    }

    // Fetch created payment with associations
    const createdPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'paymentStatus'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['id', 'title', 'roomNumber', 'floorNumber']
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ]
        },
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: createdPayment,
      remainingBalance: Math.max(0, booking.totalAmount - totalPaid)
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
      error: error.message
    });
  }
});

// @desc    Update payment
// @route   PUT /api/internal/payments/:id
// @access  Private (Internal - requires canRecordPayments permission)
router.put('/:id', internalAuth, checkPermission('canRecordPayments'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentMethod,
      transactionReference,
      status,
      notes
    } = req.body;

    // Find the payment
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Update payment
    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) updateData.transactionReference = transactionReference;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await payment.update(updateData);

    // Recalculate booking payment status if amount or status changed
    if (amount !== undefined || status) {
      const booking = await Booking.findByPk(payment.bookingId);
      const totalPaid = await Payment.sum('amount', {
        where: {
          bookingId: payment.bookingId,
          status: 'completed'
        }
      });

      if (totalPaid >= booking.totalAmount) {
        await booking.update({ paymentStatus: 'paid' });
      } else if (totalPaid > 0) {
        await booking.update({ paymentStatus: 'partial' });
      } else {
        await booking.update({ paymentStatus: 'pending' });
      }
    }

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'paymentStatus'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['id', 'title', 'roomNumber', 'floorNumber']
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ]
        },
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
});

// @desc    Get overdue payments
// @route   GET /api/internal/payments/overdue
// @access  Private (Internal)
router.get('/overdue', internalAuth, async (req, res) => {
  try {
    const { floor, roomNumber } = req.query;

    // Find all overdue payment schedules
    const whereClause = {
      status: 'overdue'
    };

    const includeClause = [
      {
        model: Booking,
        as: 'booking',
        attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'bookingSource'],
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'floorNumber'],
            where: {}
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      },
      {
        model: BedAssignment,
        as: 'bed',
        attributes: ['id', 'bedNumber'],
        required: false
      }
    ];

    // Add room filters if provided
    if (floor) {
      includeClause[0].include[0].where.floorNumber = parseInt(floor);
    }
    if (roomNumber) {
      includeClause[0].include[0].where.roomNumber = roomNumber;
    }

    const overdueSchedules = await PaymentSchedule.findAll({
      where: whereClause,
      include: includeClause,
      order: [['dueDate', 'ASC']]
    });

    // Calculate days overdue for each
    const overduePayments = overdueSchedules.map(schedule => {
      const today = new Date();
      const dueDate = new Date(schedule.dueDate);
      const diffTime = today - dueDate;
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: schedule.id,
        bookingId: schedule.bookingId,
        bedId: schedule.bedId,
        dueDate: schedule.dueDate,
        amount: schedule.amount,
        status: schedule.status,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        booking: schedule.booking,
        bed: schedule.bed
      };
    });

    // Sort by days overdue (descending)
    overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      success: true,
      count: overduePayments.length,
      data: overduePayments
    });
  } catch (error) {
    console.error('Get overdue payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue payments',
      error: error.message
    });
  }
});

module.exports = router;

// @desc    Get payment schedule for a booking
// @route   GET /api/internal/payments/schedule/:bookingId
// @access  Private (Internal)
router.get('/schedule/:bookingId', internalAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber', 'floorNumber']
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

    // Get payment schedule
    const schedules = await PaymentSchedule.findAll({
      where: { bookingId },
      include: [
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'paymentDate', 'paymentMethod', 'transactionReference']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber'],
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    // Update overdue status for pending payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of schedules) {
      if (schedule.status === 'pending') {
        const dueDate = new Date(schedule.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (today > dueDate) {
          await schedule.update({ status: 'overdue' });
        }
      }
    }

    // Refetch with updated status
    const updatedSchedules = await PaymentSchedule.findAll({
      where: { bookingId },
      include: [
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'paymentDate', 'paymentMethod', 'transactionReference']
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber'],
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: booking.totalAmount,
        room: booking.room,
        user: booking.user
      },
      count: updatedSchedules.length,
      data: updatedSchedules
    });
  } catch (error) {
    console.error('Get payment schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment schedule',
      error: error.message
    });
  }
});

// @desc    Create payment schedule on check-in (for PG)
// @route   POST /api/internal/payments/schedule
// @access  Private (Internal - requires canRecordPayments permission)
router.post('/schedule', internalAuth, checkPermission('canRecordPayments'), async (req, res) => {
  try {
    const {
      bookingId,
      monthlyAmount,
      numberOfMonths,
      startDate
    } = req.body;

    // Validate required fields
    if (!bookingId || !monthlyAmount || !numberOfMonths) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingId, monthlyAmount, and numberOfMonths'
      });
    }

    // Validate values
    if (monthlyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monthly amount must be greater than 0'
      });
    }

    if (numberOfMonths <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Number of months must be greater than 0'
      });
    }

    // Find the booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'title', 'roomNumber']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if schedule already exists
    const existingSchedule = await PaymentSchedule.findOne({
      where: { bookingId }
    });

    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        message: 'Payment schedule already exists for this booking'
      });
    }

    // Create payment schedules for each month
    const schedules = [];
    const baseDate = startDate ? new Date(startDate) : new Date(booking.checkIn);

    for (let i = 0; i < numberOfMonths; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const schedule = await PaymentSchedule.create({
        bookingId,
        bedId: booking.bedId || null,
        dueDate: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        amount: monthlyAmount,
        status: 'pending'
      });

      schedules.push(schedule);
    }

    // Update overdue status for any past due dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of schedules) {
      const dueDate = new Date(schedule.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (today > dueDate) {
        await schedule.update({ status: 'overdue' });
      }
    }

    // Fetch created schedules with associations
    const createdSchedules = await PaymentSchedule.findAll({
      where: { bookingId },
      include: [
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber'],
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.status(201).json({
      success: true,
      message: 'Payment schedule created successfully',
      count: createdSchedules.length,
      data: createdSchedules
    });
  } catch (error) {
    console.error('Create payment schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment schedule',
      error: error.message
    });
  }
});
