const express = require('express');
const router = express.Router();
const { SupportTicket, TicketResponse, User } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Support Ticket Management Routes
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 */

/**
 * GET /api/internal/tickets
 * Get all tickets (filtered by role)
 * Requirements: 25.2
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { 
        status, 
        category, 
        priority, 
        assignedTo, 
        propertyOwnerId, 
        search, 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate 
      } = req.query;

      // Build where clause
      const whereClause = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by category
      if (category) {
        whereClause.category = category;
      }

      // Filter by priority
      if (priority) {
        whereClause.priority = priority;
      }

      // Filter by assigned user
      if (assignedTo) {
        whereClause.assignedTo = assignedTo;
      }

      // Filter by property owner
      if (propertyOwnerId) {
        whereClause.propertyOwnerId = propertyOwnerId;
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

      // Search by ticket number, title, or description
      if (search) {
        whereClause[Op.or] = [
          { ticketNumber: { [Op.iLike]: `%${search}%` } },
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Role-based filtering
      if (req.user.internalRole === 'operations_manager') {
        // Operations managers can see tickets assigned to them or unassigned tickets
        whereClause[Op.or] = [
          { assignedTo: req.user.id },
          { assignedTo: null }
        ];
      }
      // Platform admins and superusers can see all tickets

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch tickets
      const { count, rows: tickets } = await SupportTicket.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [
          ['priority', 'DESC'], // urgent first
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
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/tickets
 * Create ticket
 * Requirements: 25.1
 * Implements Property 38: Ticket creation completeness
 */
router.post('/',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('create_ticket', 'ticket'),
  async (req, res) => {
    try {
      const {
        propertyOwnerId,
        propertyId,
        title,
        description,
        category = 'other',
        priority = 'medium'
      } = req.body;

      // Validate required fields (Property 38: Ticket creation completeness)
      if (!propertyOwnerId || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: propertyOwnerId, title, and description are required.'
        });
      }

      // Validate property owner exists
      const propertyOwner = await User.findByPk(propertyOwnerId);
      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found.'
        });
      }

      // Create ticket
      const ticket = await SupportTicket.create({
        propertyOwnerId,
        propertyId,
        title,
        description,
        category,
        priority,
        createdBy: req.user.id,
        status: 'new'
      });

      // Fetch the created ticket with associations
      const createdTicket = await SupportTicket.findByPk(ticket.id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully.',
        data: createdTicket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/tickets/:id
 * Get ticket details
 * Requirements: 25.2
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const ticket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        // Operations managers can only see tickets assigned to them or unassigned tickets
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view tickets assigned to you.'
          });
        }
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/tickets/:id
 * Update ticket
 * Requirements: 25.3
 */
router.put('/:id',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('update_ticket', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, category, priority } = req.body;

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        // Operations managers can only update tickets assigned to them
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only update tickets assigned to you.'
          });
        }
      }

      // Update ticket
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (priority !== undefined) updateData.priority = priority;

      await ticket.update(updateData);

      // Fetch updated ticket with associations
      const updatedTicket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Ticket updated successfully.',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/tickets/:id/status
 * Update status
 * Requirements: 25.4
 * Implements Property 39: Ticket update tracking
 */
router.put('/:id/status',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('update_ticket_status', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['new', 'in_progress', 'waiting_response', 'resolved', 'closed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only update tickets assigned to you.'
          });
        }
      }

      // Update status with timestamp tracking (Property 39)
      const updateData = { status };
      
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.user.id;
      }

      await ticket.update(updateData);

      // Fetch updated ticket
      const updatedTicket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name', 'email', 'internalRole']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Ticket status updated successfully.',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket status.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/tickets/:id/assign
 * Assign to user
 * Requirements: 25.3
 */
router.put('/:id/assign',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('assign_ticket', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Validate assigned user exists and has appropriate role
      if (assignedTo) {
        const assignedUser = await User.findByPk(assignedTo);
        if (!assignedUser) {
          return res.status(404).json({
            success: false,
            message: 'Assigned user not found.'
          });
        }

        // Check if user has permission to handle tickets
        const validRoles = ['operations_manager', 'platform_admin', 'superuser'];
        if (!validRoles.includes(assignedUser.internalRole)) {
          return res.status(400).json({
            success: false,
            message: 'User does not have permission to handle tickets.'
          });
        }
      }

      // Update assignment
      await ticket.update({ assignedTo });

      // Fetch updated ticket
      const updatedTicket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Ticket assigned successfully.',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/tickets/:id/responses
 * Add response
 * Requirements: 25.4
 */
router.post('/:id/responses',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('add_ticket_response', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { message, isInternal = false, attachments = [] } = req.body;

      // Validate required fields
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required.'
        });
      }

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only respond to tickets assigned to you.'
          });
        }
      }

      // Create response
      const response = await TicketResponse.create({
        ticketId: id,
        userId: req.user.id,
        message: message.trim(),
        isInternal,
        attachments
      });

      // Fetch response with user info
      const createdResponse = await TicketResponse.findByPk(response.id, {
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
        message: 'Response added successfully.',
        data: createdResponse
      });
    } catch (error) {
      console.error('Error adding ticket response:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add response.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/tickets/:id/responses
 * Get responses
 * Requirements: 25.4
 */
router.get('/:id/responses',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { includeInternal = 'true' } = req.query;

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view responses for tickets assigned to you.'
          });
        }
      }

      // Build where clause
      const whereClause = { ticketId: id };
      
      // Filter internal responses based on query parameter
      if (includeInternal === 'false') {
        whereClause.isInternal = false;
      }

      const responses = await TicketResponse.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      res.json({
        success: true,
        data: responses
      });
    } catch (error) {
      console.error('Error fetching ticket responses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch responses.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/tickets/:id/resolve
 * Resolve ticket
 * Requirements: 25.5
 * Implements Property 40: Ticket resolution notification
 */
router.post('/:id/resolve',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('resolve_ticket', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      // Validate resolution
      if (!resolution || resolution.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Resolution description is required.'
        });
      }

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only resolve tickets assigned to you.'
          });
        }
      }

      // Check if ticket is already resolved or closed
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Ticket is already resolved or closed.'
        });
      }

      // Update ticket to resolved
      await ticket.update({
        status: 'resolved',
        resolution: resolution.trim(),
        resolvedAt: new Date(),
        resolvedBy: req.user.id
      });

      // Fetch updated ticket
      const resolvedTicket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      // TODO: Implement Property 40 - Send notification to property owner
      // This would typically involve sending an email notification
      // For now, we'll just log it
      console.log(`Ticket ${ticket.ticketNumber} resolved - notification should be sent to property owner`);

      res.json({
        success: true,
        message: 'Ticket resolved successfully.',
        data: resolvedTicket
      });
    } catch (error) {
      console.error('Error resolving ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/tickets/:id/close
 * Close ticket
 * Requirements: 25.5
 */
router.post('/:id/close',
  protectInternal,
  authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'),
  requireInternalPermissions('canManageTickets'),
  auditLog('close_ticket', 'ticket'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const ticket = await SupportTicket.findByPk(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.'
        });
      }

      // Role-based access control
      if (req.user.internalRole === 'operations_manager') {
        if (ticket.assignedTo && ticket.assignedTo !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only close tickets assigned to you.'
          });
        }
      }

      // Check if ticket is already closed
      if (ticket.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Ticket is already closed.'
        });
      }

      // Update ticket to closed
      await ticket.update({
        status: 'closed'
      });

      // Fetch updated ticket
      const closedTicket = await SupportTicket.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Ticket closed successfully.',
        data: closedTicket
      });
    } catch (error) {
      console.error('Error closing ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close ticket.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
