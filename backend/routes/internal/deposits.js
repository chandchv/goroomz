const express = require('express');
const { Op } = require('sequelize');
const SecurityDeposit = require('../../models/SecurityDeposit');
const Booking = require('../../models/Booking');
const Room = require('../../models/Room');
const User = require('../../models/User');
const { internalAuth, checkPermission } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');

const router = express.Router();

// @desc    Get all security deposits with filters
// @route   GET /api/internal/deposits
// @access  Private (Internal)
router.get('/', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log('📋 Get deposits request:', { status, limit, search });
    console.log('📋 User data scope:', req.dataScope);

    // Build where clause for deposits
    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by payment method
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.collectedDate = {};
      if (startDate) {
        whereClause.collectedDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.collectedDate[Op.lte] = new Date(endDate);
      }
    }

    // Build room where clause with data scoping for property access
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

    // Build include clause with search
    const includeClause = [
      {
        model: Booking,
        as: 'booking',
        attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'status', 'guests'],
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'propertyId'],
            where: roomWhere,
            required: true // This ensures only deposits for accessible properties are returned
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
          }
        ],
        required: true
      },
      {
        model: User,
        as: 'refunder',
        attributes: ['id', 'name', 'email'],
        required: false
      }
    ];

    // Add room number search if provided
    if (search) {
      // Try to search by room number as well
      const roomSearchWhere = {
        ...roomWhere,
        roomNumber: { [Op.iLike]: `%${search}%` }
      };
      
      // We'll use a more complex query to handle OR search across multiple fields
      const { count, rows: deposits } = await SecurityDeposit.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Booking,
            as: 'booking',
            attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'status', 'guests'],
            include: [
              {
                model: Room,
                as: 'room',
                attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'propertyId'],
                where: {
                  [Op.and]: [
                    roomWhere,
                    {
                      [Op.or]: [
                        { roomNumber: { [Op.iLike]: `%${search}%` } },
                        { title: { [Op.iLike]: `%${search}%` } }
                      ]
                    }
                  ]
                },
                required: true
              },
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone'],
                where: {
                  [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } }
                  ]
                },
                required: false
              }
            ],
            required: true
          },
          {
            model: User,
            as: 'refunder',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [['collectedDate', 'DESC']],
        offset,
        limit: parseInt(limit),
        distinct: true
      });

      console.log('📋 Found deposits with search:', deposits.length, 'Total:', count);

      return res.json({
        success: true,
        count: deposits.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        data: deposits
      });
    }

    // Regular query without search
    const { count, rows: deposits } = await SecurityDeposit.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['collectedDate', 'DESC']],
      offset,
      limit: parseInt(limit),
      distinct: true
    });

    console.log('📋 Found deposits:', deposits.length, 'Total:', count);

    res.json({
      success: true,
      count: deposits.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: deposits
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deposits',
      error: error.message
    });
  }
});

// @desc    Record security deposit
// @route   POST /api/internal/deposits
// @access  Private (Internal - requires canRecordPayments permission)
router.post('/', internalAuth, checkPermission('canRecordPayments'), async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
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
        message: 'Deposit amount must be greater than 0'
      });
    }

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

    // Check if deposit already exists
    const existingDeposit = await SecurityDeposit.findOne({
      where: { bookingId }
    });

    if (existingDeposit) {
      return res.status(400).json({
        success: false,
        message: 'Security deposit already exists for this booking'
      });
    }

    // Check if security deposit already exists for this booking
    let deposit = await SecurityDeposit.findOne({
      where: { bookingId }
    });

    if (deposit) {
      // Update existing security deposit
      await deposit.update({
        amount,
        collectedDate: new Date(),
        paymentMethod,
        status: 'collected',
        notes: notes || deposit.notes
      });
      console.log('✅ Updated existing security deposit for booking:', bookingId);
    } else {
      // Create new security deposit
      deposit = await SecurityDeposit.create({
        bookingId,
        amount,
        collectedDate: new Date(),
        paymentMethod,
        status: 'collected',
        notes: notes || null
      });
      console.log('✅ Created new security deposit for booking:', bookingId);
    }

    // Update booking with security deposit reference
    await booking.update({
      securityDepositId: deposit.id
    });

    // Fetch created deposit with associations
    const createdDeposit = await SecurityDeposit.findByPk(deposit.id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount'],
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
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Security deposit recorded successfully',
      data: createdDeposit
    });
  } catch (error) {
    console.error('Record security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording security deposit',
      error: error.message
    });
  }
});

// @desc    Process security deposit refund with deductions
// @route   PUT /api/internal/deposits/:id/refund
// @access  Private (Internal - requires canRecordPayments permission)
router.put('/:id/refund', internalAuth, checkPermission('canRecordPayments'), async (req, res) => {
  try {
    const { id } = req.params;
    const { deductions, notes } = req.body;

    // Find the security deposit
    const deposit = await SecurityDeposit.findByPk(id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut'],
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
        }
      ]
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    // Check if already refunded
    if (deposit.status === 'refunded' || deposit.status === 'partially_refunded') {
      return res.status(400).json({
        success: false,
        message: 'Security deposit has already been refunded'
      });
    }

    // Validate deductions if provided
    let totalDeductions = 0;
    let validatedDeductions = [];

    if (deductions && Array.isArray(deductions) && deductions.length > 0) {
      for (const deduction of deductions) {
        if (!deduction.reason || typeof deduction.reason !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Each deduction must have a reason'
          });
        }

        const deductionAmount = parseFloat(deduction.amount);
        if (isNaN(deductionAmount) || deductionAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Each deduction must have a valid positive amount'
          });
        }

        totalDeductions += deductionAmount;
        validatedDeductions.push({
          reason: deduction.reason,
          amount: deductionAmount
        });
      }
    }

    // Calculate refund amount
    const refundAmount = parseFloat(deposit.amount) - totalDeductions;

    if (refundAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total deductions cannot exceed deposit amount'
      });
    }

    // Determine status
    let status = 'refunded';
    if (totalDeductions > 0 && refundAmount > 0) {
      status = 'partially_refunded';
    } else if (refundAmount === 0) {
      status = 'refunded'; // Fully deducted, no refund
    }

    // Update security deposit
    await deposit.update({
      status,
      refundAmount,
      refundDate: new Date(),
      deductions: validatedDeductions,
      refundedBy: req.user.id,
      notes: notes || deposit.notes
    });

    // Fetch updated deposit with associations
    const updatedDeposit = await SecurityDeposit.findByPk(id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount'],
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
          as: 'refunder',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Security deposit refund processed successfully',
      data: updatedDeposit,
      summary: {
        originalAmount: parseFloat(deposit.amount),
        totalDeductions,
        refundAmount
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing security deposit refund',
      error: error.message
    });
  }
});

// @desc    Get security deposit info for a booking
// @route   GET /api/internal/deposits/:bookingId
// @access  Private (Internal)
router.get('/:bookingId', internalAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the security deposit
    const deposit = await SecurityDeposit.findOne({
      where: { bookingId },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount', 'status'],
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
          as: 'refunder',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found for this booking'
      });
    }

    res.json({
      success: true,
      data: deposit
    });
  } catch (error) {
    console.error('Get security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security deposit',
      error: error.message
    });
  }
});

module.exports = router;
