/**
 * Reporting Service
 * 
 * Provides daily reports of check-ins, check-outs, no-shows, and occupancy reports.
 * Requirements: 10.5, 10.6
 */

const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const BookingAuditLog = require('../models/BookingAuditLog');
const Property = require('../models/Property');

class ReportingService {
  /**
   * Get daily check-ins, check-outs, and no-shows report
   * Requirements: 10.5
   * 
   * @param {Object} options - Report options
   * @param {Date} options.date - Report date (defaults to today)
   * @param {string} options.propertyId - Property UUID (optional, for filtering)
   * @returns {Promise<Object>} Daily report
   */
  async getDailyReport(options = {}) {
    const { date = new Date(), propertyId } = options;

    // Get start and end of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const baseWhere = {};
    if (propertyId) {
      baseWhere.propertyId = propertyId;
    }

    // Get check-ins for the day
    const checkIns = await Booking.findAll({
      where: {
        ...baseWhere,
        status: 'confirmed',
        actualCheckInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'guestProfile', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'property', attributes: ['id', 'name'] }
      ],
      order: [['actualCheckInTime', 'ASC']]
    });

    // Get check-outs for the day
    const checkOuts = await Booking.findAll({
      where: {
        ...baseWhere,
        status: 'completed',
        actualCheckOutTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'guestProfile', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'property', attributes: ['id', 'name'] }
      ],
      order: [['actualCheckOutTime', 'ASC']]
    });

    // Get no-shows for the day (bookings that were scheduled for check-in today but marked as no-show)
    const noShows = await Booking.findAll({
      where: {
        ...baseWhere,
        status: 'cancelled',
        checkIn: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'guestProfile', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'property', attributes: ['id', 'name'] }
      ],
      order: [['checkIn', 'ASC']]
    });

    // Get pending check-ins (confirmed bookings scheduled for today that haven't checked in)
    const pendingCheckIns = await Booking.findAll({
      where: {
        ...baseWhere,
        status: 'confirmed',
        checkIn: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'guestProfile', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'property', attributes: ['id', 'name'] }
      ],
      order: [['checkIn', 'ASC']]
    });

    // Get due check-outs (checked-in bookings scheduled to check out today)
    const dueCheckOuts = await Booking.findAll({
      where: {
        ...baseWhere,
        status: 'confirmed',
        checkOut: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'guestProfile', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'property', attributes: ['id', 'name'] }
      ],
      order: [['checkOut', 'ASC']]
    });

    // Calculate revenue for the day
    const revenueData = await this.calculateDailyRevenue(startOfDay, endOfDay, propertyId);

    return {
      date: date.toISOString().split('T')[0],
      propertyId: propertyId || 'all',
      summary: {
        totalCheckIns: checkIns.length,
        totalCheckOuts: checkOuts.length,
        totalNoShows: noShows.length,
        pendingCheckIns: pendingCheckIns.length,
        dueCheckOuts: dueCheckOuts.length
      },
      revenue: revenueData,
      checkIns: checkIns.map(b => this.formatBookingForReport(b)),
      checkOuts: checkOuts.map(b => this.formatBookingForReport(b)),
      noShows: noShows.map(b => this.formatBookingForReport(b)),
      pendingCheckIns: pendingCheckIns.map(b => this.formatBookingForReport(b)),
      dueCheckOuts: dueCheckOuts.map(b => this.formatBookingForReport(b))
    };
  }

  /**
   * Get occupancy report by date range
   * Requirements: 10.6
   * 
   * @param {Object} options - Report options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {string} options.propertyId - Property UUID (optional)
   * @returns {Promise<Object>} Occupancy report
   */
  async getOccupancyReport(options = {}) {
    const { 
      startDate = new Date(), 
      endDate = new Date(),
      propertyId 
    } = options;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get total rooms
    const roomWhere = { isActive: true };
    if (propertyId) {
      roomWhere.propertyId = propertyId;
    }

    const totalRooms = await Room.count({ where: roomWhere });

    // Get bookings that overlap with the date range
    const bookingWhere = {
      status: { [Op.in]: ['confirmed', 'completed', 'confirmed'] },
      [Op.and]: [
        { checkIn: { [Op.lte]: end } },
        { checkOut: { [Op.gte]: start } }
      ]
    };

    if (propertyId) {
      bookingWhere.propertyId = propertyId;
    }

    const bookings = await Booking.findAll({
      where: bookingWhere,
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'property', attributes: ['id', 'name'] }
      ]
    });

    // Calculate daily occupancy
    const dailyOccupancy = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Count occupied rooms for this day
      const occupiedRooms = bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        return checkIn <= dayEnd && checkOut >= dayStart;
      });

      // Get unique room IDs
      const uniqueOccupiedRoomIds = [...new Set(occupiedRooms.map(b => b.roomId))];
      const occupiedCount = uniqueOccupiedRoomIds.length;

      const occupancyRate = totalRooms > 0 
        ? Math.round((occupiedCount / totalRooms) * 100 * 100) / 100 
        : 0;

      dailyOccupancy.push({
        date: currentDate.toISOString().split('T')[0],
        totalRooms,
        occupiedRooms: occupiedCount,
        availableRooms: totalRooms - occupiedCount,
        occupancyRate
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate average occupancy for the period
    const avgOccupancy = dailyOccupancy.length > 0
      ? Math.round(dailyOccupancy.reduce((sum, d) => sum + d.occupancyRate, 0) / dailyOccupancy.length * 100) / 100
      : 0;

    // Get room status breakdown for current day
    const roomStatusBreakdown = await this.getRoomStatusBreakdown(propertyId);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      propertyId: propertyId || 'all',
      summary: {
        totalRooms,
        averageOccupancyRate: avgOccupancy,
        totalBookings: bookings.length,
        periodDays: dailyOccupancy.length
      },
      currentRoomStatus: roomStatusBreakdown,
      dailyOccupancy
    };
  }

  /**
   * Get room status breakdown
   * 
   * @param {string} propertyId - Property UUID (optional)
   * @returns {Promise<Object>}
   */
  async getRoomStatusBreakdown(propertyId) {
    const where = { isActive: true };
    if (propertyId) {
      where.propertyId = propertyId;
    }

    const rooms = await Room.findAll({
      where,
      attributes: ['currentStatus']
    });

    const breakdown = {
      vacant_clean: 0,
      vacant_dirty: 0,
      occupied: 0,
      maintenance: 0,
      blocked: 0,
      total: rooms.length
    };

    rooms.forEach(room => {
      if (breakdown.hasOwnProperty(room.currentStatus)) {
        breakdown[room.currentStatus]++;
      }
    });

    return breakdown;
  }

  /**
   * Calculate daily revenue
   * 
   * @param {Date} startOfDay - Start of day
   * @param {Date} endOfDay - End of day
   * @param {string} propertyId - Property UUID (optional)
   * @returns {Promise<Object>}
   */
  async calculateDailyRevenue(startOfDay, endOfDay, propertyId) {
    const where = {
      actualCheckOutTime: {
        [Op.between]: [startOfDay, endOfDay]
      },
      status: 'completed'
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const completedBookings = await Booking.findAll({
      where,
      attributes: ['totalAmount', 'paidAmount']
    });

    const totalRevenue = completedBookings.reduce(
      (sum, b) => sum + parseFloat(b.paidAmount || 0), 
      0
    );

    const expectedRevenue = completedBookings.reduce(
      (sum, b) => sum + parseFloat(b.totalAmount || 0), 
      0
    );

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      expectedRevenue: Math.round(expectedRevenue * 100) / 100,
      completedBookings: completedBookings.length
    };
  }

  /**
   * Format booking for report output
   * 
   * @param {Booking} booking - Booking instance
   * @returns {Object}
   */
  formatBookingForReport(booking) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      actualCheckInTime: booking.actualCheckInTime,
      actualCheckOutTime: booking.actualCheckOutTime,
      totalAmount: parseFloat(booking.totalAmount),
      paidAmount: parseFloat(booking.paidAmount),
      guests: booking.guests,
      bookingSource: booking.bookingSource,
      room: booking.room ? {
        id: booking.room.id,
        title: booking.room.title,
        roomNumber: booking.room.roomNumber
      } : null,
      guest: booking.guestProfile ? {
        id: booking.guestProfile.id,
        name: booking.guestProfile.name,
        phone: booking.guestProfile.phone,
        email: booking.guestProfile.email
      } : (booking.contactInfo || null),
      property: booking.property ? {
        id: booking.property.id,
        name: booking.property.name
      } : null
    };
  }

  /**
   * Get booking statistics for a date range
   * 
   * @param {Object} options - Report options
   * @returns {Promise<Object>}
   */
  async getBookingStatistics(options = {}) {
    const { startDate, endDate, propertyId } = options;

    const start = new Date(startDate || new Date());
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const where = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    // Get counts by status
    const statusCounts = await Booking.findAll({
      where,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get counts by booking source
    const sourceCounts = await Booking.findAll({
      where,
      attributes: [
        'bookingSource',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['bookingSource'],
      raw: true
    });

    // Get revenue statistics
    const revenueStats = await Booking.findAll({
      where: {
        ...where,
        status: { [Op.in]: ['confirmed', 'completed'] }
      },
      attributes: [
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('SUM', col('paidAmount')), 'collectedRevenue'],
        [fn('AVG', col('totalAmount')), 'averageBookingValue'],
        [fn('COUNT', col('id')), 'totalBookings']
      ],
      raw: true
    });

    return {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      propertyId: propertyId || 'all',
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      bySource: sourceCounts.reduce((acc, item) => {
        acc[item.bookingSource] = parseInt(item.count, 10);
        return acc;
      }, {}),
      revenue: {
        totalRevenue: parseFloat(revenueStats[0]?.totalRevenue || 0),
        collectedRevenue: parseFloat(revenueStats[0]?.collectedRevenue || 0),
        averageBookingValue: parseFloat(revenueStats[0]?.averageBookingValue || 0),
        totalBookings: parseInt(revenueStats[0]?.totalBookings || 0, 10)
      }
    };
  }

  /**
   * Get audit activity report
   * 
   * @param {Object} options - Report options
   * @returns {Promise<Object>}
   */
  async getAuditActivityReport(options = {}) {
    const { startDate, endDate, propertyId } = options;

    const start = new Date(startDate || new Date());
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const where = {
      performedAt: {
        [Op.between]: [start, end]
      }
    };

    // Get counts by action type
    const actionCounts = await BookingAuditLog.findAll({
      where,
      attributes: [
        'action',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Get counts by user
    const userCounts = await BookingAuditLog.findAll({
      where,
      attributes: [
        'performedBy',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['performedBy'],
      raw: true
    });

    return {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      byAction: actionCounts.reduce((acc, item) => {
        acc[item.action] = parseInt(item.count, 10);
        return acc;
      }, {}),
      byUser: userCounts.reduce((acc, item) => {
        acc[item.performedBy || 'system'] = parseInt(item.count, 10);
        return acc;
      }, {}),
      totalActions: actionCounts.reduce((sum, item) => sum + parseInt(item.count, 10), 0)
    };
  }
}

module.exports = new ReportingService();

