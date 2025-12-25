const express = require('express');
const { Op } = require('sequelize');
const { Notification, User, Alert } = require('../../models');
const { protectInternal, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * GET /api/internal/notifications - Get user notifications
 * Requirements: 26.3, 26.4
 */
router.get('/', protectInternal, async (req, res) => {
  try {
    const { 
      status, 
      type, 
      priority, 
      limit = 50, 
      offset = 0,
      unreadOnly = false 
    } = req.query;

    const where = {
      userId: req.user.id
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (unreadOnly === 'true') {
      where.status = 'unread';
    }

    const notifications = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Get unread count
    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        status: 'unread'
      }
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        total: notifications.count,
        unreadCount,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: notifications.count > parseInt(offset) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/notifications/unread-count - Get unread notification count
 * Requirements: 26.4
 */
router.get('/unread-count', protectInternal, async (req, res) => {
  try {
    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        status: 'unread'
      }
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/notifications/:id - Get specific notification
 * Requirements: 26.4
 */
router.get('/:id', protectInternal, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
});

/**
 * PUT /api/internal/notifications/:id/read - Mark notification as read
 * Requirements: 26.5
 */
router.put('/:id/read', protectInternal, auditLog, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.status === 'read') {
      return res.json({
        success: true,
        message: 'Notification already marked as read',
        data: notification
      });
    }

    await notification.update({
      status: 'read',
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

/**
 * PUT /api/internal/notifications/:id/dismiss - Dismiss notification
 * Requirements: 26.5
 */
router.put('/:id/dismiss', protectInternal, auditLog, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({
      status: 'dismissed',
      dismissedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Notification dismissed',
      data: notification
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification',
      error: error.message
    });
  }
});

/**
 * PUT /api/internal/notifications/mark-all-read - Mark all notifications as read
 * Requirements: 26.5
 */
router.put('/mark-all-read', protectInternal, auditLog, async (req, res) => {
  try {
    const [updatedCount] = await Notification.update(
      {
        status: 'read',
        readAt: new Date()
      },
      {
        where: {
          userId: req.user.id,
          status: 'unread'
        }
      }
    );

    res.json({
      success: true,
      message: `Marked ${updatedCount} notifications as read`,
      data: { updatedCount }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/notifications/settings - Get notification preferences
 * Requirements: 26.1, 26.2
 */
router.get('/settings/preferences', protectInternal, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'preferences', 'internalPermissions']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Default notification preferences if not set
    const defaultPreferences = {
      notifications: {
        email: true,
        sms: false,
        inApp: true
      },
      alertTypes: {
        zero_occupancy: true,
        payment_failure: true,
        high_priority_ticket: true,
        system_error: true,
        lead_assignment: true,
        approval_request: true,
        commission_payment: true
      },
      deliveryTiming: {
        immediate: ['high_priority_ticket', 'system_error'],
        daily_digest: ['zero_occupancy', 'payment_failure'],
        weekly_summary: ['commission_payment']
      }
    };

    const preferences = {
      ...defaultPreferences,
      ...user.preferences?.notificationSettings
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: error.message
    });
  }
});

/**
 * PUT /api/internal/notifications/settings - Configure notification preferences
 * Requirements: 26.1, 26.2
 */
router.put('/settings', protectInternal, auditLog, async (req, res) => {
  try {
    const { 
      notifications = {}, 
      alertTypes = {}, 
      deliveryTiming = {} 
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate notification settings
    const validNotificationTypes = ['email', 'sms', 'inApp'];
    const validAlertTypes = [
      'zero_occupancy', 'payment_failure', 'high_priority_ticket', 
      'system_error', 'lead_assignment', 'approval_request', 'commission_payment'
    ];

    // Validate notification preferences
    for (const [key, value] of Object.entries(notifications)) {
      if (!validNotificationTypes.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Invalid notification type: ${key}`
        });
      }
      if (typeof value !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `Notification preference for ${key} must be boolean`
        });
      }
    }

    // Validate alert type preferences
    for (const [key, value] of Object.entries(alertTypes)) {
      if (!validAlertTypes.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Invalid alert type: ${key}`
        });
      }
      if (typeof value !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `Alert preference for ${key} must be boolean`
        });
      }
    }

    // Update user preferences
    const currentPreferences = user.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      notificationSettings: {
        notifications,
        alertTypes,
        deliveryTiming,
        updatedAt: new Date()
      }
    };

    await user.update({
      preferences: updatedPreferences
    });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: updatedPreferences.notificationSettings
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

/**
 * POST /api/internal/notifications/test - Send test notification (admin only)
 * Requirements: 26.2
 */
router.post('/test', protectInternal, requireInternalPermissions(['canManageSystemSettings']), auditLog, async (req, res) => {
  try {
    const { userId, type = 'system_announcement', title, message, priority = 'medium' } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and message are required'
      });
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    const notification = await Notification.create({
      userId,
      type,
      title: `[TEST] ${title}`,
      message,
      priority,
      deliveryMethod: ['in_app'],
      metadata: {
        isTest: true,
        sentBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

/**
 * DELETE /api/internal/notifications/:id - Delete notification
 * Requirements: 26.5
 */
router.delete('/:id', protectInternal, auditLog, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/notifications/alerts/active - Get active alerts for operations managers
 * Requirements: 14.5
 */
router.get('/alerts/active', protectInternal, requireInternalPermissions(['canManageTickets']), async (req, res) => {
  try {
    const { type, severity, limit = 20 } = req.query;

    const where = {
      status: ['new', 'in_progress']
    };

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await Alert.findAll({
      where,
      limit: parseInt(limit),
      order: [['triggeredAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'propertyOwner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: error.message
    });
  }
});

module.exports = router;
