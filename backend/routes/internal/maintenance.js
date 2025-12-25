const express = require('express');
const router = express.Router();
const { Room, MaintenanceRequest, User, RoomCategory } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');

/**
 * Internal Maintenance Management Routes
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

/**
 * GET /api/internal/maintenance/requests
 * Get maintenance requests with filtering
 * Requirements: 30.2
 */
router.get('/requests', protectInternal, async (req, res) => {
  try {
    const { 
      propertyId, 
      status, 
      priority, 
      roomId, 
      floorNumber,
      assignedTo,
      limit = 50, 
      offset = 0 
    } = req.query;

    // Determine which property to query
    let ownerId;
    if (req.user.role === 'admin' && propertyId) {
      ownerId = propertyId;
    } else if (req.user.role === 'owner' || req.user.role === 'category_owner') {
      ownerId = req.user.id;
    } else {
      // For staff, require propertyId
      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: 'Property ID is required for staff users.'
        });
      }
      ownerId = propertyId;
    }

    // Build where clause for maintenance requests
    const whereClause = {};

    // Filter by status if provided
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      whereClause.status = status;
    }

    // Filter by priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
        });
      }
      whereClause.priority = priority;
    }

    // Filter by assigned staff if provided
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    // Build room where clause
    const roomWhereClause = { ownerId, isActive: true };
    
    if (roomId) {
      roomWhereClause.id = roomId;
    }

    if (floorNumber) {
      const floor = parseInt(floorNumber);
      if (isNaN(floor) || floor < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid floor number. Must be a non-negative integer.'
        });
      }
      roomWhereClause.floorNumber = floor;
    }

    // Fetch maintenance requests
    const { count, rows: requests } = await MaintenanceRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          where: roomWhereClause,
          attributes: ['id', 'roomNumber', 'floorNumber', 'roomType']
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'staffRole']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'staffRole'],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'], // urgent > high > medium > low
        ['reportedDate', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const formattedRequests = requests.map(request => ({
      id: request.id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      room: {
        id: request.room.id,
        roomNumber: request.room.roomNumber,
        floorNumber: request.room.floorNumber,
        roomType: request.room.roomType,
        category: request.room.customCategory?.name || null
      },
      reportedBy: {
        id: request.reporter.id,
        name: request.reporter.name,
        email: request.reporter.email,
        role: request.reporter.staffRole
      },
      assignedTo: request.assignee ? {
        id: request.assignee.id,
        name: request.assignee.name,
        email: request.assignee.email,
        role: request.assignee.staffRole
      } : null,
      reportedDate: request.reportedDate,
      expectedCompletionDate: request.expectedCompletionDate,
      completedDate: request.completedDate,
      workPerformed: request.workPerformed,
      costIncurred: request.costIncurred,
      images: request.images,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    res.json({
      success: true,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance requests.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/maintenance/requests
 * Create a new maintenance request
 * Requirements: 30.1, 30.3
 */
router.post('/requests', protectInternal, async (req, res) => {
  try {
    const {
      roomId,
      title,
      description,
      priority = 'medium',
      assignedTo,
      expectedCompletionDate,
      images
    } = req.body;

    // Validate required fields
    if (!roomId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'roomId, title, and description are required.'
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 3 and 200 characters.'
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Validate room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Validate assignedTo user if provided
    if (assignedTo) {
      const assignee = await User.findByPk(assignedTo);
      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found.'
        });
      }
    }

    // Validate images array if provided
    if (images !== undefined && images !== null) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          message: 'images must be an array of URL strings.'
        });
      }
      
      for (const url of images) {
        if (typeof url !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Each image must be a valid URL string.'
          });
        }
      }
    }

    // Create maintenance request
    const maintenanceRequest = await MaintenanceRequest.create({
      roomId,
      title,
      description,
      priority,
      status: 'pending',
      reportedBy: req.user.id,
      assignedTo: assignedTo || null,
      reportedDate: new Date(),
      expectedCompletionDate: expectedCompletionDate || null,
      images: images || []
    });

    // Update room's lastMaintenanceAt
    room.lastMaintenanceAt = new Date();
    await room.save();

    // Fetch complete request with relations
    const completeRequest = await MaintenanceRequest.findByPk(maintenanceRequest.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'roomType']
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'staffRole']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'staffRole'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance request created successfully.',
      data: {
        id: completeRequest.id,
        title: completeRequest.title,
        description: completeRequest.description,
        priority: completeRequest.priority,
        status: completeRequest.status,
        room: {
          id: completeRequest.room.id,
          roomNumber: completeRequest.room.roomNumber,
          floorNumber: completeRequest.room.floorNumber,
          roomType: completeRequest.room.roomType
        },
        reportedBy: {
          id: completeRequest.reporter.id,
          name: completeRequest.reporter.name,
          email: completeRequest.reporter.email,
          role: completeRequest.reporter.staffRole
        },
        assignedTo: completeRequest.assignee ? {
          id: completeRequest.assignee.id,
          name: completeRequest.assignee.name,
          email: completeRequest.assignee.email,
          role: completeRequest.assignee.staffRole
        } : null,
        reportedDate: completeRequest.reportedDate,
        expectedCompletionDate: completeRequest.expectedCompletionDate,
        images: completeRequest.images,
        createdAt: completeRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create maintenance request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/maintenance/requests/:id
 * Update maintenance request status and details
 * Requirements: 30.3, 30.4, 30.5
 */
router.put('/requests/:id', protectInternal, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      assignedTo,
      expectedCompletionDate,
      workPerformed,
      costIncurred,
      images
    } = req.body;

    // Find the maintenance request
    const request = await MaintenanceRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found.'
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // If marking as completed, require workPerformed
      if (status === 'completed' && !workPerformed && !request.workPerformed) {
        return res.status(400).json({
          success: false,
          message: 'workPerformed is required when marking request as completed.'
        });
      }

      request.status = status;

      // Set completedDate if marking as completed
      if (status === 'completed' && !request.completedDate) {
        request.completedDate = new Date();
      }
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
        });
      }
      request.priority = priority;
    }

    // Validate and update assignedTo if provided
    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        request.assignedTo = null;
      } else {
        const assignee = await User.findByPk(assignedTo);
        if (!assignee) {
          return res.status(404).json({
            success: false,
            message: 'Assigned user not found.'
          });
        }
        request.assignedTo = assignedTo;
      }
    }

    // Update other fields if provided
    if (expectedCompletionDate !== undefined) {
      request.expectedCompletionDate = expectedCompletionDate;
    }

    if (workPerformed !== undefined) {
      request.workPerformed = workPerformed;
    }

    if (costIncurred !== undefined) {
      const cost = parseFloat(costIncurred);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          message: 'costIncurred must be a non-negative number.'
        });
      }
      request.costIncurred = cost;
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          message: 'images must be an array of URL strings.'
        });
      }
      
      for (const url of images) {
        if (typeof url !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Each image must be a valid URL string.'
          });
        }
      }
      request.images = images;
    }

    await request.save();

    // Fetch complete request with relations
    const updatedRequest = await MaintenanceRequest.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'roomType']
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'staffRole']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'staffRole'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Maintenance request updated successfully.',
      data: {
        id: updatedRequest.id,
        title: updatedRequest.title,
        description: updatedRequest.description,
        priority: updatedRequest.priority,
        status: updatedRequest.status,
        room: {
          id: updatedRequest.room.id,
          roomNumber: updatedRequest.room.roomNumber,
          floorNumber: updatedRequest.room.floorNumber,
          roomType: updatedRequest.room.roomType
        },
        reportedBy: {
          id: updatedRequest.reporter.id,
          name: updatedRequest.reporter.name,
          email: updatedRequest.reporter.email,
          role: updatedRequest.reporter.staffRole
        },
        assignedTo: updatedRequest.assignee ? {
          id: updatedRequest.assignee.id,
          name: updatedRequest.assignee.name,
          email: updatedRequest.assignee.email,
          role: updatedRequest.assignee.staffRole
        } : null,
        reportedDate: updatedRequest.reportedDate,
        expectedCompletionDate: updatedRequest.expectedCompletionDate,
        completedDate: updatedRequest.completedDate,
        workPerformed: updatedRequest.workPerformed,
        costIncurred: updatedRequest.costIncurred,
        images: updatedRequest.images,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/maintenance/requests/:roomId/history
 * Get maintenance history for a specific room
 * Requirements: 30.5
 */
router.get('/requests/:roomId/history', protectInternal, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Validate room exists
    const room = await Room.findByPk(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Fetch maintenance history
    const { count, rows: requests } = await MaintenanceRequest.findAndCountAll({
      where: { roomId },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'staffRole']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'staffRole'],
          required: false
        }
      ],
      order: [['reportedDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const history = requests.map(request => ({
      id: request.id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      reportedBy: {
        id: request.reporter.id,
        name: request.reporter.name,
        email: request.reporter.email,
        role: request.reporter.staffRole
      },
      assignedTo: request.assignee ? {
        id: request.assignee.id,
        name: request.assignee.name,
        email: request.assignee.email,
        role: request.assignee.staffRole
      } : null,
      reportedDate: request.reportedDate,
      expectedCompletionDate: request.expectedCompletionDate,
      completedDate: request.completedDate,
      workPerformed: request.workPerformed,
      costIncurred: request.costIncurred,
      images: request.images,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    res.json({
      success: true,
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        roomType: room.roomType,
        category: room.customCategory?.name || room.category,
        lastMaintenanceAt: room.lastMaintenanceAt
      },
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: history
    });
  } catch (error) {
    console.error('Error fetching maintenance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
