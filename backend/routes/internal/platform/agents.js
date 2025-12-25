const express = require('express');
const router = express.Router();
const { User, Lead, Commission, Territory, sequelize } = require('../../../models');
const { protectInternal, requirePlatformRole } = require('../../../middleware/internalAuth');
const { auditLog } = require('../../../middleware/auditLog');
const { sendEmail } = require('../../../utils/emailService');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Platform Agent Management Routes
 * For managing agents across the platform
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * These routes are accessible only to platform staff (users with internalRole)
 * Property owners attempting to access these routes will receive 403 Forbidden
 */

/**
 * GET /api/internal/platform/agents
 * Get all agents
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/',
  protectInternal,
  requirePlatformRole(),
  async (req, res) => {
    try {
      const { 
        search, 
        territoryId,
        status,
        managerId,
        page = 1, 
        limit = 50 
      } = req.query;

      // Build where clause
      const whereClause = {
        internalRole: 'agent'
      };

      // Search by name or email
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filter by territory
      if (territoryId) {
        whereClause.territoryId = territoryId;
      }

      // Filter by status
      if (status === 'active') {
        whereClause.isActive = true;
      } else if (status === 'inactive') {
        whereClause.isActive = false;
      }

      // Filter by manager
      if (managerId) {
        whereClause.managerId = managerId;
      }

      // Role-based filtering
      if (req.user.internalRole === 'regional_manager') {
        // Regional managers can only see agents in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });
        const territoryIds = territories.map(t => t.id);
        whereClause.territoryId = { [Op.in]: territoryIds };
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch agents
      const { count, rows: agents } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'email', 'phone', 'internalRole',
          'territoryId', 'managerId', 'commissionRate',
          'isActive', 'createdAt', 'lastLoginAt'
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Lead,
            as: 'assignedLeads',
            attributes: ['id', 'status'],
            required: false
          },
          {
            model: Commission,
            as: 'commissions',
            attributes: ['id', 'amount', 'status'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Calculate statistics for each agent
      const agentsWithStats = agents.map(agent => {
        const agentData = agent.toJSON();
        const leads = agentData.assignedLeads || [];
        const commissions = agentData.commissions || [];
        
        agentData.statistics = {
          totalLeads: leads.length,
          approvedLeads: leads.filter(l => l.status === 'approved').length,
          pendingLeads: leads.filter(l => ['contacted', 'in_progress', 'pending_approval'].includes(l.status)).length,
          totalCommissions: commissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
          paidCommissions: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
          pendingCommissions: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
        };

        delete agentData.assignedLeads;
        delete agentData.commissions;
        return agentData;
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: agentsWithStats
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/internal/platform/agents
 * Create new agent
 * Requirements: 6.1, 6.2, 6.3
 */
router.post('/',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager', 'regional_manager'),
  auditLog('create_agent', 'user'),
  async (req, res) => {
    try {
      const { 
        name, 
        email, 
        phone,
        territoryId,
        managerId,
        commissionRate = 0,
        internalPermissions = {},
        sendCredentials = true 
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Validate territory if provided
      if (territoryId) {
        const territory = await Territory.findByPk(territoryId);
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found'
          });
        }

        // Regional managers can only assign agents to their territories
        if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign agents to your own territories'
          });
        }
      }

      // Validate manager if provided
      if (managerId) {
        const manager = await User.findByPk(managerId);
        if (!manager) {
          return res.status(404).json({
            success: false,
            message: 'Manager not found'
          });
        }
        if (!['regional_manager', 'operations_manager', 'platform_admin', 'superuser'].includes(manager.internalRole)) {
          return res.status(400).json({
            success: false,
            message: 'Manager must have a management role'
          });
        }
      }

      // Generate random password
      const generatedPassword = crypto.randomBytes(8).toString('hex');

      // Default agent permissions
      const defaultPermissions = {
        canCreateLeads: true,
        canUpdateLeads: true,
        canViewLeads: true,
        canContactLeads: true,
        canViewCommissions: true,
        ...internalPermissions
      };

      // Create agent
      const agent = await User.create({
        name,
        email,
        phone,
        internalRole: 'agent',
        territoryId,
        managerId: managerId || req.user.id, // Default to current user as manager
        commissionRate,
        internalPermissions: defaultPermissions,
        password: generatedPassword,
        isActive: true,
        isVerified: true
      });

      // Send credentials email if requested
      if (sendCredentials) {
        try {
          await sendEmail({
            to: email,
            subject: 'Welcome to GoRoomz - Agent Account Created',
            html: `
              <h2>Welcome to GoRoomz</h2>
              <p>Hello ${name},</p>
              <p>Your agent account has been created successfully.</p>
              <p><strong>Login Credentials:</strong></p>
              <p>Email: ${email}<br>Password: ${generatedPassword}</p>
              <p>Please login and change your password immediately.</p>
              <p>Best regards,<br>GoRoomz Team</p>
            `
          });
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            internalRole: agent.internalRole,
            territoryId: agent.territoryId,
            commissionRate: agent.commissionRate
          },
          credentials: sendCredentials ? {
            email,
            password: generatedPassword
          } : undefined
        }
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create agent',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/agents/:id
 * Get agent details
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/:id',
  protectInternal,
  requirePlatformRole(),
  async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await User.findOne({
        where: {
          id,
          internalRole: 'agent'
        },
        attributes: { exclude: ['password', 'verificationToken', 'passwordResetToken'] },
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Lead,
            as: 'assignedLeads',
            attributes: ['id', 'propertyName', 'status', 'contactName', 'contactEmail', 'createdAt', 'approvedAt'],
            limit: 50,
            order: [['createdAt', 'DESC']]
          },
          {
            model: Commission,
            as: 'commissions',
            attributes: ['id', 'amount', 'status', 'type', 'createdAt', 'paidAt'],
            limit: 50,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager') {
        const territory = await Territory.findByPk(agent.territoryId);
        if (!territory || territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view agents in your territories'
          });
        }
      }

      const agentData = agent.toJSON();
      const leads = agentData.assignedLeads || [];
      const commissions = agentData.commissions || [];

      // Calculate comprehensive statistics
      agentData.statistics = {
        totalLeads: leads.length,
        approvedLeads: leads.filter(l => l.status === 'approved').length,
        pendingLeads: leads.filter(l => ['contacted', 'in_progress', 'pending_approval'].includes(l.status)).length,
        rejectedLeads: leads.filter(l => l.status === 'rejected').length,
        lostLeads: leads.filter(l => l.status === 'lost').length,
        conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'approved').length / leads.length) * 100).toFixed(2) : 0,
        totalCommissions: commissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
        paidCommissions: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
        pendingCommissions: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
      };

      res.json({
        success: true,
        data: agentData
      });
    } catch (error) {
      console.error('Error fetching agent details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent details',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/agents/:id
 * Update agent
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager', 'regional_manager'),
  auditLog('update_agent', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, 
        email, 
        phone,
        territoryId,
        managerId,
        commissionRate,
        internalPermissions
      } = req.body;

      const agent = await User.findOne({
        where: {
          id,
          internalRole: 'agent'
        }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager') {
        const territory = await Territory.findByPk(agent.territoryId);
        if (!territory || territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update agents in your territories'
          });
        }
      }

      // Check if email is being changed and if it's already in use
      if (email && email !== agent.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use'
          });
        }
      }

      // Validate territory if being changed
      if (territoryId && territoryId !== agent.territoryId) {
        const territory = await Territory.findByPk(territoryId);
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found'
          });
        }

        // Regional managers can only assign to their territories
        if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign agents to your own territories'
          });
        }
      }

      // Validate manager if being changed
      if (managerId && managerId !== agent.managerId) {
        const manager = await User.findByPk(managerId);
        if (!manager) {
          return res.status(404).json({
            success: false,
            message: 'Manager not found'
          });
        }
        if (!['regional_manager', 'operations_manager', 'platform_admin', 'superuser'].includes(manager.internalRole)) {
          return res.status(400).json({
            success: false,
            message: 'Manager must have a management role'
          });
        }
      }

      // Update fields
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (territoryId) updateData.territoryId = territoryId;
      if (managerId) updateData.managerId = managerId;
      if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
      if (internalPermissions) {
        updateData.internalPermissions = {
          ...agent.internalPermissions,
          ...internalPermissions
        };
      }

      await agent.update(updateData);

      res.json({
        success: true,
        message: 'Agent updated successfully',
        data: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          territoryId: agent.territoryId,
          commissionRate: agent.commissionRate
        }
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update agent',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/agents/:id/deactivate
 * Deactivate agent account
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/deactivate',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  auditLog('deactivate_agent', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const agent = await User.findOne({
        where: {
          id,
          internalRole: 'agent'
        }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      // Deactivate agent account
      await agent.update({ isActive: false });

      // Send notification email
      try {
        await sendEmail({
          to: agent.email,
          subject: 'Account Deactivation Notice',
          html: `
            <h2>Account Deactivation</h2>
            <p>Hello ${agent.name},</p>
            <p>Your agent account has been deactivated.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is an error, please contact your manager.</p>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending deactivation email:', emailError);
      }

      res.json({
        success: true,
        message: 'Agent deactivated successfully',
        data: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          isActive: false
        }
      });
    } catch (error) {
      console.error('Error deactivating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate agent',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/agents/:id/activate
 * Reactivate agent account
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/activate',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  auditLog('activate_agent', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await User.findOne({
        where: {
          id,
          internalRole: 'agent'
        }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      // Reactivate agent account
      await agent.update({ isActive: true });

      // Send notification email
      try {
        await sendEmail({
          to: agent.email,
          subject: 'Account Reactivation Notice',
          html: `
            <h2>Account Reactivation</h2>
            <p>Hello ${agent.name},</p>
            <p>Your agent account has been reactivated.</p>
            <p>You can now login and continue your work.</p>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending reactivation email:', emailError);
      }

      res.json({
        success: true,
        message: 'Agent activated successfully',
        data: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error activating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate agent',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/agents/statistics/overview
 * Get platform-wide agent statistics
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/statistics/overview',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  async (req, res) => {
    try {
      // Get total agents
      const totalAgents = await User.count({
        where: { internalRole: 'agent' }
      });

      // Get active agents
      const activeAgents = await User.count({
        where: {
          internalRole: 'agent',
          isActive: true
        }
      });

      // Get agents by territory
      const agentsByTerritory = await User.findAll({
        where: {
          internalRole: 'agent',
          territoryId: { [Op.ne]: null }
        },
        attributes: [
          'territoryId',
          [sequelize.fn('COUNT', sequelize.col('User.id')), 'count']
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['name']
          }
        ],
        group: ['territoryId', 'territory.id', 'territory.name'],
        order: [[sequelize.fn('COUNT', sequelize.col('User.id')), 'DESC']],
        limit: 10
      });

      // Get total leads and commissions
      const allAgents = await User.findAll({
        where: { internalRole: 'agent' },
        attributes: ['id'],
        include: [
          {
            model: Lead,
            as: 'assignedLeads',
            attributes: ['id', 'status']
          },
          {
            model: Commission,
            as: 'commissions',
            attributes: ['id', 'amount', 'status']
          }
        ]
      });

      const allLeads = allAgents.flatMap(a => a.assignedLeads || []);
      const allCommissions = allAgents.flatMap(a => a.commissions || []);

      res.json({
        success: true,
        data: {
          totalAgents,
          activeAgents,
          inactiveAgents: totalAgents - activeAgents,
          agentsByTerritory: agentsByTerritory.map(a => ({
            territoryId: a.territoryId,
            territoryName: a.territory?.name || 'Unknown',
            count: parseInt(a.dataValues.count)
          })),
          leadStatistics: {
            totalLeads: allLeads.length,
            approvedLeads: allLeads.filter(l => l.status === 'approved').length,
            pendingLeads: allLeads.filter(l => ['contacted', 'in_progress', 'pending_approval'].includes(l.status)).length,
            conversionRate: allLeads.length > 0 ? ((allLeads.filter(l => l.status === 'approved').length / allLeads.length) * 100).toFixed(2) : 0
          },
          commissionStatistics: {
            totalCommissions: allCommissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
            paidCommissions: allCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
            pendingCommissions: allCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching agent statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
