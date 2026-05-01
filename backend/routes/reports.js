/**
 * Reports API Routes
 * 
 * Provides endpoints for daily reports and occupancy reports.
 * Requirements: 10.5, 10.6
 */

const express = require('express');
const router = express.Router();
const reportingService = require('../services/reportingService');
const auditService = require('../services/auditService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * GET /api/reports/daily
 * Get daily check-ins, check-outs, and no-shows report
 * Requirements: 10.5
 * 
 * Query params:
 * - date: Report date (YYYY-MM-DD format, defaults to today)
 * - propertyId: Property UUID (optional)
 */
router.get('/daily', authenticateToken, authorizeRoles('admin', 'owner', 'staff'), async (req, res) => {
  try {
    const { date, propertyId } = req.query;

    const reportDate = date ? new Date(date) : new Date();
    
    // Validate date
    if (isNaN(reportDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const report = await reportingService.getDailyReport({
      date: reportDate,
      propertyId
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/occupancy
 * Get occupancy report by date range
 * Requirements: 10.6
 * 
 * Query params:
 * - startDate: Start date (YYYY-MM-DD format, required)
 * - endDate: End date (YYYY-MM-DD format, required)
 * - propertyId: Property UUID (optional)
 */
router.get('/occupancy', authenticateToken, authorizeRoles('admin', 'owner', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before or equal to endDate'
      });
    }

    // Limit date range to prevent excessive queries
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        error: 'Date range cannot exceed 365 days'
      });
    }

    const report = await reportingService.getOccupancyReport({
      startDate: start,
      endDate: end,
      propertyId
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate occupancy report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/statistics
 * Get booking statistics for a date range
 * 
 * Query params:
 * - startDate: Start date (YYYY-MM-DD format)
 * - endDate: End date (YYYY-MM-DD format)
 * - propertyId: Property UUID (optional)
 */
router.get('/statistics', authenticateToken, authorizeRoles('admin', 'owner', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    const report = await reportingService.getBookingStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      propertyId
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating statistics report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate statistics report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/audit
 * Get audit activity report
 * 
 * Query params:
 * - startDate: Start date (YYYY-MM-DD format)
 * - endDate: End date (YYYY-MM-DD format)
 * - propertyId: Property UUID (optional)
 */
router.get('/audit', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    const report = await reportingService.getAuditActivityReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      propertyId
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/audit/booking/:bookingId
 * Get audit trail for a specific booking
 * 
 * Query params:
 * - limit: Number of records (default 100)
 * - offset: Offset for pagination (default 0)
 * - action: Filter by action type (optional)
 */
router.get('/audit/booking/:bookingId', authenticateToken, authorizeRoles('admin', 'owner', 'staff'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { limit = 100, offset = 0, action } = req.query;

    const auditTrail = await auditService.getAuditTrail(bookingId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      action
    });

    res.json({
      success: true,
      data: {
        bookingId,
        auditTrail,
        pagination: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: auditTrail.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/audit/user/:userId
 * Get audit logs for a specific user
 * 
 * Query params:
 * - limit: Number of records (default 100)
 * - offset: Offset for pagination (default 0)
 * - action: Filter by action type (optional)
 * - startDate: Start date filter (optional)
 * - endDate: End date filter (optional)
 */
router.get('/audit/user/:userId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0, action, startDate, endDate } = req.query;

    const auditLogs = await auditService.getAuditLogsByUser(userId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      data: {
        userId,
        auditLogs,
        pagination: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: auditLogs.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/audit/summary
 * Get summary of audit actions
 * 
 * Query params:
 * - startDate: Start date filter (optional)
 * - endDate: End date filter (optional)
 * - propertyId: Property UUID (optional)
 */
router.get('/audit/summary', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    const summary = await auditService.getAuditSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      propertyId
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit summary',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/room-status
 * Get current room status breakdown
 * 
 * Query params:
 * - propertyId: Property UUID (optional)
 */
router.get('/room-status', authenticateToken, authorizeRoles('admin', 'owner', 'staff'), async (req, res) => {
  try {
    const { propertyId } = req.query;

    const breakdown = await reportingService.getRoomStatusBreakdown(propertyId);

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error fetching room status breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room status breakdown',
      message: error.message
    });
  }
});

module.exports = router;
