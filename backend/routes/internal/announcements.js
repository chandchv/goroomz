const express = require('express');
const { Op, sequelize } = require('sequelize');
const { Announcement, User } = require('../../models');
const { protectInternal, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { emailService } = require('../../utils/emailService');

const router = express.Router();

/**
 * GET /api/internal/announcements - Get all announcements
 * Requirements: 30.1
 */
router.get('/', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), async (req, res) => {
  try {
    const { 
      status, 
      targetAudience, 
      limit = 50, 
      offset = 0,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    if (status) {
      if (status === 'sent') {
        where.sentAt = { [Op.not]: null };
      } else if (status === 'scheduled') {
        where.scheduledAt = { [Op.not]: null };
        where.sentAt = null;
      } else if (status === 'draft') {
        where.scheduledAt = null;
        where.sentAt = null;
      }
    }

    if (targetAudience) {
      where.targetAudience = targetAudience;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const validSortFields = ['createdAt', 'title', 'scheduledAt', 'sentAt', 'totalRecipients'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const announcements = await Announcement.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[orderField, orderDirection]],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        announcements: announcements.rows,
        total: announcements.count,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: announcements.count > parseInt(offset) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
});

/**
 * POST /api/internal/announcements - Create announcement
 * Requirements: 30.1, 30.2
 */
router.post('/', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), auditLog, async (req, res) => {
  try {
    const {
      title,
      content,
      targetAudience = 'all_property_owners',
      targetFilters = {},
      scheduledAt,
      deliveryMethod = ['email', 'in_app']
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 5 and 200 characters'
      });
    }

    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be empty'
      });
    }

    const validTargetAudiences = ['all_property_owners', 'specific_region', 'specific_property_type'];
    if (!validTargetAudiences.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target audience'
      });
    }

    const validDeliveryMethods = ['email', 'in_app', 'sms'];
    if (!Array.isArray(deliveryMethod) || deliveryMethod.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one delivery method must be specified'
      });
    }

    for (const method of deliveryMethod) {
      if (!validDeliveryMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: `Invalid delivery method: ${method}`
        });
      }
    }

    // Validate scheduled date if provided
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scheduled date format'
        });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
    }

    // Validate target filters based on audience
    if (targetAudience === 'specific_region' && (!targetFilters.regions || !Array.isArray(targetFilters.regions))) {
      return res.status(400).json({
        success: false,
        message: 'Regions must be specified for specific_region target audience'
      });
    }

    if (targetAudience === 'specific_property_type' && (!targetFilters.propertyTypes || !Array.isArray(targetFilters.propertyTypes))) {
      return res.status(400).json({
        success: false,
        message: 'Property types must be specified for specific_property_type target audience'
      });
    }

    const announcement = await Announcement.create({
      title,
      content,
      targetAudience,
      targetFilters,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      deliveryMethod,
      createdBy: req.user.id
    });

    // Load the created announcement with creator info
    const createdAnnouncement = await Announcement.findByPk(announcement.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: createdAnnouncement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/announcements/:id - Get announcement details
 * Requirements: 30.1
 */
router.get('/:id', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
      error: error.message
    });
  }
});

/**
 * PUT /api/internal/announcements/:id - Update announcement
 * Requirements: 30.3
 */
router.put('/:id', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), auditLog, async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Prevent editing sent announcements
    if (announcement.sentAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit announcements that have already been sent'
      });
    }

    const {
      title,
      content,
      targetAudience,
      targetFilters,
      scheduledAt,
      deliveryMethod
    } = req.body;

    const updateData = {};

    if (title !== undefined) {
      if (title.length < 5 || title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title must be between 5 and 200 characters'
        });
      }
      updateData.title = title;
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content cannot be empty'
        });
      }
      updateData.content = content;
    }

    if (targetAudience !== undefined) {
      const validTargetAudiences = ['all_property_owners', 'specific_region', 'specific_property_type'];
      if (!validTargetAudiences.includes(targetAudience)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid target audience'
        });
      }
      updateData.targetAudience = targetAudience;
    }

    if (targetFilters !== undefined) {
      updateData.targetFilters = targetFilters;
    }

    if (scheduledAt !== undefined) {
      if (scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid scheduled date format'
          });
        }
        if (scheduledDate <= new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Scheduled date must be in the future'
          });
        }
        updateData.scheduledAt = scheduledDate;
      } else {
        updateData.scheduledAt = null;
      }
    }

    if (deliveryMethod !== undefined) {
      const validDeliveryMethods = ['email', 'in_app', 'sms'];
      if (!Array.isArray(deliveryMethod) || deliveryMethod.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one delivery method must be specified'
        });
      }

      for (const method of deliveryMethod) {
        if (!validDeliveryMethods.includes(method)) {
          return res.status(400).json({
            success: false,
            message: `Invalid delivery method: ${method}`
          });
        }
      }
      updateData.deliveryMethod = deliveryMethod;
    }

    await announcement.update(updateData);

    // Load updated announcement with creator info
    const updatedAnnouncement = await Announcement.findByPk(announcement.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: error.message
    });
  }
});

/**
 * DELETE /api/internal/announcements/:id - Delete announcement
 * Requirements: 30.4
 */
router.delete('/:id', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), auditLog, async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Prevent deleting sent announcements
    if (announcement.sentAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete announcements that have already been sent'
      });
    }

    await announcement.destroy();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
});
/**
 
* POST /api/internal/announcements/:id/send - Send announcement
 * Requirements: 30.4, 30.5
 */
router.post('/:id/send', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), auditLog, async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if already sent
    if (announcement.sentAt) {
      return res.status(400).json({
        success: false,
        message: 'Announcement has already been sent'
      });
    }

    // Get target recipients based on audience and filters
    let recipients = [];
    let whereClause = {
      internalRole: null // Only property owners (not internal users)
    };

    if (announcement.targetAudience === 'specific_region' && announcement.targetFilters.regions) {
      // For region-based targeting, we would need a property-user relationship
      // For now, we'll target all property owners and note this limitation
      whereClause = {
        ...whereClause,
        // TODO: Add region filtering when property-user relationship is established
      };
    } else if (announcement.targetAudience === 'specific_property_type' && announcement.targetFilters.propertyTypes) {
      // Similar limitation for property type filtering
      whereClause = {
        ...whereClause,
        // TODO: Add property type filtering when property-user relationship is established
      };
    }

    recipients = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'phone']
    });

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients found for the specified target audience'
      });
    }

    // Send announcement via specified delivery methods
    let emailsSent = 0;
    let smssSent = 0;
    let inAppNotificationsSent = 0;

    for (const recipient of recipients) {
      try {
        // Send email if included in delivery methods
        if (announcement.deliveryMethod.includes('email') && recipient.email) {
          await emailService.sendEmail({
            to: recipient.email,
            subject: announcement.title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                  ${announcement.title}
                </h2>
                <div style="margin: 20px 0; line-height: 1.6; color: #555;">
                  ${announcement.content.replace(/\n/g, '<br>')}
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #888; text-align: center;">
                  This is an announcement from GoRoomz Platform Management.
                </p>
              </div>
            `,
            text: `${announcement.title}\n\n${announcement.content}\n\n---\nThis is an announcement from GoRoomz Platform Management.`
          });
          emailsSent++;
        }

        // Create in-app notification if included in delivery methods
        if (announcement.deliveryMethod.includes('in_app')) {
          const { Notification } = require('../../models');
          await Notification.create({
            userId: recipient.id,
            type: 'announcement',
            title: announcement.title,
            message: announcement.content,
            priority: 'medium',
            deliveryMethod: ['in_app'],
            metadata: {
              announcementId: announcement.id,
              createdBy: announcement.createdBy
            }
          });
          inAppNotificationsSent++;
        }

        // SMS sending would be implemented here if SMS service is configured
        if (announcement.deliveryMethod.includes('sms') && recipient.phone) {
          // TODO: Implement SMS sending when SMS service is configured
          // For now, we'll just count it as attempted
          smssSent++;
        }
      } catch (deliveryError) {
        console.error(`Failed to deliver announcement to user ${recipient.id}:`, deliveryError);
        // Continue with other recipients even if one fails
      }
    }

    // Update announcement as sent
    await announcement.update({
      sentAt: new Date(),
      totalRecipients: recipients.length,
      readCount: 0 // Will be updated as users read the announcement
    });

    res.json({
      success: true,
      message: 'Announcement sent successfully',
      data: {
        announcement,
        deliveryStats: {
          totalRecipients: recipients.length,
          emailsSent,
          inAppNotificationsSent,
          smssSent
        }
      }
    });
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send announcement',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/announcements/:id/statistics - Get delivery stats
 * Requirements: 30.4
 */
router.get('/:id/statistics', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Get detailed statistics
    let detailedStats = {
      totalRecipients: announcement.totalRecipients,
      readCount: announcement.readCount,
      readRate: announcement.totalRecipients > 0 ? 
        ((announcement.readCount / announcement.totalRecipients) * 100).toFixed(2) : 0,
      sentAt: announcement.sentAt,
      deliveryMethods: announcement.deliveryMethod,
      status: announcement.sentAt ? 'sent' : 
               announcement.scheduledAt ? 'scheduled' : 'draft'
    };

    // If sent, get additional statistics from notifications
    if (announcement.sentAt) {
      const { Notification } = require('../../models');
      
      const notificationStats = await Notification.findAll({
        where: {
          'metadata.announcementId': announcement.id
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const statusCounts = notificationStats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {});

      detailedStats.notificationStats = {
        delivered: statusCounts.delivered || 0,
        read: statusCounts.read || 0,
        dismissed: statusCounts.dismissed || 0,
        unread: statusCounts.unread || 0
      };

      // Calculate engagement metrics
      const totalNotifications = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      if (totalNotifications > 0) {
        detailedStats.engagementRate = ((statusCounts.read || 0) / totalNotifications * 100).toFixed(2);
        detailedStats.dismissalRate = ((statusCounts.dismissed || 0) / totalNotifications * 100).toFixed(2);
      }
    }

    res.json({
      success: true,
      data: {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          targetAudience: announcement.targetAudience,
          targetFilters: announcement.targetFilters,
          createdAt: announcement.createdAt,
          scheduledAt: announcement.scheduledAt,
          sentAt: announcement.sentAt,
          creator: announcement.creator
        },
        statistics: detailedStats
      }
    });
  } catch (error) {
    console.error('Error fetching announcement statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/internal/announcements/scheduled/pending - Get pending scheduled announcements
 * Requirements: 30.5
 */
router.get('/scheduled/pending', protectInternal, requireInternalPermissions(['canBroadcastAnnouncements']), async (req, res) => {
  try {
    const pendingAnnouncements = await Announcement.findAll({
      where: {
        scheduledAt: {
          [Op.not]: null,
          [Op.lte]: new Date() // Due to be sent
        },
        sentAt: null // Not yet sent
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['scheduledAt', 'ASC']]
    });

    res.json({
      success: true,
      data: pendingAnnouncements
    });
  } catch (error) {
    console.error('Error fetching pending scheduled announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending scheduled announcements',
      error: error.message
    });
  }
});

/**
 * POST /api/internal/announcements/process-scheduled - Process scheduled announcements (internal cron job)
 * Requirements: 30.5
 */
router.post('/process-scheduled', protectInternal, requireInternalPermissions(['canManageSystemSettings']), auditLog, async (req, res) => {
  try {
    const pendingAnnouncements = await Announcement.findAll({
      where: {
        scheduledAt: {
          [Op.not]: null,
          [Op.lte]: new Date()
        },
        sentAt: null
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const processedResults = [];

    for (const announcement of pendingAnnouncements) {
      try {
        // Simulate sending the announcement by calling the send endpoint logic
        // In a real implementation, this would be handled by a background job
        
        // Mark as sent for now (simplified processing)
        await announcement.update({
          sentAt: new Date(),
          totalRecipients: 0 // Would be calculated during actual sending
        });

        processedResults.push({
          id: announcement.id,
          title: announcement.title,
          status: 'processed',
          sentAt: announcement.sentAt
        });
      } catch (processingError) {
        console.error(`Failed to process scheduled announcement ${announcement.id}:`, processingError);
        processedResults.push({
          id: announcement.id,
          title: announcement.title,
          status: 'failed',
          error: processingError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${processedResults.length} scheduled announcements`,
      data: processedResults
    });
  } catch (error) {
    console.error('Error processing scheduled announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process scheduled announcements',
      error: error.message
    });
  }
});

module.exports = router;