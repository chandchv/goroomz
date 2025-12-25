const express = require('express');
const router = express.Router();
const { 
  Room, 
  Booking, 
  Payment, 
  PaymentSchedule,
  MaintenanceRequest,
  User,
  Property 
} = require('../../models');
const { protectInternal } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Internal Dashboard Routes
 * Requirements: 31.1, 31.2, 31.3, 31.4
 */

/**
 * Helper function to get property owner ID based on user role
 * Returns null for admin without propertyId (means show all properties)
 * Returns ownerId for property owners
 * Returns propertyId for staff users
 */
const getPropertyOwnerId = (user, queryPropertyId) => {
  if (user.role === 'admin') {
    // Admin can view all properties or filter by specific property
    return queryPropertyId || null;
  } else if (user.role === 'owner' || user.role === 'category_owner') {
    return user.id;
  } else if (queryPropertyId) {
    // Staff user with propertyId in query
    return queryPropertyId;
  }
  return null;
};

/**
 * GET /api/internal/dashboard/kpis
 * Get key performance indicators for the dashboard
 * Requirements: 31.1
 */
router.get('/kpis', protectInternal, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const ownerId = getPropertyOwnerId(req.user, propertyId);

    // Staff users must provide propertyId
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'category_owner' && !ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required for staff users.'
      });
    }

    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Build where clause for rooms
    const roomWhere = {
      isActive: true
    };
    // Note: ownerId field doesn't exist in rooms table yet
    // if (ownerId) {
    //   roomWhere.ownerId = ownerId;
    // }

    // Get total rooms count
    const totalRooms = await Room.count({
      where: roomWhere
    });

    // Get occupied rooms count - currentStatus field doesn't exist yet
    const occupiedRooms = 0; // await Room.count({
    //   where: {
    //     ...roomWhere,
    //     currentStatus: 'occupied'
    //   }
    // });

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 
      ? ((occupiedRooms / totalRooms) * 100).toFixed(2)
      : 0;

    // Build where clause for bookings
    const bookingWhere = {};
    if (ownerId) {
      bookingWhere.ownerId = ownerId;
    }

    // Get total revenue for current month
    const revenueResult = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalRevenue']
      ],
      include: [{
        model: Booking,
        as: 'booking',
        attributes: [],
        where: bookingWhere,
        required: true
      }],
      where: {
        status: 'completed',
        paymentDate: {
          [Op.between]: [monthStart, monthEnd]
        }
      },
      raw: true
    });

    const totalRevenue = parseFloat(revenueResult?.totalRevenue || 0);

    // Get pending payments count and amount
    const pendingPaymentsResult = await PaymentSchedule.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('PaymentSchedule.id')), 'count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount']
      ],
      include: [{
        model: Booking,
        as: 'booking',
        attributes: [],
        where: bookingWhere,
        required: true
      }],
      where: {
        status: {
          [Op.in]: ['pending', 'overdue']
        }
      },
      raw: true
    });

    const pendingPaymentsCount = parseInt(pendingPaymentsResult?.count || 0);
    const pendingPaymentsAmount = parseFloat(pendingPaymentsResult?.totalAmount || 0);

    // Get room status summary
    const roomStatusSummary = await Room.findAll({
      attributes: [
        'currentStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: roomWhere,
      group: ['currentStatus'],
      raw: true
    });

    const statusCounts = {
      occupied: 0,
      vacant_clean: 0,
      vacant_dirty: 0
    };

    roomStatusSummary.forEach(item => {
      statusCounts[item.currentStatus] = parseInt(item.count);
    });

    res.json({
      success: true,
      data: {
        occupancy: {
          rate: parseFloat(occupancyRate),
          totalRooms,
          occupiedRooms,
          vacantRooms: totalRooms - occupiedRooms
        },
        revenue: {
          currentMonth: totalRevenue,
          currency: 'INR'
        },
        payments: {
          pendingCount: pendingPaymentsCount,
          pendingAmount: pendingPaymentsAmount
        },
        roomStatus: statusCounts
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard KPIs.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/dashboard/activities
 * Get today's activities (check-ins, check-outs, payments due)
 * Requirements: 31.3
 */
router.get('/activities', protectInternal, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const ownerId = getPropertyOwnerId(req.user, propertyId);

    // Staff users must provide propertyId
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'category_owner' && !ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required for staff users.'
      });
    }

    // Build where clause for bookings
    const bookingWhere = {};
    if (ownerId) {
      bookingWhere.ownerId = ownerId;
    }

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Get today's check-ins
    const checkIns = await Booking.findAll({
      where: {
        ...bookingWhere,
        checkIn: {
          [Op.between]: [todayStart, todayEnd]
        },
        status: {
          [Op.in]: ['confirmed', 'pending']
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Room,
          as: 'room',
          attributes: ['id'] // roomNumber, floorNumber, title don't exist yet
        }
      ],
      order: [['checkIn', 'ASC']]
    });

    // Get today's check-outs
    const checkOuts = await Booking.findAll({
      where: {
        ...bookingWhere,
        checkOut: {
          [Op.between]: [todayStart, todayEnd]
        },
        status: 'confirmed'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Room,
          as: 'room',
          attributes: ['id'] // roomNumber, floorNumber, title don't exist yet
        }
      ],
      order: [['checkOut', 'ASC']]
    });

    // Get today's payment due dates
    const paymentsDue = await PaymentSchedule.findAll({
      where: {
        dueDate: {
          [Op.between]: [todayStart, todayEnd]
        },
        status: {
          [Op.in]: ['pending', 'overdue']
        }
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          where: bookingWhere,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            },
            {
              model: Room,
              as: 'room',
              attributes: ['id'] // roomNumber, floorNumber don't exist yet
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        checkIns: checkIns.map(booking => ({
          id: booking.id,
          guestName: booking.user?.name,
          guestPhone: booking.user?.phone,
          roomId: booking.room?.id,
          checkInTime: booking.checkIn,
          guests: booking.guests,
          status: booking.status
        })),
        checkOuts: checkOuts.map(booking => ({
          id: booking.id,
          guestName: booking.user?.name,
          guestPhone: booking.user?.phone,
          roomId: booking.room?.id,
          checkOutTime: booking.checkOut,
          guests: booking.guests,
          status: booking.status
        })),
        paymentsDue: paymentsDue.map(schedule => ({
          id: schedule.id,
          bookingId: schedule.bookingId,
          guestName: schedule.booking?.user?.name,
          roomId: schedule.booking?.room?.id,
          amount: schedule.amount,
          dueDate: schedule.dueDate,
          status: schedule.status
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard activities.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/dashboard/alerts
 * Get alerts (overdue payments, maintenance, dirty rooms)
 * Requirements: 31.4
 */
router.get('/alerts', protectInternal, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const ownerId = getPropertyOwnerId(req.user, propertyId);

    // Staff users must provide propertyId
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'category_owner' && !ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required for staff users.'
      });
    }

    // Build where clause for bookings
    const bookingWhere = {};
    if (ownerId) {
      bookingWhere.ownerId = ownerId;
    }

    // Build where clause for rooms
    const roomWhere = {};
    if (ownerId) {
      // Get properties owned by this user
      const userProperties = await Property.findAll({
        where: { ownerId },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      
      if (propertyIds.length > 0) {
        roomWhere.propertyId = { [Op.in]: propertyIds };
      } else {
        // If user has no properties, return empty results
        roomWhere.propertyId = null;
      }
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get overdue payments
    const bookingInclude = {
      model: Booking,
      as: 'booking',
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: Room,
          as: 'room',
          attributes: ['id'] // roomNumber, floorNumber don't exist yet
        }
      ]
    };
    if (ownerId) {
      bookingInclude.where = bookingWhere;
    }

    const overduePayments = await PaymentSchedule.findAll({
      where: {
        status: 'overdue',
        dueDate: {
          [Op.lt]: now
        }
      },
      include: [bookingInclude],
      order: [['dueDate', 'ASC']],
      limit: 10
    });

    // Get pending maintenance requests (high and urgent priority)
    const maintenanceInclude = {
      model: Room,
      as: 'room',
      attributes: ['id'] // roomNumber, floorNumber, title don't exist yet
    };
    if (ownerId) {
      maintenanceInclude.where = roomWhere;
    }

    const pendingMaintenance = await MaintenanceRequest.findAll({
      where: {
        status: {
          [Op.in]: ['pending', 'in_progress']
        },
        priority: {
          [Op.in]: ['high', 'urgent']
        }
      },
      include: [maintenanceInclude],
      order: [
        [sequelize.literal("CASE WHEN priority = 'urgent' THEN 1 WHEN priority = 'high' THEN 2 ELSE 3 END"), 'ASC'],
        ['reportedDate', 'ASC']
      ],
      limit: 10
    });

    // Get rooms that have been dirty for more than 24 hours
    const dirtyRooms = await Room.findAll({
      where: {
        ...roomWhere,
        isActive: true,
        currentStatus: 'vacant_dirty',
        lastCleanedAt: {
          [Op.or]: [
            { [Op.lt]: twentyFourHoursAgo },
            { [Op.is]: null }
          ]
        }
      },
      attributes: ['id'], // roomNumber, floorNumber, title, lastCleanedAt don't exist yet
      order: [['created_at', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        overduePayments: overduePayments.map(schedule => {
          const daysOverdue = Math.floor((now - new Date(schedule.dueDate)) / (1000 * 60 * 60 * 24));
          return {
            id: schedule.id,
            bookingId: schedule.bookingId,
            guestName: schedule.booking?.user?.name,
            guestPhone: schedule.booking?.user?.phone,
            roomId: schedule.booking?.room?.id,
            amount: schedule.amount,
            dueDate: schedule.dueDate,
            daysOverdue
          };
        }),
        pendingMaintenance: pendingMaintenance.map(request => ({
          id: request.id,
          roomId: request.room?.id,
          title: request.title,
          priority: request.priority,
          status: request.status,
          reportedDate: request.reportedDate
        })),
        dirtyRooms: dirtyRooms.map(room => {
          return {
            id: room.id
          };
        })
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard alerts.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
