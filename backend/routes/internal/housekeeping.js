const express = require('express');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');
const { HousekeepingTask, Room, Staff } = require('../../models');
const router = express.Router();

// @desc    Get housekeeping tasks for internal management
// @route   GET /api/internal/housekeeping/tasks
// @access  Private
router.get('/internal/housekeeping/tasks', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { propertyId, status, priority } = req.query;

    try {
      // First try to get tasks from the database
      const whereClause = {};
      if (propertyId) whereClause.propertyId = propertyId;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;

      const tasks = await HousekeepingTask.findAll({
        where: whereClause,
        include: [
          { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
          { model: Staff, as: 'assignee', attributes: ['id', 'name'] }
        ],
        order: [['priority', 'DESC'], ['dueDate', 'ASC']]
      });

      // Calculate summary
      const allTasks = await HousekeepingTask.findAll({ where: propertyId ? { propertyId } : {} });
      const now = new Date();

      res.json({
        success: true,
        data: tasks.map(task => ({
          id: task.id,
          roomId: task.roomId,
          roomNumber: task.room?.title?.replace('Room ', '') || 'N/A',
          floorNumber: 1,
          taskType: task.taskType,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignee?.name || null,
          description: task.description,
          estimatedDuration: task.estimatedDuration,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        })),
        summary: {
          total: allTasks.length,
          pending: allTasks.filter(t => t.status === 'pending').length,
          in_progress: allTasks.filter(t => t.status === 'in_progress').length,
          completed: allTasks.filter(t => t.status === 'completed').length,
          overdue: allTasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now).length
        }
      });
    } catch (dbError) {
      console.error('Database query error in housekeeping tasks:', dbError);
      res.json({
        success: true,
        data: [],
        summary: { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
      });
    }
  } catch (error) {
    console.error('Internal housekeeping tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching housekeeping tasks'
    });
  }
});

module.exports = router;
