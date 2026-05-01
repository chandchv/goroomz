/**
 * Notification Routes
 * 
 * Handles notification preferences and notification center API endpoints.
 * 
 * Routes:
 * Notification Center:
 * - GET /api/notifications - List notifications with pagination
 * - GET /api/notifications/unread-count - Get unread notification count
 * - GET /api/notifications/pending-claims-count - Get pending property claims count (admin)
 * - PUT /api/notifications/:id/read - Mark notification as read
 * - PUT /api/notifications/mark-all-read - Mark all notifications as read
 * 
 * Preferences:
 * - GET /api/notifications/preferences - Get user notification preferences
 * - PUT /api/notifications/preferences - Update user notification preferences
 * - PUT /api/notifications/preferences/bulk - Bulk update preferences
 * - DELETE /api/notifications/preferences - Reset preferences to defaults
 */

const express = require('express');
const { Op } = require('sequelize');
const { NotificationPreference, Notification, User, PropertyClaim } = require('../models');
const { protect } = require('../middleware/auth');
const { NOTIFICATION_TYPES } = require('../services/notifications/constants');

const router = express.Router();

// ============================================
// NOTIFICATION CENTER ROUTES
// ============================================

/**
 * Helper function to group notifications by date
 * Groups into: Today, Yesterday, This Week, Earlier
 */
function groupNotificationsByDate(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: []
  };

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt);
    const notificationDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());

    if (notificationDate.getTime() === today.getTime()) {
      groups.today.push(notification);
    } else if (notificationDate.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  }

  return groups;
}

/**
 * @desc    Get notifications with pagination and optional grouping
 * @route   GET /api/notifications
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   status - Filter by status (pending, sent, read, dismissed, failed)
 * @query   type - Filter by notification type
 * @query   grouped - If 'true', group notifications by date
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, type, grouped } = req.query;

    // Build where clause
    const where = { userId };
    
    if (status) {
      const validStatuses = ['pending', 'sent', 'read', 'dismissed', 'failed'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }
    
    if (type) {
      const validTypes = Object.values(NOTIFICATION_TYPES);
      if (validTypes.includes(type)) {
        where.type = type;
      }
    }

    // Get total count
    const totalCount = await Notification.count({ where });

    // Get notifications
    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Group by date if requested
    let responseData;
    if (grouped === 'true') {
      responseData = {
        grouped: groupNotificationsByDate(notifications),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    } else {
      responseData = {
        notifications,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count notifications that are unread (pending or sent status)
    const unreadCount = await Notification.count({
      where: {
        userId,
        status: {
          [Op.in]: ['pending', 'sent']
        }
      }
    });

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count'
    });
  }
});

/**
 * @desc    Get pending property claims count (for admin badge)
 * @route   GET /api/notifications/pending-claims-count
 * @access  Private (Admin/Superuser only)
 */
router.get('/pending-claims-count', protect, async (req, res) => {
  try {
    // Check if user has admin or superuser role
    const userRole = req.user.role || req.user.userType;
    const isAdmin = ['admin', 'superuser', 'super_admin'].includes(userRole);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Count pending property claims
    const pendingClaimsCount = await PropertyClaim.count({
      where: {
        status: 'pending'
      }
    });

    res.json({
      success: true,
      data: {
        pendingClaimsCount
      }
    });
  } catch (error) {
    console.error('Get pending claims count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending claims count'
    });
  }
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
router.put('/:id/read', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Find the notification
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if already read
    if (notification.status === 'read') {
      return res.json({
        success: true,
        message: 'Notification already marked as read',
        data: notification
      });
    }

    // Mark as read using instance method
    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Update all unread notifications for this user
    const [updatedCount] = await Notification.update(
      {
        status: 'read',
        readAt: new Date()
      },
      {
        where: {
          userId,
          status: {
            [Op.in]: ['pending', 'sent']
          }
        }
      }
    );

    res.json({
      success: true,
      message: `${updatedCount} notification(s) marked as read`,
      data: {
        updatedCount
      }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read'
    });
  }
});

// ============================================
// NOTIFICATION PREFERENCES ROUTES
// ============================================

/**
 * @desc    Get user notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
router.get('/preferences', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all preferences for the user
    const preferences = await NotificationPreference.findAll({
      where: { userId },
      order: [['notificationType', 'ASC']]
    });

    // If no preferences exist, create default preference
    if (preferences.length === 0) {
      const defaultPreference = await NotificationPreference.getOrCreateDefault(userId);
      return res.json({
        success: true,
        data: {
          preferences: [defaultPreference],
          availableTypes: Object.values(NOTIFICATION_TYPES)
        }
      });
    }

    res.json({
      success: true,
      data: {
        preferences,
        availableTypes: Object.values(NOTIFICATION_TYPES)
      }
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences'
    });
  }
});

/**
 * @desc    Update user notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 * 
 * Request body can contain:
 * - notificationType: string (specific type or 'default')
 * - emailEnabled: boolean
 * - smsEnabled: boolean
 * - inAppEnabled: boolean
 * - pushEnabled: boolean
 * - digestMode: 'immediate' | 'daily' | 'weekly'
 * - quietHoursStart: string (HH:MM format)
 * - quietHoursEnd: string (HH:MM format)
 * - language: 'en' | 'hi'
 */
router.put('/preferences', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      notificationType = 'default',
      emailEnabled,
      smsEnabled,
      inAppEnabled,
      pushEnabled,
      digestMode,
      quietHoursStart,
      quietHoursEnd,
      language
    } = req.body;

    // Validate notificationType
    const validTypes = ['default', ...Object.values(NOTIFICATION_TYPES)];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Valid types are: ${validTypes.join(', ')}`
      });
    }

    // Validate digestMode if provided
    if (digestMode && !['immediate', 'daily', 'weekly'].includes(digestMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid digest mode. Valid modes are: immediate, daily, weekly'
      });
    }

    // Validate language if provided
    if (language && !['en', 'hi'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Valid languages are: en, hi'
      });
    }

    // Validate quiet hours format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quietHoursStart format. Use HH:MM format (e.g., 22:00)'
      });
    }
    if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quietHoursEnd format. Use HH:MM format (e.g., 08:00)'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (typeof emailEnabled === 'boolean') updateData.emailEnabled = emailEnabled;
    if (typeof smsEnabled === 'boolean') updateData.smsEnabled = smsEnabled;
    if (typeof inAppEnabled === 'boolean') updateData.inAppEnabled = inAppEnabled;
    if (typeof pushEnabled === 'boolean') updateData.pushEnabled = pushEnabled;
    if (digestMode) updateData.digestMode = digestMode;
    if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart || null;
    if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd || null;
    if (language) updateData.language = language;

    // Find or create preference for this type
    let [preference, created] = await NotificationPreference.findOrCreate({
      where: {
        userId,
        notificationType
      },
      defaults: {
        userId,
        notificationType,
        emailEnabled: true,
        smsEnabled: true,
        inAppEnabled: true,
        pushEnabled: true,
        digestMode: 'immediate',
        language: 'en',
        ...updateData
      }
    });

    // If preference already existed, update it
    if (!created && Object.keys(updateData).length > 0) {
      await preference.update(updateData);
      preference = await NotificationPreference.findByPk(preference.id);
    }

    res.json({
      success: true,
      message: created ? 'Notification preference created' : 'Notification preference updated',
      data: preference
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences'
    });
  }
});

/**
 * @desc    Update multiple notification preferences at once (bulk update)
 * @route   PUT /api/notifications/preferences/bulk
 * @access  Private
 * 
 * Request body:
 * - preferences: Array of preference objects with notificationType and settings
 */
router.put('/preferences/bulk', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'preferences must be a non-empty array'
      });
    }

    const validTypes = ['default', ...Object.values(NOTIFICATION_TYPES)];
    const results = [];

    for (const pref of preferences) {
      const {
        notificationType = 'default',
        emailEnabled,
        smsEnabled,
        inAppEnabled,
        pushEnabled,
        digestMode,
        quietHoursStart,
        quietHoursEnd,
        language
      } = pref;

      // Skip invalid types
      if (!validTypes.includes(notificationType)) {
        results.push({
          notificationType,
          success: false,
          error: 'Invalid notification type'
        });
        continue;
      }

      try {
        const updateData = {};
        if (typeof emailEnabled === 'boolean') updateData.emailEnabled = emailEnabled;
        if (typeof smsEnabled === 'boolean') updateData.smsEnabled = smsEnabled;
        if (typeof inAppEnabled === 'boolean') updateData.inAppEnabled = inAppEnabled;
        if (typeof pushEnabled === 'boolean') updateData.pushEnabled = pushEnabled;
        if (digestMode) updateData.digestMode = digestMode;
        if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart || null;
        if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd || null;
        if (language) updateData.language = language;

        let [preference, created] = await NotificationPreference.findOrCreate({
          where: { userId, notificationType },
          defaults: {
            userId,
            notificationType,
            emailEnabled: true,
            smsEnabled: true,
            inAppEnabled: true,
            pushEnabled: true,
            digestMode: 'immediate',
            language: 'en',
            ...updateData
          }
        });

        if (!created && Object.keys(updateData).length > 0) {
          await preference.update(updateData);
        }

        results.push({
          notificationType,
          success: true,
          created
        });
      } catch (err) {
        results.push({
          notificationType,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk preference update completed',
      data: results
    });
  } catch (error) {
    console.error('Bulk update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences'
    });
  }
});

/**
 * @desc    Reset notification preferences to defaults
 * @route   DELETE /api/notifications/preferences
 * @access  Private
 */
router.delete('/preferences', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationType } = req.query;

    if (notificationType) {
      // Delete specific preference (will fall back to default)
      await NotificationPreference.destroy({
        where: {
          userId,
          notificationType,
          notificationType: { [require('sequelize').Op.ne]: 'default' }
        }
      });
    } else {
      // Delete all non-default preferences
      await NotificationPreference.destroy({
        where: {
          userId,
          notificationType: { [require('sequelize').Op.ne]: 'default' }
        }
      });
    }

    // Ensure default preference exists
    const defaultPreference = await NotificationPreference.getOrCreateDefault(userId);

    res.json({
      success: true,
      message: notificationType 
        ? `Preference for ${notificationType} reset to default`
        : 'All preferences reset to default',
      data: defaultPreference
    });
  } catch (error) {
    console.error('Reset notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting notification preferences'
    });
  }
});

module.exports = router;
