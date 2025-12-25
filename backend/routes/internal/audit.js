const express = require('express');
const { Op } = require('sequelize');
const { AuditLog, User } = require('../../models');
const { authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * Audit Log Management Routes
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */

/**
 * GET /api/internal/audit
 * Get audit logs with filtering and pagination
 * Access: superuser, platform_admin
 * Requirements: 21.1, 21.2
 */
router.get('/', 
  authorizeInternalRoles('superuser', 'platform_admin'),
  requireInternalPermissions('canViewAuditLogs'),
  auditLog('view_audit_logs', 'audit_log'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        resourceType,
        resourceId,
        isCritical,
        startDate,
        endDate,
        search
      } = req.query;

      // Build where clause
      const where = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = { [Op.iLike]: `%${action}%` };
      }

      if (resourceType) {
        where.resourceType = resourceType;
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (isCritical !== undefined) {
        where.isCritical = isCritical === 'true';
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Search across multiple fields
      if (search) {
        where[Op.or] = [
          { action: { [Op.iLike]: `%${search}%` } },
          { resourceType: { [Op.iLike]: `%${search}%` } },
          { resourceId: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Calculate offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get audit logs with user information
      const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole', 'role'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/internal/audit/:id
 * Get specific audit entry
 * Access: superuser, platform_admin
 * Requirements: 21.2
 */
router.get('/:id',
  authorizeInternalRoles('superuser', 'platform_admin'),
  requireInternalPermissions('canViewAuditLogs'),
  auditLog('view_audit_entry', 'audit_log', {
    getResourceId: (req) => req.params.id
  }),
  async (req, res) => {
    try {
      const { id } = req.params;

      const auditEntry = await AuditLog.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole', 'role'],
            required: false
          }
        ]
      });

      if (!auditEntry) {
        return res.status(404).json({
          success: false,
          message: 'Audit entry not found'
        });
      }

      res.json({
        success: true,
        data: auditEntry
      });
    } catch (error) {
      console.error('Error fetching audit entry:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit entry',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/internal/audit/user/:userId
 * Get user activity logs
 * Access: superuser, platform_admin
 * Requirements: 21.2, 21.4
 */
router.get('/user/:userId',
  authorizeInternalRoles('superuser', 'platform_admin'),
  requireInternalPermissions('canViewAuditLogs'),
  auditLog('view_user_activity', 'audit_log', {
    getResourceId: (req) => req.params.userId
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 50,
        action,
        resourceType,
        startDate,
        endDate
      } = req.query;

      // Verify user exists
      const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'internalRole', 'role']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Build where clause
      const where = { userId };

      if (action) {
        where.action = { [Op.iLike]: `%${action}%` };
      }

      if (resourceType) {
        where.resourceType = resourceType;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Calculate offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get user's audit logs
      const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        success: true,
        data: {
          user,
          auditLogs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/internal/audit/resource/:resourceType/:resourceId
 * Get resource history
 * Access: superuser, platform_admin
 * Requirements: 21.2, 21.4
 */
router.get('/resource/:resourceType/:resourceId',
  authorizeInternalRoles('superuser', 'platform_admin'),
  requireInternalPermissions('canViewAuditLogs'),
  auditLog('view_resource_history', 'audit_log', {
    getResourceId: (req) => req.params.resourceId
  }),
  async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;
      const {
        page = 1,
        limit = 50,
        action,
        userId,
        startDate,
        endDate
      } = req.query;

      // Build where clause
      const where = {
        resourceType,
        resourceId
      };

      if (action) {
        where.action = { [Op.iLike]: `%${action}%` };
      }

      if (userId) {
        where.userId = userId;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Calculate offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get resource audit logs
      const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole', 'role'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        success: true,
        data: {
          resourceType,
          resourceId,
          auditLogs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching resource history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/internal/audit/export
 * Export audit logs to CSV
 * Access: superuser, platform_admin
 * Requirements: 21.5
 */
router.post('/export',
  authorizeInternalRoles('superuser', 'platform_admin'),
  requireInternalPermissions('canViewAuditLogs'),
  auditLog('export_audit_logs', 'audit_log'),
  async (req, res) => {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        isCritical,
        startDate,
        endDate,
        format = 'csv'
      } = req.body;

      // Build where clause (same as GET endpoint)
      const where = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = { [Op.iLike]: `%${action}%` };
      }

      if (resourceType) {
        where.resourceType = resourceType;
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (isCritical !== undefined) {
        where.isCritical = isCritical;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Get all matching audit logs (no pagination for export)
      const auditLogs = await AuditLog.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole', 'role'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10000 // Reasonable limit for export
      });

      if (format === 'csv') {
        // Generate CSV content
        const csvHeaders = [
          'ID',
          'User ID',
          'User Name',
          'User Email',
          'User Role',
          'Action',
          'Resource Type',
          'Resource ID',
          'Is Critical',
          'IP Address',
          'User Agent',
          'Changes',
          'Created At'
        ];

        const csvRows = auditLogs.map(log => [
          log.id,
          log.userId || '',
          log.user?.name || '',
          log.user?.email || '',
          log.user?.internalRole || log.user?.role || '',
          log.action,
          log.resourceType,
          log.resourceId || '',
          log.isCritical ? 'Yes' : 'No',
          log.ipAddress || '',
          log.userAgent || '',
          JSON.stringify(log.changes || {}),
          log.createdAt.toISOString()
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        // Set headers for CSV download
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `audit_logs_${timestamp}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // Return JSON format
        res.json({
          success: true,
          data: {
            auditLogs,
            exportedAt: new Date().toISOString(),
            totalRecords: auditLogs.length
          }
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
