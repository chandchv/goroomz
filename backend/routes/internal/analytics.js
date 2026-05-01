/**
 * Analytics Routes for Internal Management System
 * 
 * Handles platform analytics, property health metrics, and audit logs
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { sequelize } = require('../../models');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');

const router = express.Router();

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

module.exports = router;
