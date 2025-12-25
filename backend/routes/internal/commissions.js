const express = require('express');
const router = express.Router();
const { Commission, User, Lead } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Commission Management Routes
 * Requirements: 17.1, 17.2, 17.3, 17.4, 8.1, 8.2, 17.5
 */

/**
 * GET /api/internal/commissions
 * Get commissions (filtered by role)
 * Requirements: 17.1, 17.4
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { status, agentId, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Build where clause
      const whereClause = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by agent
      if (agentId) {
        whereClause.agentId = agentId;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.earnedDate = {};
        if (startDate) {
          whereClause.earnedDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.earnedDate[Op.lte] = new Date(endDate);
        }
      }

      // Role-based filtering
      if (req.user.internalRole === 'agent') {
        // Agents can only see their own commissions
        whereClause.agentId = req.user.id;
      }
      // Regional managers, operations managers, platform admins, and superusers can see all commissions

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch commissions
      const { count, rows: commissions } = await Commission.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName', 'email', 'status']
          }
        ],
        order: [
          ['earnedDate', 'DESC'],
          ['created_at', 'DESC']
        ],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: commissions
      });
    } catch (error) {
      console.error('Error fetching commissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commissions.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/commissions/:id
 * Get commission details
 * Requirements: 17.1
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const commission = await Commission.findByPk(id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'phone', 'internalRole', 'commissionRate']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName', 'email', 'phone', 'propertyType', 'city', 'state', 'status']
          }
        ]
      });

      if (!commission) {
        return res.status(404).json({
          success: false,
          message: 'Commission not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only view their own commissions
        if (commission.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own commissions.'
          });
        }
      }

      res.json({
        success: true,
        data: commission
      });
    } catch (error) {
      console.error('Error fetching commission details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission details.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/commissions/:id
 * Update commission
 * Requirements: 17.2
 */
router.put('/:id',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageCommissions'),
  auditLog('update_commission', 'commission'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, rate, status, notes } = req.body;

      // Find the commission
      const commission = await Commission.findByPk(id);

      if (!commission) {
        return res.status(404).json({
          success: false,
          message: 'Commission not found.'
        });
      }

      // Validate amount if provided
      if (amount !== undefined) {
        if (amount < 0) {
          return res.status(400).json({
            success: false,
            message: 'Commission amount cannot be negative.'
          });
        }
        commission.amount = amount;
      }

      // Validate rate if provided
      if (rate !== undefined) {
        if (rate < 0 || rate > 100) {
          return res.status(400).json({
            success: false,
            message: 'Commission rate must be between 0 and 100.'
          });
        }
        commission.rate = rate;
      }

      // Validate status if provided
      if (status) {
        const validStatuses = ['earned', 'pending_payment', 'paid', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
        }
        commission.status = status;
      }

      // Update notes if provided
      if (notes !== undefined) {
        commission.notes = notes;
      }

      await commission.save();

      // Fetch updated commission with associations
      const updatedCommission = await Commission.findByPk(commission.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Commission updated successfully.',
        data: updatedCommission
      });
    } catch (error) {
      console.error('Error updating commission:', error);

      // Handle validation errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error.',
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update commission.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/commissions/:id/mark-paid
 * Mark commission as paid
 * Requirements: 17.3
 * Implements Property 15: Commission payment recording
 */
router.post('/:id/mark-paid',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageCommissions'),
  auditLog('mark_commission_paid', 'commission'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentDate, paymentMethod, transactionReference, notes } = req.body;

      // Validate required fields (Property 15)
      if (!paymentDate || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment date and payment method are required.'
        });
      }

      // Find the commission
      const commission = await Commission.findByPk(id);

      if (!commission) {
        return res.status(404).json({
          success: false,
          message: 'Commission not found.'
        });
      }

      // Validate commission status
      if (commission.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Commission is already marked as paid.'
        });
      }

      if (commission.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark a cancelled commission as paid.'
        });
      }

      // Update commission (Property 15: record payment date, method, and transaction reference)
      commission.status = 'paid';
      commission.paymentDate = paymentDate;
      commission.paymentMethod = paymentMethod;
      commission.transactionReference = transactionReference || null;
      if (notes) {
        commission.notes = notes;
      }

      await commission.save();

      // Fetch updated commission with associations
      const updatedCommission = await Commission.findByPk(commission.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName']
          }
        ]
      });

      // TODO: Send notification to agent about payment

      res.json({
        success: true,
        message: 'Commission marked as paid successfully.',
        data: updatedCommission
      });
    } catch (error) {
      console.error('Error marking commission as paid:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark commission as paid.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/commissions/agent/:agentId
 * Get agent commissions
 * Requirements: 17.1, 17.4
 */
router.get('/agent/:agentId',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only view their own commissions
        if (agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own commissions.'
          });
        }
      }

      // Verify agent exists
      const agent = await User.findByPk(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found.'
        });
      }

      // Build where clause
      const whereClause = { agentId };

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.earnedDate = {};
        if (startDate) {
          whereClause.earnedDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.earnedDate[Op.lte] = new Date(endDate);
        }
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch commissions
      const { count, rows: commissions } = await Commission.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName', 'email', 'status']
          }
        ],
        order: [
          ['earnedDate', 'DESC'],
          ['created_at', 'DESC']
        ],
        limit: parseInt(limit),
        offset
      });

      // Calculate summary statistics
      const summary = await Commission.findOne({
        where: { agentId },
        attributes: [
          [Commission.sequelize.fn('SUM', Commission.sequelize.literal("CASE WHEN status = 'earned' THEN amount ELSE 0 END")), 'totalEarned'],
          [Commission.sequelize.fn('SUM', Commission.sequelize.literal("CASE WHEN status = 'pending_payment' THEN amount ELSE 0 END")), 'totalPending'],
          [Commission.sequelize.fn('SUM', Commission.sequelize.literal("CASE WHEN status = 'paid' THEN amount ELSE 0 END")), 'totalPaid']
        ],
        raw: true
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        summary: {
          totalEarned: parseFloat(summary.totalEarned || 0),
          totalPending: parseFloat(summary.totalPending || 0),
          totalPaid: parseFloat(summary.totalPaid || 0)
        },
        data: commissions
      });
    } catch (error) {
      console.error('Error fetching agent commissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent commissions.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;

/**
 * GET /api/internal/commissions/pending
 * Get pending payments
 * Requirements: 8.1, 17.5
 */
router.get('/pending',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageCommissions'),
  async (req, res) => {
    try {
      const { agentId, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Build where clause
      const whereClause = {
        status: { [Op.in]: ['earned', 'pending_payment'] }
      };

      // Filter by agent
      if (agentId) {
        whereClause.agentId = agentId;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.earnedDate = {};
        if (startDate) {
          whereClause.earnedDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.earnedDate[Op.lte] = new Date(endDate);
        }
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch pending commissions
      const { count, rows: commissions } = await Commission.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'phone', 'commissionRate']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName', 'email']
          }
        ],
        order: [
          ['earnedDate', 'ASC'],
          ['created_at', 'ASC']
        ],
        limit: parseInt(limit),
        offset
      });

      // Calculate total pending amount
      const totalPending = await Commission.sum('amount', {
        where: whereClause
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalPendingAmount: parseFloat(totalPending || 0),
        data: commissions
      });
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending commissions.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/commissions/bulk-pay
 * Process bulk payments
 * Requirements: 8.1, 17.5
 */
router.post('/bulk-pay',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageCommissions'),
  auditLog('bulk_pay_commissions', 'commission'),
  async (req, res) => {
    try {
      const { commissionIds, paymentDate, paymentMethod, transactionReference, notes } = req.body;

      // Validate required fields
      if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Commission IDs array is required and must not be empty.'
        });
      }

      if (!paymentDate || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment date and payment method are required.'
        });
      }

      // Find all commissions
      const commissions = await Commission.findAll({
        where: {
          id: { [Op.in]: commissionIds }
        }
      });

      if (commissions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No commissions found with the provided IDs.'
        });
      }

      // Validate all commissions can be paid
      const invalidCommissions = commissions.filter(c => c.status === 'paid' || c.status === 'cancelled');
      if (invalidCommissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot process payment for ${invalidCommissions.length} commission(s) that are already paid or cancelled.`,
          invalidCommissionIds: invalidCommissions.map(c => c.id)
        });
      }

      // Update all commissions
      const updatePromises = commissions.map(commission => {
        commission.status = 'paid';
        commission.paymentDate = paymentDate;
        commission.paymentMethod = paymentMethod;
        commission.transactionReference = transactionReference || null;
        if (notes) {
          commission.notes = notes;
        }
        return commission.save();
      });

      await Promise.all(updatePromises);

      // Calculate total amount paid
      const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

      // Fetch updated commissions with associations
      const updatedCommissions = await Commission.findAll({
        where: {
          id: { [Op.in]: commissionIds }
        },
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName']
          }
        ]
      });

      // TODO: Send notifications to agents about payments

      res.json({
        success: true,
        message: `Successfully processed payment for ${commissions.length} commission(s).`,
        totalAmount,
        processedCount: commissions.length,
        data: updatedCommissions
      });
    } catch (error) {
      console.error('Error processing bulk payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk payments.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/commissions/rates
 * Configure commission rates
 * Requirements: 8.1, 8.2
 * Implements Property 17: Historical commission immutability
 */
router.put('/rates',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageSystemSettings'),
  auditLog('update_commission_rates', 'commission'),
  async (req, res) => {
    try {
      const { agentId, newRate } = req.body;

      // Validate required fields
      if (!agentId || newRate === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID and new rate are required.'
        });
      }

      // Validate rate
      if (newRate < 0 || newRate > 100) {
        return res.status(400).json({
          success: false,
          message: 'Commission rate must be between 0 and 100.'
        });
      }

      // Find the agent
      const agent = await User.findByPk(agentId);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found.'
        });
      }

      if (agent.internalRole !== 'agent') {
        return res.status(400).json({
          success: false,
          message: 'User is not an agent.'
        });
      }

      // Store old rate for response
      const oldRate = agent.commissionRate;

      // Update agent's commission rate (Property 17: existing commissions remain unchanged)
      agent.commissionRate = newRate;
      await agent.save();

      res.json({
        success: true,
        message: 'Commission rate updated successfully. This will apply to future commissions only.',
        data: {
          agentId: agent.id,
          agentName: agent.name,
          oldRate: parseFloat(oldRate || 0),
          newRate: parseFloat(newRate)
        }
      });
    } catch (error) {
      console.error('Error updating commission rates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update commission rates.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
