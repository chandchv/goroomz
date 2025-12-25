const express = require('express');
const router = express.Router();
const { Room, HousekeepingLog, User, RoomCategory } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');

/**
 * Internal Housekeeping Management Routes
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

/**
 * GET /api/internal/housekeeping/tasks
 * Get pending cleaning tasks (rooms with vacant_dirty status)
 * Requirements: 13.1, 13.2, 13.4
 */
router.get('/tasks', protectInternal, async (req, res) => {
  try {
    const { propertyId, floorNumber } = req.query;

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

    // Build where clause
    const whereClause = {
      ownerId,
      currentStatus: 'vacant_dirty',
      isActive: true
    };

    // Add floor filter if provided
    if (floorNumber) {
      const floor = parseInt(floorNumber);
      if (isNaN(floor) || floor < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid floor number. Must be a non-negative integer.'
        });
      }
      whereClause.floorNumber = floor;
    }

    // Fetch rooms with vacant_dirty status
    const dirtyRooms = await Room.findAll({
      where: whereClause,
      include: [
        {
          model: RoomCategory,
          as: 'customCategory',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['floorNumber', 'ASC'],
        ['roomNumber', 'ASC']
      ]
    });

    // Calculate time since last checkout and priority
    const currentTime = new Date();
    const tasks = dirtyRooms.map(room => {
      // Calculate hours since room became dirty
      // We'll use updatedAt as a proxy for when status changed
      const hoursSinceDirty = room.updatedAt 
        ? Math.floor((currentTime - new Date(room.updatedAt)) / (1000 * 60 * 60))
        : 0;

      // Determine priority: high if > 24 hours, normal otherwise
      const priority = hoursSinceDirty > 24 ? 'high' : 'normal';

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        category: room.customCategory?.name || room.category,
        status: room.currentStatus,
        lastCleanedAt: room.lastCleanedAt,
        hoursSinceDirty,
        priority,
        roomType: room.roomType
      };
    });

    // Sort by priority (high first) then by hours since dirty
    tasks.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return b.hoursSinceDirty - a.hoursSinceDirty;
    });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching housekeeping tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch housekeeping tasks.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/housekeeping/tasks/:roomId/complete
 * Mark room as clean and log the cleaning activity
 * Requirements: 13.3, 7.3
 */
router.post('/tasks/:roomId/complete', protectInternal, requirePermissions('canUpdateRoomStatus'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { timeTaken, checklistCompleted, issuesFound, notes } = req.body;

    // Find the room
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Verify room is in dirty state
    if (room.currentStatus !== 'vacant_dirty') {
      return res.status(400).json({
        success: false,
        message: `Room is currently ${room.currentStatus}. Only vacant_dirty rooms can be marked as clean.`
      });
    }

    // Validate timeTaken if provided
    if (timeTaken !== undefined && timeTaken !== null) {
      const time = parseInt(timeTaken);
      if (isNaN(time) || time < 0 || time > 480) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timeTaken. Must be between 0 and 480 minutes.'
        });
      }
    }

    // Validate checklistCompleted if provided
    if (checklistCompleted !== undefined && checklistCompleted !== null) {
      if (!Array.isArray(checklistCompleted)) {
        return res.status(400).json({
          success: false,
          message: 'checklistCompleted must be an array.'
        });
      }
      
      // Validate each checklist item
      for (const item of checklistCompleted) {
        if (!item.item || typeof item.item !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Each checklist item must have an item name (string).'
          });
        }
        if (typeof item.completed !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'Each checklist item must have a completed boolean.'
          });
        }
      }
    }

    // Update room status to vacant_clean
    const previousStatus = room.currentStatus;
    room.currentStatus = 'vacant_clean';
    room.lastCleanedAt = new Date();
    await room.save();

    // Create housekeeping log entry
    const housekeepingLog = await HousekeepingLog.create({
      roomId: room.id,
      cleanedBy: req.user.id,
      cleanedAt: new Date(),
      timeTaken: timeTaken || null,
      checklistCompleted: checklistCompleted || [],
      issuesFound: issuesFound || null,
      notes: notes || null
    });

    // Fetch the cleaner's info
    const cleaner = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email']
    });

    res.json({
      success: true,
      message: 'Room marked as clean successfully.',
      data: {
        room: {
          id: room.id,
          roomNumber: room.roomNumber,
          floorNumber: room.floorNumber,
          previousStatus,
          currentStatus: room.currentStatus,
          lastCleanedAt: room.lastCleanedAt
        },
        log: {
          id: housekeepingLog.id,
          cleanedBy: {
            id: cleaner.id,
            name: cleaner.name,
            email: cleaner.email
          },
          cleanedAt: housekeepingLog.cleanedAt,
          timeTaken: housekeepingLog.timeTaken,
          checklistCompleted: housekeepingLog.checklistCompleted,
          issuesFound: housekeepingLog.issuesFound,
          notes: housekeepingLog.notes
        }
      }
    });
  } catch (error) {
    console.error('Error completing housekeeping task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete housekeeping task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/housekeeping/history/:roomId
 * Get cleaning history for a specific room
 * Requirements: 13.2
 */
router.get('/history/:roomId', protectInternal, async (req, res) => {
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

    // Fetch cleaning history
    const { count, rows: logs } = await HousekeepingLog.findAndCountAll({
      where: { roomId },
      include: [
        {
          model: User,
          as: 'cleaner',
          attributes: ['id', 'name', 'email', 'staffRole']
        }
      ],
      order: [['cleanedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const history = logs.map(log => ({
      id: log.id,
      cleanedAt: log.cleanedAt,
      cleanedBy: {
        id: log.cleaner?.id,
        name: log.cleaner?.name,
        email: log.cleaner?.email,
        role: log.cleaner?.staffRole
      },
      timeTaken: log.timeTaken,
      checklistCompleted: log.checklistCompleted,
      issuesFound: log.issuesFound,
      notes: log.notes
    }));

    res.json({
      success: true,
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        currentStatus: room.currentStatus,
        lastCleanedAt: room.lastCleanedAt
      },
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: history
    });
  } catch (error) {
    console.error('Error fetching housekeeping history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch housekeeping history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
