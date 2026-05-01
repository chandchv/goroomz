/**
 * Dashboard Routes for Internal Management System
 * 
 * Provides dashboard KPIs, activities, and alerts for the internal management system.
 */

const express = require('express');
const { sequelize } = require('../../models');
const User = require('../../models/User');
const Room = require('../../models/Room');
const Booking = require('../../models/Booking');
const { Op } = require('sequelize');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');

const router = express.Router();

// @desc    Get dashboard KPIs
// @route   GET /api/internal/dashboard/kpis
// @access  Private
router.get('/internal/dashboard/kpis', authenticateUser, requireRoles(), async (req, res) => {
  try {
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
          WHERE payment_status IN ('pending')
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
router.get('/internal/dashboard/activities', authenticateUser, requireRoles(), async (req, res) => {
  try {
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
      if (req.user.role === 'owner') {
        checkInWhereClause.ownerId = req.user.id;
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
      if (req.user.role === 'owner') {
        checkOutWhereClause.ownerId = req.user.id;
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
router.get('/internal/dashboard/alerts', authenticateUser, requireRoles(), async (req, res) => {
  try {
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
            WHERE b.payment_status IN ('pending')
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

      // Get actual maintenance requests (housekeeping_tasks table may not exist yet)
      let pendingMaintenance = [];
      if (propertyId) {
        try {
          // Check if housekeeping_tasks table exists before querying
          const [tableCheck] = await sequelize.query(`
            SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') as exists
          `);
          
          if (tableCheck[0]?.exists) {
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
          }
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

module.exports = router;
