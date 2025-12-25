const express = require('express');
const router = express.Router();
const { Territory, User, Lead, Property } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Territory Management Routes
 * Requirements: 4.1, 4.4, 8.3, 3.1, 3.3, 4.2
 */

/**
 * GET /api/internal/territories
 * Get all territories
 * Requirements: 4.1, 4.4, 8.3
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { isActive, regionalManagerId, search, page = 1, limit = 50 } = req.query;

      // Build where clause
      const whereClause = {};

      // Filter by active status
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      // Filter by regional manager
      if (regionalManagerId) {
        whereClause.regionalManagerId = regionalManagerId;
      }

      // Search by name
      if (search) {
        whereClause.name = { [Op.iLike]: `%${search}%` };
      }

      // Role-based filtering
      if (req.user.internalRole === 'regional_manager') {
        // Regional managers can only see their own territories
        whereClause.regionalManagerId = req.user.id;
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch territories
      const { count, rows: territories } = await Territory.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'regionalManager',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: territories
      });
    } catch (error) {
      console.error('Error fetching territories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch territories',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/internal/territories
 * Create territory
 * Requirements: 4.1, 4.4
 */
router.post('/',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTerritories'),
  auditLog('create_territory', 'territory'),
  async (req, res) => {
    try {
      const { name, description, regionalManagerId, boundaries, cities, states, isActive } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Territory name is required'
        });
      }

      // Validate regional manager exists and has correct role
      if (regionalManagerId) {
        const manager = await User.findByPk(regionalManagerId);
        if (!manager) {
          return res.status(404).json({
            success: false,
            message: 'Regional manager not found'
          });
        }
        if (manager.internalRole !== 'regional_manager') {
          return res.status(400).json({
            success: false,
            message: 'User must have regional_manager role'
          });
        }
      }

      // Create territory
      const territory = await Territory.create({
        name,
        description,
        regionalManagerId,
        boundaries,
        cities: cities || [],
        states: states || [],
        isActive: isActive !== undefined ? isActive : true
      });

      // Fetch with associations
      const createdTerritory = await Territory.findByPk(territory.id, {
        include: [
          {
            model: User,
            as: 'regionalManager',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Territory created successfully',
        data: createdTerritory
      });
    } catch (error) {
      console.error('Error creating territory:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Territory name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create territory',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/territories/:id
 * Get territory details
 * Requirements: 4.1, 4.4
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const territory = await Territory.findByPk(id, {
        include: [
          {
            model: User,
            as: 'regionalManager',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own territories'
        });
      }

      res.json({
        success: true,
        data: territory
      });
    } catch (error) {
      console.error('Error fetching territory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch territory',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/territories/:id
 * Update territory
 * Requirements: 4.1, 4.4
 */
router.put('/:id',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTerritories'),
  auditLog('update_territory', 'territory'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, regionalManagerId, boundaries, cities, states, isActive } = req.body;

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Validate regional manager if provided
      if (regionalManagerId) {
        const manager = await User.findByPk(regionalManagerId);
        if (!manager) {
          return res.status(404).json({
            success: false,
            message: 'Regional manager not found'
          });
        }
        if (manager.internalRole !== 'regional_manager') {
          return res.status(400).json({
            success: false,
            message: 'User must have regional_manager role'
          });
        }
      }

      // Update territory
      await territory.update({
        name: name !== undefined ? name : territory.name,
        description: description !== undefined ? description : territory.description,
        regionalManagerId: regionalManagerId !== undefined ? regionalManagerId : territory.regionalManagerId,
        boundaries: boundaries !== undefined ? boundaries : territory.boundaries,
        cities: cities !== undefined ? cities : territory.cities,
        states: states !== undefined ? states : territory.states,
        isActive: isActive !== undefined ? isActive : territory.isActive
      });

      // Fetch updated territory with associations
      const updatedTerritory = await Territory.findByPk(id, {
        include: [
          {
            model: User,
            as: 'regionalManager',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Territory updated successfully',
        data: updatedTerritory
      });
    } catch (error) {
      console.error('Error updating territory:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Territory name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update territory',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/internal/territories/:id
 * Delete territory
 * Requirements: 4.1, 4.4, 8.3
 */
router.delete('/:id',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  requireInternalPermissions('canManageTerritories'),
  auditLog('delete_territory', 'territory'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Check if territory has assigned agents
      const agentsCount = await User.count({
        where: { territoryId: id }
      });

      if (agentsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete territory with ${agentsCount} assigned agent(s). Please reassign agents first.`
        });
      }

      // Check if territory has leads
      const leadsCount = await Lead.count({
        where: { territoryId: id }
      });

      if (leadsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete territory with ${leadsCount} lead(s). Please reassign leads first.`
        });
      }

      await territory.destroy();

      res.json({
        success: true,
        message: 'Territory deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting territory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete territory',
        error: error.message
      });
    }
  }
);

module.exports = router;

/**
 * GET /api/internal/territories/:id/agents
 * Get agents in territory
 * Requirements: 3.1, 4.1
 */
router.get('/:id/agents',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view agents in your own territories'
        });
      }

      // Fetch agents in this territory
      const agents = await User.findAll({
        where: {
          territoryId: id,
          internalRole: 'agent',
          isActive: true
        },
        attributes: ['id', 'name', 'email', 'phone', 'commissionRate', 'last_login_at', 'created_at'],
        order: [['name', 'ASC']]
      });

      res.json({
        success: true,
        count: agents.length,
        data: agents
      });
    } catch (error) {
      console.error('Error fetching territory agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch territory agents',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/internal/territories/:id/assign-agent
 * Assign agent to territory
 * Requirements: 4.1, 4.2
 */
router.post('/:id/assign-agent',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageAgents'),
  auditLog('assign_agent_to_territory', 'territory'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID is required'
        });
      }

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign agents to your own territories'
        });
      }

      // Validate agent exists and has correct role
      const agent = await User.findByPk(agentId);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      if (agent.internalRole !== 'agent') {
        return res.status(400).json({
          success: false,
          message: 'User must have agent role'
        });
      }

      // Assign agent to territory
      await agent.update({ territoryId: id });

      res.json({
        success: true,
        message: 'Agent assigned to territory successfully',
        data: {
          agentId: agent.id,
          agentName: agent.name,
          territoryId: territory.id,
          territoryName: territory.name
        }
      });
    } catch (error) {
      console.error('Error assigning agent to territory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign agent to territory',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/territories/:id/properties
 * Get properties in territory
 * Requirements: 3.3, 4.1
 */
router.get('/:id/properties',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view properties in your own territories'
        });
      }

      // Get all properties in this territory based on location matching
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build location-based query for properties
      const locationConditions = [];
      
      // Match by cities
      if (territory.cities && territory.cities.length > 0) {
        territory.cities.forEach(city => {
          locationConditions.push({
            'location.city': {
              [Op.iLike]: city.trim()
            }
          });
        });
      }
      
      // Match by states
      if (territory.states && territory.states.length > 0) {
        territory.states.forEach(state => {
          locationConditions.push({
            'location.state': {
              [Op.iLike]: state.trim()
            }
          });
        });
      }

      // If no location conditions, return empty result
      if (locationConditions.length === 0) {
        return res.json({
          success: true,
          count: 0,
          page: parseInt(page),
          totalPages: 0,
          data: []
        });
      }

      const { count, rows: properties } = await Property.findAndCountAll({
        where: {
          [Op.and]: [
            {
              approvalStatus: 'approved',
              isActive: true
            },
            {
              [Op.or]: locationConditions
            }
          ]
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: properties
      });
    } catch (error) {
      console.error('Error fetching territory properties:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch territory properties',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/territories/:id/statistics
 * Get territory statistics
 * Requirements: 3.1, 3.3, 4.2
 */
router.get('/:id/statistics',
  protectInternal,
  authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const territory = await Territory.findByPk(id);

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: 'Territory not found'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'regional_manager' && territory.regionalManagerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view statistics for your own territories'
        });
      }

      // Get agent count
      const agentCount = await User.count({
        where: {
          territoryId: id,
          internalRole: 'agent',
          isActive: true
        }
      });

      // Get lead statistics
      const totalLeads = await Lead.count({
        where: { territoryId: id }
      });

      const approvedLeads = await Lead.count({
        where: {
          territoryId: id,
          status: 'approved'
        }
      });

      const pendingLeads = await Lead.count({
        where: {
          territoryId: id,
          status: { [Op.in]: ['contacted', 'in_progress', 'pending_approval'] }
        }
      });

      const rejectedLeads = await Lead.count({
        where: {
          territoryId: id,
          status: 'rejected'
        }
      });

      const lostLeads = await Lead.count({
        where: {
          territoryId: id,
          status: 'lost'
        }
      });

      // Calculate conversion rate
      const conversionRate = totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(2) : 0;

      res.json({
        success: true,
        data: {
          territoryId: id,
          territoryName: territory.name,
          agentCount,
          leads: {
            total: totalLeads,
            approved: approvedLeads,
            pending: pendingLeads,
            rejected: rejectedLeads,
            lost: lostLeads,
            conversionRate: parseFloat(conversionRate)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching territory statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch territory statistics',
        error: error.message
      });
    }
  }
);
