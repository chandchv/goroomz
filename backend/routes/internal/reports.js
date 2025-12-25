const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const Booking = require('../../models/Booking');
const Room = require('../../models/Room');
const RoomCategory = require('../../models/RoomCategory');
const Payment = require('../../models/Payment');
const HousekeepingLog = require('../../models/HousekeepingLog');
const PaymentSchedule = require('../../models/PaymentSchedule');
const User = require('../../models/User');
const BedAssignment = require('../../models/BedAssignment');
const { internalAuth } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');

const router = express.Router();

// @desc    Generate occupancy report
// @route   GET /api/internal/reports/occupancy
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.get('/occupancy', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Build room filter with data scoping
    const roomWhere = applyScopeToWhere(req.dataScope, {}, 'propertyId');

    // Get all rooms for the property
    const allRooms = await Room.findAll({
      where: roomWhere,
      attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'customCategoryId'],
      include: [
        {
          model: RoomCategory,
          as: 'customCategory',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    const totalRooms = allRooms.length;

    if (totalRooms === 0) {
      return res.json({
        success: true,
        data: {
          totalRooms: 0,
          occupancyPercentage: 0,
          byCategory: [],
          byFloor: []
        }
      });
    }

    // Calculate number of days in the period
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Get all bookings that overlap with the date range
    const bookings = await Booking.findAll({
      where: {
        status: {
          [Op.in]: ['confirmed', 'completed']
        },
        [Op.or]: [
          {
            checkIn: {
              [Op.between]: [start, end]
            }
          },
          {
            checkOut: {
              [Op.between]: [start, end]
            }
          },
          {
            [Op.and]: [
              { checkIn: { [Op.lte]: start } },
              { checkOut: { [Op.gte]: end } }
            ]
          }
        ]
      },
      include: [
        {
          model: Room,
          as: 'room',
          where: roomWhere,
          attributes: ['id', 'roomNumber', 'floorNumber', 'customCategoryId'],
          include: [
            {
              model: RoomCategory,
              as: 'customCategory',
              attributes: ['id', 'name'],
              required: false
            }
          ]
        }
      ]
    });

    // Calculate occupied room-days
    let totalOccupiedRoomDays = 0;
    const roomOccupancyMap = new Map();

    for (const booking of bookings) {
      const bookingStart = new Date(Math.max(new Date(booking.checkIn), start));
      const bookingEnd = new Date(Math.min(new Date(booking.checkOut), end));
      const occupiedDays = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24));

      if (occupiedDays > 0) {
        totalOccupiedRoomDays += occupiedDays;

        // Track per room
        const roomId = booking.room.id;
        if (!roomOccupancyMap.has(roomId)) {
          roomOccupancyMap.set(roomId, {
            room: booking.room,
            occupiedDays: 0
          });
        }
        roomOccupancyMap.get(roomId).occupiedDays += occupiedDays;
      }
    }

    // Calculate overall occupancy percentage
    const totalAvailableRoomDays = totalRooms * days;
    const occupancyPercentage = totalAvailableRoomDays > 0
      ? (totalOccupiedRoomDays / totalAvailableRoomDays) * 100
      : 0;

    // Calculate occupancy by category
    const categoryMap = new Map();
    const categoryRoomCount = new Map();

    for (const room of allRooms) {
      const categoryId = room.customCategoryId || 'uncategorized';
      const categoryName = room.customCategory?.name || 'Uncategorized';

      if (!categoryRoomCount.has(categoryId)) {
        categoryRoomCount.set(categoryId, {
          name: categoryName,
          totalRooms: 0,
          occupiedDays: 0
        });
      }
      categoryRoomCount.get(categoryId).totalRooms += 1;
    }

    for (const [roomId, data] of roomOccupancyMap) {
      const categoryId = data.room.customCategoryId || 'uncategorized';
      if (categoryRoomCount.has(categoryId)) {
        categoryRoomCount.get(categoryId).occupiedDays += data.occupiedDays;
      }
    }

    const byCategory = Array.from(categoryRoomCount.values()).map(cat => ({
      category: cat.name,
      totalRooms: cat.totalRooms,
      occupancyPercentage: cat.totalRooms > 0
        ? (cat.occupiedDays / (cat.totalRooms * days)) * 100
        : 0
    }));

    // Calculate occupancy by floor
    const floorMap = new Map();
    const floorRoomCount = new Map();

    for (const room of allRooms) {
      const floor = room.floorNumber || 0;

      if (!floorRoomCount.has(floor)) {
        floorRoomCount.set(floor, {
          totalRooms: 0,
          occupiedDays: 0
        });
      }
      floorRoomCount.get(floor).totalRooms += 1;
    }

    for (const [roomId, data] of roomOccupancyMap) {
      const floor = data.room.floorNumber || 0;
      if (floorRoomCount.has(floor)) {
        floorRoomCount.get(floor).occupiedDays += data.occupiedDays;
      }
    }

    const byFloor = Array.from(floorRoomCount.entries())
      .map(([floor, data]) => ({
        floor,
        totalRooms: data.totalRooms,
        occupancyPercentage: data.totalRooms > 0
          ? (data.occupiedDays / (data.totalRooms * days)) * 100
          : 0
      }))
      .sort((a, b) => a.floor - b.floor);

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          days
        },
        totalRooms,
        occupiedRooms: roomOccupancyMap.size,
        vacantRooms: totalRooms - roomOccupancyMap.size,
        occupancyPercentage: Math.round(occupancyPercentage * 100) / 100,
        byCategory,
        byFloor
      }
    });
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating occupancy report',
      error: error.message
    });
  }
});

module.exports = router;

// @desc    Generate revenue report
// @route   GET /api/internal/reports/revenue
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.get('/revenue', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, compareWithPrevious } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Build room filter with data scoping
    const roomWhere = applyScopeToWhere(req.dataScope, {}, 'propertyId');

    // Get all payments in the date range
    const payments = await Payment.findAll({
      where: {
        paymentDate: {
          [Op.between]: [start, end]
        },
        status: 'completed'
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingSource', 'totalAmount'],
          include: [
            {
              model: Room,
              as: 'room',
              where: roomWhere,
              attributes: ['id', 'roomNumber', 'floorNumber', 'customCategoryId'],
              include: [
                {
                  model: RoomCategory,
                  as: 'customCategory',
                  attributes: ['id', 'name'],
                  required: false
                }
              ]
            }
          ]
        }
      ]
    });

    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    // Calculate revenue by category
    const categoryRevenue = new Map();
    for (const payment of payments) {
      const categoryId = payment.booking.room.customCategoryId || 'uncategorized';
      const categoryName = payment.booking.room.customCategory?.name || 'Uncategorized';

      if (!categoryRevenue.has(categoryId)) {
        categoryRevenue.set(categoryId, {
          category: categoryName,
          revenue: 0
        });
      }
      categoryRevenue.get(categoryId).revenue += parseFloat(payment.amount);
    }

    const byCategory = Array.from(categoryRevenue.values()).map(cat => ({
      category: cat.category,
      revenue: Math.round(cat.revenue * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 10000) / 100 : 0
    }));

    // Calculate revenue by booking source
    const sourceRevenue = new Map();
    for (const payment of payments) {
      const source = payment.booking.bookingSource || 'unknown';

      if (!sourceRevenue.has(source)) {
        sourceRevenue.set(source, 0);
      }
      sourceRevenue.set(source, sourceRevenue.get(source) + parseFloat(payment.amount));
    }

    const bySource = Array.from(sourceRevenue.entries()).map(([source, revenue]) => ({
      source,
      revenue: Math.round(revenue * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 10000) / 100 : 0
    }));

    // Calculate revenue by floor
    const floorRevenue = new Map();
    for (const payment of payments) {
      const floor = payment.booking.room.floorNumber || 0;

      if (!floorRevenue.has(floor)) {
        floorRevenue.set(floor, 0);
      }
      floorRevenue.set(floor, floorRevenue.get(floor) + parseFloat(payment.amount));
    }

    const byFloor = Array.from(floorRevenue.entries())
      .map(([floor, revenue]) => ({
        floor,
        revenue: Math.round(revenue * 100) / 100
      }))
      .sort((a, b) => a.floor - b.floor);

    // Calculate payment status breakdown
    const bookingIds = [...new Set(payments.map(p => p.bookingId))];
    const bookings = await Booking.findAll({
      where: {
        id: {
          [Op.in]: bookingIds
        }
      },
      attributes: ['id', 'totalAmount', 'paymentStatus']
    });

    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    for (const booking of bookings) {
      const bookingPayments = payments.filter(p => p.bookingId === booking.id);
      const paidAmount = bookingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const remaining = parseFloat(booking.totalAmount) - paidAmount;

      totalPaid += paidAmount;

      if (remaining > 0) {
        if (booking.paymentStatus === 'overdue') {
          totalOverdue += remaining;
        } else {
          totalPending += remaining;
        }
      }
    }

    const paymentStatus = {
      paid: Math.round(totalPaid * 100) / 100,
      pending: Math.round(totalPending * 100) / 100,
      overdue: Math.round(totalOverdue * 100) / 100
    };

    // Period comparison if requested
    let comparison = null;
    if (compareWithPrevious === 'true') {
      const periodDuration = end - start;
      const prevStart = new Date(start.getTime() - periodDuration);
      const prevEnd = new Date(start);

      const prevPayments = await Payment.findAll({
        where: {
          paymentDate: {
            [Op.between]: [prevStart, prevEnd]
          },
          status: 'completed'
        },
        include: [
          {
            model: Booking,
            as: 'booking',
            include: [
              {
                model: Room,
                as: 'room',
                where: roomWhere,
                attributes: ['id']
              }
            ]
          }
        ]
      });

      const prevRevenue = prevPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const revenueChange = totalRevenue - prevRevenue;
      const percentageChange = prevRevenue > 0 ? (revenueChange / prevRevenue) * 100 : 0;

      comparison = {
        previousPeriod: {
          startDate: prevStart.toISOString().split('T')[0],
          endDate: prevEnd.toISOString().split('T')[0],
          revenue: Math.round(prevRevenue * 100) / 100
        },
        change: Math.round(revenueChange * 100) / 100,
        percentageChange: Math.round(percentageChange * 100) / 100
      };
    }

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPayments: payments.length,
        byCategory,
        bySource,
        byFloor,
        paymentStatus,
        ...(comparison && { comparison })
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating revenue report',
      error: error.message
    });
  }
});

// @desc    Generate booking report
// @route   GET /api/internal/reports/bookings
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.get('/bookings', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Build room filter with data scoping
    const roomWhere = applyScopeToWhere(req.dataScope, {}, 'propertyId');

    // Get all bookings in the date range
    const bookings = await Booking.findAll({
      where: {
        checkIn: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Room,
          as: 'room',
          where: roomWhere,
          attributes: ['id', 'title', 'roomNumber', 'customCategoryId'],
          include: [
            {
              model: RoomCategory,
              as: 'customCategory',
              attributes: ['id', 'name'],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calculate total bookings
    const totalBookings = bookings.length;

    // Count by status
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    for (const booking of bookings) {
      if (statusCounts.hasOwnProperty(booking.status)) {
        statusCounts[booking.status]++;
      }
    }

    const completionRate = totalBookings > 0
      ? Math.round((statusCounts.completed / totalBookings) * 10000) / 100
      : 0;

    const cancellationRate = totalBookings > 0
      ? Math.round((statusCounts.cancelled / totalBookings) * 10000) / 100
      : 0;

    // Online vs offline distribution
    const sourceDistribution = {
      online: 0,
      offline: 0
    };

    for (const booking of bookings) {
      if (booking.bookingSource === 'online') {
        sourceDistribution.online++;
      } else if (booking.bookingSource === 'offline') {
        sourceDistribution.offline++;
      }
    }

    const onlinePercentage = totalBookings > 0
      ? Math.round((sourceDistribution.online / totalBookings) * 10000) / 100
      : 0;

    const offlinePercentage = totalBookings > 0
      ? Math.round((sourceDistribution.offline / totalBookings) * 10000) / 100
      : 0;

    // Calculate average stay duration
    let totalDuration = 0;
    let durationCount = 0;

    for (const booking of bookings) {
      if (booking.checkIn && booking.checkOut) {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const duration = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        totalDuration += duration;
        durationCount++;
      }
    }

    const averageStayDuration = durationCount > 0
      ? Math.round((totalDuration / durationCount) * 10) / 10
      : 0;

    // Most popular room types
    const categoryBookings = new Map();
    for (const booking of bookings) {
      const categoryId = booking.room.customCategoryId || 'uncategorized';
      const categoryName = booking.room.customCategory?.name || 'Uncategorized';

      if (!categoryBookings.has(categoryId)) {
        categoryBookings.set(categoryId, {
          category: categoryName,
          count: 0
        });
      }
      categoryBookings.get(categoryId).count++;
    }

    const popularRoomTypes = Array.from(categoryBookings.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Repeat guest count (guests who have more than one booking)
    const guestBookingCount = new Map();
    for (const booking of bookings) {
      const userId = booking.userId;
      if (!guestBookingCount.has(userId)) {
        guestBookingCount.set(userId, 0);
      }
      guestBookingCount.set(userId, guestBookingCount.get(userId) + 1);
    }

    let repeatGuestCount = 0;
    for (const [userId, count] of guestBookingCount) {
      if (count > 1) {
        repeatGuestCount++;
      }
    }

    // Booking trends by day/week/month
    const trendsByDay = new Map();
    for (const booking of bookings) {
      const checkInDate = new Date(booking.checkIn);
      const dateKey = checkInDate.toISOString().split('T')[0];

      if (!trendsByDay.has(dateKey)) {
        trendsByDay.set(dateKey, 0);
      }
      trendsByDay.set(dateKey, trendsByDay.get(dateKey) + 1);
    }

    const trends = Array.from(trendsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        totalBookings,
        statusBreakdown: {
          ...statusCounts,
          completionRate,
          cancellationRate
        },
        sourceDistribution: {
          online: sourceDistribution.online,
          offline: sourceDistribution.offline,
          onlinePercentage,
          offlinePercentage
        },
        guestStatistics: {
          totalGuests: guestBookingCount.size,
          repeatGuests: repeatGuestCount,
          averageStayDuration
        },
        popularRoomTypes,
        trends
      }
    });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating booking report',
      error: error.message
    });
  }
});

// @desc    Generate housekeeping report
// @route   GET /api/internal/reports/housekeeping
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.get('/housekeeping', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Build room filter with data scoping
    const roomWhere = applyScopeToWhere(req.dataScope, {}, 'propertyId');

    // Get all housekeeping logs in the date range
    const logs = await HousekeepingLog.findAll({
      where: {
        cleanedAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Room,
          as: 'room',
          where: roomWhere,
          attributes: ['id', 'roomNumber', 'floorNumber', 'ownerId']
        },
        {
          model: User,
          as: 'cleaner',
          attributes: ['id', 'name']
        }
      ]
    });

    const totalRoomsCleaned = logs.length;

    // Calculate average cleaning time
    let totalTimeTaken = 0;
    let timeCount = 0;

    for (const log of logs) {
      if (log.timeTaken) {
        totalTimeTaken += log.timeTaken;
        timeCount++;
      }
    }

    const averageCleaningTime = timeCount > 0
      ? Math.round((totalTimeTaken / timeCount) * 10) / 10
      : 0;

    // Get pending tasks (rooms that are currently vacant_dirty)
    const pendingRooms = await Room.findAll({
      where: {
        ...roomWhere,
        currentStatus: 'vacant_dirty'
      },
      attributes: ['id', 'roomNumber', 'floorNumber']
    });

    const pendingTasks = pendingRooms.length;

    // Calculate room turnover time (time from checkout to clean)
    // Get all bookings that checked out in the period
    const checkouts = await Booking.findAll({
      where: {
        actualCheckOutTime: {
          [Op.between]: [start, end]
        },
        status: 'completed'
      },
      include: [
        {
          model: Room,
          as: 'room',
          where: roomWhere,
          attributes: ['id', 'roomNumber', 'lastCleanedAt']
        }
      ]
    });

    let totalTurnoverTime = 0;
    let turnoverCount = 0;

    for (const booking of checkouts) {
      if (booking.actualCheckOutTime && booking.room.lastCleanedAt) {
        const checkoutTime = new Date(booking.actualCheckOutTime);
        const cleanedTime = new Date(booking.room.lastCleanedAt);

        // Only count if cleaned after checkout
        if (cleanedTime > checkoutTime) {
          const turnoverMinutes = (cleanedTime - checkoutTime) / (1000 * 60);
          totalTurnoverTime += turnoverMinutes;
          turnoverCount++;
        }
      }
    }

    const averageTurnoverTime = turnoverCount > 0
      ? Math.round((totalTurnoverTime / turnoverCount) * 10) / 10
      : 0;

    // Rooms cleaned per day
    const cleaningsByDay = new Map();
    for (const log of logs) {
      const cleanedDate = new Date(log.cleanedAt);
      const dateKey = cleanedDate.toISOString().split('T')[0];

      if (!cleaningsByDay.has(dateKey)) {
        cleaningsByDay.set(dateKey, 0);
      }
      cleaningsByDay.set(dateKey, cleaningsByDay.get(dateKey) + 1);
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const roomsCleanedPerDay = days > 0
      ? Math.round((totalRoomsCleaned / days) * 10) / 10
      : 0;

    // Status distribution over time
    const statusDistribution = [];
    const allRooms = await Room.findAll({
      where: roomWhere,
      attributes: ['id', 'currentStatus']
    });

    const statusCounts = {
      occupied: 0,
      vacant_clean: 0,
      vacant_dirty: 0
    };

    for (const room of allRooms) {
      if (statusCounts.hasOwnProperty(room.currentStatus)) {
        statusCounts[room.currentStatus]++;
      }
    }

    statusDistribution.push({
      date: new Date().toISOString().split('T')[0],
      ...statusCounts
    });

    // Cleaner performance
    const cleanerPerformance = new Map();
    for (const log of logs) {
      const cleanerId = log.cleanedBy;
      const cleanerName = log.cleaner?.name || 'Unknown';

      if (!cleanerPerformance.has(cleanerId)) {
        cleanerPerformance.set(cleanerId, {
          name: cleanerName,
          roomsCleaned: 0,
          totalTime: 0,
          timeCount: 0
        });
      }

      const perf = cleanerPerformance.get(cleanerId);
      perf.roomsCleaned++;
      if (log.timeTaken) {
        perf.totalTime += log.timeTaken;
        perf.timeCount++;
      }
    }

    const cleanerStats = Array.from(cleanerPerformance.values()).map(perf => ({
      name: perf.name,
      roomsCleaned: perf.roomsCleaned,
      averageTime: perf.timeCount > 0
        ? Math.round((perf.totalTime / perf.timeCount) * 10) / 10
        : 0
    }));

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        totalRoomsCleaned,
        pendingTasks,
        averageCleaningTime,
        averageTurnoverTime,
        roomsCleanedPerDay,
        statusDistribution,
        cleanerPerformance: cleanerStats
      }
    });
  } catch (error) {
    console.error('Housekeeping report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating housekeeping report',
      error: error.message
    });
  }
});

// @desc    Generate payment collection report (PG-specific)
// @route   GET /api/internal/reports/payments
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.get('/payments', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Build room filter with data scoping
    const roomWhere = applyScopeToWhere(req.dataScope, {}, 'propertyId');

    // Get all payment schedules with due dates in the period
    const schedules = await PaymentSchedule.findAll({
      where: {
        dueDate: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'totalAmount'],
          include: [
            {
              model: Room,
              as: 'room',
              where: roomWhere,
              attributes: ['id', 'roomNumber', 'floorNumber']
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'paymentDate', 'paymentMethod'],
          required: false
        },
        {
          model: BedAssignment,
          as: 'bed',
          attributes: ['id', 'bedNumber'],
          required: false
        }
      ]
    });

    // Calculate totals
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let onTimePayments = 0;
    let latePayments = 0;
    let totalPayments = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of schedules) {
      const amount = parseFloat(schedule.amount);

      if (schedule.status === 'paid' && schedule.payment) {
        totalCollected += amount;
        totalPayments++;

        // Check if payment was on time
        const dueDate = new Date(schedule.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const paymentDate = new Date(schedule.payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);

        if (paymentDate <= dueDate) {
          onTimePayments++;
        } else {
          latePayments++;
        }
      } else if (schedule.status === 'overdue') {
        totalOverdue += amount;
      } else if (schedule.status === 'pending') {
        totalPending += amount;
      }
    }

    // Calculate collection efficiency
    const totalExpected = totalCollected + totalPending + totalOverdue;
    const collectionEfficiency = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 10000) / 100
      : 0;

    const onTimePercentage = totalPayments > 0
      ? Math.round((onTimePayments / totalPayments) * 10000) / 100
      : 0;

    const latePercentage = totalPayments > 0
      ? Math.round((latePayments / totalPayments) * 10000) / 100
      : 0;

    // Payment trends by month
    const trendsByMonth = new Map();
    for (const schedule of schedules) {
      if (schedule.status === 'paid' && schedule.payment) {
        const paymentDate = new Date(schedule.payment.paymentDate);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        if (!trendsByMonth.has(monthKey)) {
          trendsByMonth.set(monthKey, {
            collected: 0,
            count: 0
          });
        }

        const trend = trendsByMonth.get(monthKey);
        trend.collected += parseFloat(schedule.amount);
        trend.count++;
      }
    }

    const trends = Array.from(trendsByMonth.entries())
      .map(([month, data]) => ({
        month,
        collected: Math.round(data.collected * 100) / 100,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Identify defaulters (residents with consistently late payments)
    const residentPaymentHistory = new Map();

    for (const schedule of schedules) {
      const userId = schedule.booking.userId;
      const userName = schedule.booking.user.name;
      const userEmail = schedule.booking.user.email;
      const roomNumber = schedule.booking.room.roomNumber;

      if (!residentPaymentHistory.has(userId)) {
        residentPaymentHistory.set(userId, {
          name: userName,
          email: userEmail,
          roomNumber,
          totalDue: 0,
          totalOverdue: 0,
          latePayments: 0,
          totalPayments: 0
        });
      }

      const history = residentPaymentHistory.get(userId);

      if (schedule.status === 'overdue') {
        history.totalOverdue += parseFloat(schedule.amount);
      }

      if (schedule.status === 'paid' && schedule.payment) {
        history.totalPayments++;

        const dueDate = new Date(schedule.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const paymentDate = new Date(schedule.payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);

        if (paymentDate > dueDate) {
          history.latePayments++;
        }
      }
    }

    // Defaulters are those with overdue amounts or high late payment rate
    const defaulters = Array.from(residentPaymentHistory.values())
      .filter(history => {
        const lateRate = history.totalPayments > 0
          ? history.latePayments / history.totalPayments
          : 0;
        return history.totalOverdue > 0 || lateRate > 0.5;
      })
      .map(history => ({
        name: history.name,
        email: history.email,
        roomNumber: history.roomNumber,
        totalOverdue: Math.round(history.totalOverdue * 100) / 100,
        latePayments: history.latePayments,
        totalPayments: history.totalPayments,
        latePaymentRate: history.totalPayments > 0
          ? Math.round((history.latePayments / history.totalPayments) * 10000) / 100
          : 0
      }))
      .sort((a, b) => b.totalOverdue - a.totalOverdue);

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        summary: {
          totalCollected: Math.round(totalCollected * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          totalOverdue: Math.round(totalOverdue * 100) / 100,
          collectionEfficiency
        },
        paymentTiming: {
          onTimePayments,
          latePayments,
          onTimePercentage,
          latePercentage
        },
        trends,
        defaulters
      }
    });
  } catch (error) {
    console.error('Payment collection report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payment collection report',
      error: error.message
    });
  }
});

// @desc    Export report to CSV
// @route   POST /api/internal/reports/export
// @access  Private (Internal)
// Requirements: 2.5, 7.2
router.post('/export', internalAuth, applyScopingMiddleware, async (req, res) => {
  try {
    const { reportType, format, startDate, endDate } = req.body;

    // Validate required parameters
    if (!reportType || !format || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reportType, format, startDate, and endDate'
      });
    }

    // Validate format
    if (!['csv', 'pdf'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Format must be either csv or pdf'
      });
    }

    // Validate report type
    const validReportTypes = ['occupancy', 'revenue', 'bookings', 'housekeeping', 'payments'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    // For now, we'll implement CSV export
    // PDF export can be added later with a library like pdfkit or puppeteer
    if (format.toLowerCase() === 'pdf') {
      return res.status(501).json({
        success: false,
        message: 'PDF export is not yet implemented. Please use CSV format.'
      });
    }

    // Generate CSV based on report type
    let csvData = '';
    let filename = '';

    switch (reportType) {
      case 'occupancy':
        csvData = await generateOccupancyCSV(startDate, endDate, req.dataScope);
        filename = `occupancy-report-${startDate}-to-${endDate}.csv`;
        break;

      case 'revenue':
        csvData = await generateRevenueCSV(startDate, endDate, req.dataScope);
        filename = `revenue-report-${startDate}-to-${endDate}.csv`;
        break;

      case 'bookings':
        csvData = await generateBookingsCSV(startDate, endDate, req.dataScope);
        filename = `bookings-report-${startDate}-to-${endDate}.csv`;
        break;

      case 'housekeeping':
        csvData = await generateHousekeepingCSV(startDate, endDate, req.dataScope);
        filename = `housekeeping-report-${startDate}-to-${endDate}.csv`;
        break;

      case 'payments':
        csvData = await generatePaymentsCSV(startDate, endDate, req.dataScope);
        filename = `payments-report-${startDate}-to-${endDate}.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
});

// Helper function to generate occupancy CSV
async function generateOccupancyCSV(startDate, endDate, dataScope) {
  const roomWhere = applyScopeToWhere(dataScope, {}, 'propertyId');

  const start = new Date(startDate);
  const end = new Date(endDate);

  const allRooms = await Room.findAll({
    where: roomWhere,
    attributes: ['id', 'title', 'roomNumber', 'floorNumber', 'customCategoryId'],
    include: [
      {
        model: RoomCategory,
        as: 'customCategory',
        attributes: ['name'],
        required: false
      }
    ]
  });

  const bookings = await Booking.findAll({
    where: {
      status: {
        [Op.in]: ['confirmed', 'completed']
      },
      [Op.or]: [
        { checkIn: { [Op.between]: [start, end] } },
        { checkOut: { [Op.between]: [start, end] } },
        {
          [Op.and]: [
            { checkIn: { [Op.lte]: start } },
            { checkOut: { [Op.gte]: end } }
          ]
        }
      ]
    },
    include: [
      {
        model: Room,
        as: 'room',
        where: roomWhere,
        attributes: ['id', 'roomNumber']
      }
    ]
  });

  // Build CSV
  let csv = 'Room Number,Floor,Category,Status,Occupied Days\n';

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const roomOccupancyMap = new Map();

  for (const booking of bookings) {
    const bookingStart = new Date(Math.max(new Date(booking.checkIn), start));
    const bookingEnd = new Date(Math.min(new Date(booking.checkOut), end));
    const occupiedDays = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24));

    if (occupiedDays > 0) {
      const roomId = booking.room.id;
      if (!roomOccupancyMap.has(roomId)) {
        roomOccupancyMap.set(roomId, 0);
      }
      roomOccupancyMap.set(roomId, roomOccupancyMap.get(roomId) + occupiedDays);
    }
  }

  for (const room of allRooms) {
    const occupiedDays = roomOccupancyMap.get(room.id) || 0;
    const status = occupiedDays > 0 ? 'Occupied' : 'Vacant';
    const category = room.customCategory?.name || 'Uncategorized';

    csv += `${room.roomNumber},${room.floorNumber || 0},${category},${status},${occupiedDays}\n`;
  }

  return csv;
}

// Helper function to generate revenue CSV
async function generateRevenueCSV(startDate, endDate, dataScope) {
  const roomWhere = applyScopeToWhere(dataScope, {}, 'propertyId');

  const start = new Date(startDate);
  const end = new Date(endDate);

  const payments = await Payment.findAll({
    where: {
      paymentDate: {
        [Op.between]: [start, end]
      },
      status: 'completed'
    },
    include: [
      {
        model: Booking,
        as: 'booking',
        attributes: ['id', 'bookingSource'],
        include: [
          {
            model: Room,
            as: 'room',
            where: roomWhere,
            attributes: ['roomNumber', 'floorNumber', 'customCategoryId'],
            include: [
              {
                model: RoomCategory,
                as: 'customCategory',
                attributes: ['name'],
                required: false
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      }
    ]
  });

  // Build CSV
  let csv = 'Date,Room Number,Guest Name,Guest Email,Category,Booking Source,Amount,Payment Method\n';

  for (const payment of payments) {
    const date = new Date(payment.paymentDate).toISOString().split('T')[0];
    const roomNumber = payment.booking.room.roomNumber;
    const guestName = payment.booking.user.name;
    const guestEmail = payment.booking.user.email;
    const category = payment.booking.room.customCategory?.name || 'Uncategorized';
    const source = payment.booking.bookingSource;
    const amount = payment.amount;
    const method = payment.paymentMethod;

    csv += `${date},${roomNumber},"${guestName}","${guestEmail}",${category},${source},${amount},${method}\n`;
  }

  return csv;
}

// Helper function to generate bookings CSV
async function generateBookingsCSV(startDate, endDate, dataScope) {
  const roomWhere = applyScopeToWhere(dataScope, {}, 'propertyId');

  const start = new Date(startDate);
  const end = new Date(endDate);

  const bookings = await Booking.findAll({
    where: {
      checkIn: {
        [Op.between]: [start, end]
      }
    },
    include: [
      {
        model: Room,
        as: 'room',
        where: roomWhere,
        attributes: ['roomNumber', 'floorNumber', 'customCategoryId'],
        include: [
          {
            model: RoomCategory,
            as: 'customCategory',
            attributes: ['name'],
            required: false
          }
        ]
      },
      {
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'phone']
      }
    ]
  });

  // Build CSV
  let csv = 'Booking ID,Guest Name,Guest Email,Guest Phone,Room Number,Category,Check-In,Check-Out,Status,Source,Total Amount,Payment Status\n';

  for (const booking of bookings) {
    const checkIn = new Date(booking.checkIn).toISOString().split('T')[0];
    const checkOut = new Date(booking.checkOut).toISOString().split('T')[0];
    const category = booking.room.customCategory?.name || 'Uncategorized';
    const duration = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

    csv += `${booking.id},"${booking.user.name}","${booking.user.email}",${booking.user.phone},${booking.room.roomNumber},${category},${checkIn},${checkOut},${booking.status},${booking.bookingSource},${booking.totalAmount},${booking.paymentStatus}\n`;
  }

  return csv;
}

// Helper function to generate housekeeping CSV
async function generateHousekeepingCSV(startDate, endDate, dataScope) {
  const roomWhere = applyScopeToWhere(dataScope, {}, 'propertyId');

  const start = new Date(startDate);
  const end = new Date(endDate);

  const logs = await HousekeepingLog.findAll({
    where: {
      cleanedAt: {
        [Op.between]: [start, end]
      }
    },
    include: [
      {
        model: Room,
        as: 'room',
        where: roomWhere,
        attributes: ['roomNumber', 'floorNumber']
      },
      {
        model: User,
        as: 'cleaner',
        attributes: ['name']
      }
    ]
  });

  // Build CSV
  let csv = 'Date,Room Number,Floor,Cleaned By,Time Taken (minutes),Issues Found\n';

  for (const log of logs) {
    const date = new Date(log.cleanedAt).toISOString().split('T')[0];
    const roomNumber = log.room.roomNumber;
    const floor = log.room.floorNumber || 0;
    const cleanerName = log.cleaner?.name || 'Unknown';
    const timeTaken = log.timeTaken || 0;
    const issues = log.issuesFound ? `"${log.issuesFound.replace(/"/g, '""')}"` : 'None';

    csv += `${date},${roomNumber},${floor},"${cleanerName}",${timeTaken},${issues}\n`;
  }

  return csv;
}

// Helper function to generate payments CSV
async function generatePaymentsCSV(startDate, endDate, dataScope) {
  const roomWhere = applyScopeToWhere(dataScope, {}, 'propertyId');

  const start = new Date(startDate);
  const end = new Date(endDate);

  const schedules = await PaymentSchedule.findAll({
    where: {
      dueDate: {
        [Op.between]: [start, end]
      }
    },
    include: [
      {
        model: Booking,
        as: 'booking',
        attributes: ['id'],
        include: [
          {
            model: Room,
            as: 'room',
            where: roomWhere,
            attributes: ['roomNumber', 'floorNumber']
          },
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email', 'phone']
          }
        ]
      },
      {
        model: Payment,
        as: 'payment',
        attributes: ['paymentDate', 'paymentMethod'],
        required: false
      },
      {
        model: BedAssignment,
        as: 'bed',
        attributes: ['bedNumber'],
        required: false
      }
    ]
  });

  // Build CSV
  let csv = 'Resident Name,Email,Phone,Room Number,Bed Number,Due Date,Amount,Status,Payment Date,Payment Method,Days Overdue\n';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const schedule of schedules) {
    const residentName = schedule.booking.user.name;
    const email = schedule.booking.user.email;
    const phone = schedule.booking.user.phone;
    const roomNumber = schedule.booking.room.roomNumber;
    const bedNumber = schedule.bed?.bedNumber || 'N/A';
    const dueDate = new Date(schedule.dueDate).toISOString().split('T')[0];
    const amount = schedule.amount;
    const status = schedule.status;
    const paymentDate = schedule.payment?.paymentDate
      ? new Date(schedule.payment.paymentDate).toISOString().split('T')[0]
      : 'N/A';
    const paymentMethod = schedule.payment?.paymentMethod || 'N/A';

    let daysOverdue = 0;
    if (schedule.status === 'overdue') {
      const due = new Date(schedule.dueDate);
      due.setHours(0, 0, 0, 0);
      daysOverdue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    }

    csv += `"${residentName}","${email}",${phone},${roomNumber},${bedNumber},${dueDate},${amount},${status},${paymentDate},${paymentMethod},${daysOverdue}\n`;
  }

  return csv;
}
