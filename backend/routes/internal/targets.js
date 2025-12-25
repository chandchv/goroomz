const express = require('express');
const router = express.Router();
const { AgentTarget, User, Territory, Lead, AuditLog } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Agent Target Management Routes
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

/**
 * GET /api/internal/targets
 * Get targets (filtered by role)
 * Requirements: 24.1
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { agentId, territoryId, period, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Build where clause
      const whereClause = {};

      // Filter by agent
      if (agentId) {
        whereClause.agentId = agentId;
      }

      // Filter by territory
      if (territoryId) {
        whereClause.territoryId = territoryId;
      }

      // Filter by period
      if (period) {
        whereClause.period = period;
      }

      // Date range filter
      if (startDate || endDate) {
        if (startDate) {
          whereClause.startDate = whereClause.startDate || {};
          whereClause.startDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.endDate = whereClause.endDate || {};
          whereClause.endDate[Op.lte] = new Date(endDate);
        }
      }

      // Role-based filtering
      if (req.user.internalRole === 'agent') {
        // Agents can only see their own targets
        whereClause.agentId = req.user.id;
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can see targets for agents in their territory
        const agents = await User.findAll({
          where: {
            managerId: req.user.id,
            internalRole: 'agent'
          },
          attributes: ['id']
        });
        const agentIds = agents.map(a => a.id);
        whereClause.agentId = { [Op.in]: agentIds };
      }
      // Operations managers, platform admins, and superusers can see all targets

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch targets
      const { count, rows: targets } = await AgentTarget.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'setter',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [
          ['startDate', 'DESC'],
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
        data: targets
      });
    } catch (error) {
      console.error('Error fetching targets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch targets.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/targets
 * Set target for agent
 * Requirements: 24.1, 24.2
 */
router.post('/',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageAgents'),
  auditLog('create_target'),
  async (req, res) => {
    try {
      const {
        agentId,
        territoryId,
        period,
        startDate,
        endDate,
        targetProperties,
        targetRevenue
      } = req.body;

      // Validate required fields
      if (!agentId || !period || !startDate || !endDate || targetProperties === undefined || targetRevenue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: agentId, period, startDate, endDate, targetProperties, targetRevenue'
        });
      }

      // Verify agent exists and is an agent
      const agent = await User.findOne({
        where: {
          id: agentId,
          internalRole: 'agent'
        }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found or user is not an agent.'
        });
      }

      // If regional manager, verify agent is in their team
      if (req.user.internalRole === 'regional_manager') {
        if (agent.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only set targets for agents in your team.'
          });
        }
      }

      // Verify territory exists if provided
      if (territoryId) {
        const territory = await Territory.findByPk(territoryId);
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found.'
          });
        }
      }

      // Create target
      const target = await AgentTarget.create({
        agentId,
        territoryId,
        period,
        startDate,
        endDate,
        targetProperties: parseInt(targetProperties),
        targetRevenue: parseFloat(targetRevenue),
        actualProperties: 0,
        actualRevenue: 0,
        setBy: req.user.id
      });

      // Fetch complete target with associations
      const completeTarget = await AgentTarget.findByPk(target.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'setter',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Target created successfully.',
        data: completeTarget
      });
    } catch (error) {
      console.error('Error creating target:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create target.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/targets/:id
 * Get target details
 * Requirements: 24.3
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const target = await AgentTarget.findByPk(id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'setter',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Target not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'agent' && target.agentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own targets.'
        });
      }

      if (req.user.internalRole === 'regional_manager') {
        // Verify agent is in their team
        const agent = await User.findByPk(target.agentId);
        if (agent.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view targets for agents in your team.'
          });
        }
      }

      // Calculate progress percentage
      const progressPercentage = target.targetProperties > 0
        ? (target.actualProperties / target.targetProperties) * 100
        : 0;

      const revenueProgressPercentage = target.targetRevenue > 0
        ? (parseFloat(target.actualRevenue) / parseFloat(target.targetRevenue)) * 100
        : 0;

      res.json({
        success: true,
        data: {
          ...target.toJSON(),
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          revenueProgressPercentage: Math.round(revenueProgressPercentage * 100) / 100
        }
      });
    } catch (error) {
      console.error('Error fetching target:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch target.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/targets/:id
 * Update target
 * Requirements: 24.4
 */
router.put('/:id',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageAgents'),
  auditLog('update_target'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        period,
        startDate,
        endDate,
        targetProperties,
        targetRevenue,
        actualProperties,
        actualRevenue
      } = req.body;

      const target = await AgentTarget.findByPk(id);

      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Target not found.'
        });
      }

      // If regional manager, verify agent is in their team
      if (req.user.internalRole === 'regional_manager') {
        const agent = await User.findByPk(target.agentId);
        if (agent.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update targets for agents in your team.'
          });
        }
      }

      // Update fields
      if (period !== undefined) target.period = period;
      if (startDate !== undefined) target.startDate = startDate;
      if (endDate !== undefined) target.endDate = endDate;
      if (targetProperties !== undefined) target.targetProperties = parseInt(targetProperties);
      if (targetRevenue !== undefined) target.targetRevenue = parseFloat(targetRevenue);
      if (actualProperties !== undefined) target.actualProperties = parseInt(actualProperties);
      if (actualRevenue !== undefined) target.actualRevenue = parseFloat(actualRevenue);

      await target.save();

      // Fetch complete target with associations
      const completeTarget = await AgentTarget.findByPk(target.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'setter',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Target updated successfully.',
        data: completeTarget
      });
    } catch (error) {
      console.error('Error updating target:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update target.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/internal/targets/:id
 * Delete target
 * Requirements: 24.4
 */
router.delete('/:id',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageAgents'),
  auditLog('delete_target'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const target = await AgentTarget.findByPk(id);

      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Target not found.'
        });
      }

      // If regional manager, verify agent is in their team
      if (req.user.internalRole === 'regional_manager') {
        const agent = await User.findByPk(target.agentId);
        if (agent.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete targets for agents in your team.'
          });
        }
      }

      await target.destroy();

      res.json({
        success: true,
        message: 'Target deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting target:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete target.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/targets/agent/:agentId
 * Get agent targets
 * Requirements: 24.1, 24.2, 24.5
 */
router.get('/agent/:agentId',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { period, startDate, endDate } = req.query;

      // Verify agent exists
      const agent = await User.findOne({
        where: {
          id: agentId,
          internalRole: 'agent'
        }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found or user is not an agent.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'agent' && agentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own targets.'
        });
      }

      if (req.user.internalRole === 'regional_manager') {
        // Verify agent is in their team
        if (agent.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view targets for agents in your team.'
          });
        }
      }

      // Build where clause
      const whereClause = { agentId };

      if (period) {
        whereClause.period = period;
      }

      if (startDate || endDate) {
        if (startDate) {
          whereClause.startDate = whereClause.startDate || {};
          whereClause.startDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.endDate = whereClause.endDate || {};
          whereClause.endDate[Op.lte] = new Date(endDate);
        }
      }

      // Fetch targets
      const targets = await AgentTarget.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'setter',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [
          ['startDate', 'DESC'],
          ['created_at', 'DESC']
        ]
      });

      // Calculate progress for each target
      const targetsWithProgress = targets.map(target => {
        const progressPercentage = target.targetProperties > 0
          ? (target.actualProperties / target.targetProperties) * 100
          : 0;

        const revenueProgressPercentage = target.targetRevenue > 0
          ? (parseFloat(target.actualRevenue) / parseFloat(target.targetRevenue)) * 100
          : 0;

        return {
          ...target.toJSON(),
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          revenueProgressPercentage: Math.round(revenueProgressPercentage * 100) / 100
        };
      });

      res.json({
        success: true,
        count: targets.length,
        data: targetsWithProgress
      });
    } catch (error) {
      console.error('Error fetching agent targets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent targets.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
