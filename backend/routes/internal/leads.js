const express = require('express');
const router = express.Router();
const { Lead, LeadCommunication, User, Territory, Category, Property } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Lead Management Routes
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 12.1, 12.2, 12.4, 18.1, 18.3, 18.4
 */

/**
 * GET /api/internal/leads
 * Get all leads (filtered by role/territory)
 * Requirements: 1.1, 2.1, 2.2
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { status, territoryId, agentId, search, page = 1, limit = 50, startDate, endDate } = req.query;

      // Build where clause
      const whereClause = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by territory
      if (territoryId) {
        whereClause.territoryId = territoryId;
      }

      // Filter by agent
      if (agentId) {
        whereClause.agentId = agentId;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) {
          whereClause.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.created_at[Op.lte] = new Date(endDate);
        }
      }

      // Search by property owner name, email, or business name
      if (search) {
        whereClause[Op.or] = [
          { propertyOwnerName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { businessName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Role-based filtering
      if (req.user.internalRole === 'agent') {
        // Agents can only see their own leads
        whereClause.agentId = req.user.id;
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can see leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (territoryIds.length > 0) {
          whereClause.territoryId = { [Op.in]: territoryIds };
        } else {
          // If no territories, return empty result
          return res.json({
            success: true,
            count: 0,
            page: parseInt(page),
            totalPages: 0,
            data: []
          });
        }
      }
      // Operations managers, platform admins, and superusers can see all leads

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch leads
      const { count, rows: leads } = await Lead.findAndCountAll({
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
            attributes: ['id', 'name', 'regionalManagerId']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [
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
        data: leads
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leads.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/leads
 * Create new lead
 * Requirements: 1.1, 1.2
 * Implements Property 5: Required field validation
 * Implements Property 6: Agent attribution
 */
router.post('/',
  protectInternal,
  requireInternalPermissions('canOnboardProperties'),
  auditLog('create_lead', 'lead'),
  async (req, res) => {
    try {
      const {
        propertyOwnerName,
        email,
        phone,
        businessName,
        propertyType,
        address,
        city,
        state,
        country,
        estimatedRooms,
        source,
        territoryId,
        expectedCloseDate,
        notes
      } = req.body;

      // Validate required fields (Property 5)
      if (!propertyOwnerName || !email || !phone || !propertyType || !city || !state) {
        return res.status(400).json({
          success: false,
          message: 'Property owner name, email, phone, property type, city, and state are required.'
        });
      }

      // Validate property type
      if (!['hotel', 'pg'].includes(propertyType)) {
        return res.status(400).json({
          success: false,
          message: 'Property type must be either "hotel" or "pg".'
        });
      }

      // Check if lead with this email already exists
      const existingLead = await Lead.findOne({
        where: {
          email: email.toLowerCase(),
          status: { [Op.notIn]: ['rejected', 'lost'] }
        }
      });

      if (existingLead) {
        return res.status(400).json({
          success: false,
          message: 'A lead with this email already exists and is active.'
        });
      }

      // Validate territory if provided
      let assignedTerritoryId = territoryId;
      if (territoryId) {
        const territory = await Territory.findByPk(territoryId);
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found.'
          });
        }
      } else if (req.user.territoryId) {
        // Auto-assign agent's territory if not specified
        assignedTerritoryId = req.user.territoryId;
      }

      // Create the lead (Property 6: Agent attribution)
      const lead = await Lead.create({
        propertyOwnerName,
        email: email.toLowerCase(),
        phone,
        businessName: businessName || null,
        propertyType,
        address: address || null,
        city,
        state,
        country: country || 'India',
        estimatedRooms: estimatedRooms || null,
        status: 'contacted',
        source: source || null,
        agentId: req.user.id, // Agent attribution
        territoryId: assignedTerritoryId || null,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes || null
      });

      // Fetch the created lead with associations
      const createdLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'regionalManagerId']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Lead created successfully.',
        data: createdLead
      });
    } catch (error) {
      console.error('Error creating lead:', error);

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
        message: 'Failed to create lead.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/leads/:id
 * Get lead details
 * Requirements: 2.3
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const lead = await Lead.findByPk(id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'phone', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description', 'regionalManagerId']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only view their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own leads.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can view leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only view leads in your territories.'
          });
        }
      }

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      console.error('Error fetching lead details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lead details.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/leads/:id
 * Update lead
 * Requirements: 2.3
 */
router.put('/:id',
  protectInternal,
  requireInternalPermissions('canOnboardProperties'),
  auditLog('update_lead', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        propertyOwnerName,
        email,
        phone,
        businessName,
        propertyType,
        address,
        city,
        state,
        country,
        estimatedRooms,
        source,
        territoryId,
        expectedCloseDate,
        notes
      } = req.body;

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only update their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own leads.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can update leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only update leads in your territories.'
          });
        }
      }

      // Prevent updating approved or rejected leads
      if (lead.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update an approved lead.'
        });
      }

      // Check email uniqueness if being changed
      if (email && email.toLowerCase() !== lead.email) {
        const existingLead = await Lead.findOne({
          where: {
            email: email.toLowerCase(),
            id: { [Op.ne]: id },
            status: { [Op.notIn]: ['rejected', 'lost'] }
          }
        });

        if (existingLead) {
          return res.status(400).json({
            success: false,
            message: 'A lead with this email already exists and is active.'
          });
        }
        lead.email = email.toLowerCase();
      }

      // Validate property type if being changed
      if (propertyType && !['hotel', 'pg'].includes(propertyType)) {
        return res.status(400).json({
          success: false,
          message: 'Property type must be either "hotel" or "pg".'
        });
      }

      // Validate territory if provided
      if (territoryId !== undefined) {
        if (territoryId) {
          const territory = await Territory.findByPk(territoryId);
          if (!territory) {
            return res.status(404).json({
              success: false,
              message: 'Territory not found.'
            });
          }
        }
        lead.territoryId = territoryId;
      }

      // Update fields
      if (propertyOwnerName) lead.propertyOwnerName = propertyOwnerName;
      if (phone) lead.phone = phone;
      if (businessName !== undefined) lead.businessName = businessName;
      if (propertyType) lead.propertyType = propertyType;
      if (address !== undefined) lead.address = address;
      if (city) lead.city = city;
      if (state) lead.state = state;
      if (country) lead.country = country;
      if (estimatedRooms !== undefined) lead.estimatedRooms = estimatedRooms;
      if (source !== undefined) lead.source = source;
      if (expectedCloseDate !== undefined) lead.expectedCloseDate = expectedCloseDate;
      if (notes !== undefined) lead.notes = notes;

      await lead.save();

      // Fetch updated lead with associations
      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Lead updated successfully.',
        data: updatedLead
      });
    } catch (error) {
      console.error('Error updating lead:', error);

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
        message: 'Failed to update lead.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/internal/leads/:id
 * Delete lead
 * Requirements: 2.1
 */
router.delete('/:id',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'platform_admin', 'superuser'),
  auditLog('delete_lead', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only delete their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete your own leads.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can delete leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete leads in your territories.'
          });
        }
      }

      // Prevent deleting approved leads
      if (lead.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete an approved lead. Approved leads are part of the permanent record.'
        });
      }

      // Delete the lead
      await lead.destroy();

      res.json({
        success: true,
        message: 'Lead deleted successfully.',
        data: {
          id: lead.id,
          propertyOwnerName: lead.propertyOwnerName,
          email: lead.email
        }
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete lead.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;

/**
 * PUT /api/internal/leads/:id/status
 * Update lead status
 * Requirements: 2.4
 * Implements Property 8: Lead status timestamp
 */
router.put('/:id/status',
  protectInternal,
  requireInternalPermissions('canOnboardProperties'),
  auditLog('update_lead_status', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      // Validate status
      const validStatuses = ['contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only update their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own leads.'
          });
        }

        // Agents cannot approve leads
        if (status === 'approved') {
          return res.status(403).json({
            success: false,
            message: 'Agents cannot approve leads. Submit for approval instead.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can update leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only update leads in your territories.'
          });
        }
      }

      // Validate rejection reason if status is rejected
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a lead.'
        });
      }

      // Update status (Property 8: timestamp is automatically recorded by Sequelize updatedAt)
      lead.status = status;

      if (status === 'rejected') {
        lead.rejectionReason = rejectionReason;
      }

      await lead.save();

      // Fetch updated lead with associations
      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Lead status updated successfully.',
        data: updatedLead
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update lead status.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/leads/:id/communications
 * Add communication to lead
 * Requirements: 12.1, 12.2
 */
router.post('/:id/communications',
  protectInternal,
  requireInternalPermissions('canOnboardProperties'),
  auditLog('add_lead_communication', 'lead_communication'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, subject, content, scheduledAt, completedAt } = req.body;

      // Validate required fields
      if (!type || !content) {
        return res.status(400).json({
          success: false,
          message: 'Communication type and content are required.'
        });
      }

      // Validate type
      const validTypes = ['call', 'email', 'meeting', 'note'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid communication type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only add communications to their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only add communications to your own leads.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can add communications to leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only add communications to leads in your territories.'
          });
        }
      }

      // Create the communication
      const communication = await LeadCommunication.create({
        leadId: id,
        userId: req.user.id,
        type,
        subject: subject || null,
        content,
        scheduledAt: scheduledAt || null,
        completedAt: completedAt || null
      });

      // Fetch the created communication with user details
      const createdCommunication = await LeadCommunication.findByPk(communication.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Communication added successfully.',
        data: createdCommunication
      });
    } catch (error) {
      console.error('Error adding communication:', error);

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
        message: 'Failed to add communication.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/leads/:id/communications
 * Get communication history for a lead
 * Requirements: 12.1, 12.4
 */
router.get('/:id/communications',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, startDate, endDate } = req.query;

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only view communications for their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view communications for your own leads.'
          });
        }
      } else if (req.user.internalRole === 'regional_manager') {
        // Regional managers can view communications for leads in their territories
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(lead.territoryId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only view communications for leads in your territories.'
          });
        }
      }

      // Build where clause
      const whereClause = { leadId: id };

      // Filter by type
      if (type) {
        whereClause.type = type;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) {
          whereClause.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.created_at[Op.lte] = new Date(endDate);
        }
      }

      // Fetch communications
      const communications = await LeadCommunication.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [
          ['created_at', 'DESC']
        ]
      });

      res.json({
        success: true,
        count: communications.length,
        data: communications
      });
    } catch (error) {
      console.error('Error fetching communications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch communications.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/leads/:id/submit-approval
 * Submit lead for approval
 * Requirements: 18.1
 * Implements Property 12: Approval workflow
 */
router.post('/:id/submit-approval',
  protectInternal,
  requireInternalPermissions('canOnboardProperties'),
  auditLog('submit_lead_approval', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the lead
      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'agent') {
        // Agents can only submit their own leads
        if (lead.agentId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only submit your own leads for approval.'
          });
        }
      }

      // Validate lead status
      if (lead.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Lead is already approved.'
        });
      }

      if (lead.status === 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Lead is already pending approval.'
        });
      }

      // Update status to pending_approval
      lead.status = 'pending_approval';
      await lead.save();

      // Fetch updated lead with associations
      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'regionalManagerId'],
            include: [
              {
                model: User,
                as: 'regionalManager',
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ]
      });

      // TODO: Send notification to regional manager

      res.json({
        success: true,
        message: 'Lead submitted for approval successfully.',
        data: updatedLead
      });
    } catch (error) {
      console.error('Error submitting lead for approval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit lead for approval.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/leads/:id/approve
 * Approve onboarding (regional manager)
 * Requirements: 18.3
 * Implements Property 12: Approval workflow
 */
router.post('/:id/approve',
  protectInternal,
  requireInternalPermissions('canApproveOnboardings'),
  auditLog('approve_lead', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the lead
      const lead = await Lead.findByPk(id, {
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'regionalManagerId']
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'regional_manager') {
        // Regional managers can only approve leads in their territories
        if (!lead.territory || lead.territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only approve leads in your territories.'
          });
        }
      }

      // Validate lead status
      if (lead.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Lead must be in pending_approval status to be approved.'
        });
      }

      // Create property owner account
      const crypto = require('crypto');
      const { sendEmail } = require('../../utils/emailService');
      const { Property, Category } = require('../../models');
      
      const generatedPassword = crypto.randomBytes(8).toString('hex');
      
      // Check if owner already exists
      let propertyOwner = await User.findOne({ where: { email: lead.email } });
      
      if (!propertyOwner) {
        propertyOwner = await User.create({
          name: lead.propertyOwnerName,
          email: lead.email,
          phone: lead.phone,
          role: 'owner',
          password: generatedPassword,
          isVerified: true
        });

        // Send credentials email
        try {
          await sendEmail({
            to: lead.email,
            subject: 'Welcome to GoRoomz - Your Account Credentials',
            html: `
              <h2>Welcome to GoRoomz</h2>
              <p>Hello ${lead.propertyOwnerName},</p>
              <p>Your property onboarding has been approved! Here are your login credentials:</p>
              <p><strong>Email:</strong> ${lead.email}<br>
              <strong>Password:</strong> ${generatedPassword}</p>
              <p>Please login and complete your property setup.</p>
            `
          });
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
        }
      }

      // Create property
      let property = null;
      if (lead.businessName && lead.propertyType) {
        // Find or create default category based on property type
        let category = await Category.findOne({ 
          where: { 
            name: {
              [Op.iLike]: `%${lead.propertyType}%`
            }
          } 
        });
        
        if (!category) {
          // Create a default category for this property type
          const categoryName = lead.propertyType === 'pg' ? 'PG Accommodation' : 
                              lead.propertyType === 'hotel' ? 'Hotel' : 
                              lead.propertyType.charAt(0).toUpperCase() + lead.propertyType.slice(1);
          
          category = await Category.create({
            name: categoryName,
            description: `Default category for ${lead.propertyType} properties`,
            isActive: true,
            sortOrder: 0
          });
        }

        // Map property type
        const typeMap = {
          'Hotel': 'hotel',
          'PG': 'pg',
          'Hostel': 'hostel',
          'Homestay': 'homestay',
          'Apartment': 'apartment'
        };
        const propertyType = typeMap[lead.propertyType] || lead.propertyType.toLowerCase();

        property = await Property.create({
          ownerId: propertyOwner.id,
          name: lead.businessName,
          description: `Property created from lead approval. Estimated ${lead.estimatedRooms || 0} rooms.`,
          type: propertyType,
          categoryId: category.id,
          location: {
            address: lead.address || '',
            city: lead.city || '',
            state: lead.state || '',
            country: lead.country || 'India'
          },
          amenities: [],
          rules: [],
          isActive: true,
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: req.user.id
        });
      }

      // Update lead status
      lead.status = 'approved';
      lead.approvedAt = new Date();
      lead.approvedBy = req.user.id;
      await lead.save();

      // Fetch updated lead with associations
      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      // TODO: Create commission record for agent
      // TODO: Send notification to agent

      res.json({
        success: true,
        message: 'Lead approved successfully. Property owner account and property have been created.',
        data: {
          lead: updatedLead,
          propertyOwner: {
            id: propertyOwner.id,
            name: propertyOwner.name,
            email: propertyOwner.email
          },
          property: property ? {
            id: property.id,
            name: property.name,
            type: property.type
          } : null,
          credentials: {
            email: lead.email,
            password: generatedPassword
          }
        }
      });
    } catch (error) {
      console.error('Error approving lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve lead.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/leads/:id/reject
 * Reject onboarding (regional manager)
 * Requirements: 18.4
 * Implements Property 13: Rejection requires reason
 */
router.post('/:id/reject',
  protectInternal,
  requireInternalPermissions('canApproveOnboardings'),
  auditLog('reject_lead', 'lead'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      // Validate rejection reason (Property 13)
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a lead.'
        });
      }

      // Find the lead
      const lead = await Lead.findByPk(id, {
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'regionalManagerId']
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.'
        });
      }

      // Check access permissions
      if (req.user.internalRole === 'regional_manager') {
        // Regional managers can only reject leads in their territories
        if (!lead.territory || lead.territory.regionalManagerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only reject leads in your territories.'
          });
        }
      }

      // Validate lead status
      if (lead.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Lead must be in pending_approval status to be rejected.'
        });
      }

      // Update status to rejected with reason
      lead.status = 'rejected';
      lead.rejectionReason = rejectionReason;
      await lead.save();

      // Fetch updated lead with associations
      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          }
        ]
      });

      // TODO: Send notification to agent with rejection reason

      res.json({
        success: true,
        message: 'Lead rejected successfully.',
        data: updatedLead
      });
    } catch (error) {
      console.error('Error rejecting lead:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject lead.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
