/**
 * Base Notification Service
 * 
 * Core functionality for notification delivery including:
 * - Email, SMS, and in-app notification delivery
 * - User preference management
 * - Quiet hours handling
 * - Notification batching
 * - Retry logic with exponential backoff
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (err) {
  console.warn('Nodemailer not available:', err.message);
  nodemailer = null;
}

const { User, Notification, NotificationPreference } = require('../../models');
const {
  NOTIFICATION_TYPES,
  PRIORITY_MAP,
  DEFAULT_CHANNELS,
  CRITICAL_NOTIFICATION_TYPES,
  BATCHING_CONFIG,
  RETRY_CONFIG
} = require('./constants');

// Import template engine
let TemplateEngine, templateEngine;
try {
  const templates = require('./templates');
  TemplateEngine = templates.TemplateEngine;
  templateEngine = templates.templateEngine;
} catch (err) {
  console.warn('Template engine not available:', err.message);
  TemplateEngine = null;
  templateEngine = null;
}

class BaseNotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
    
    // Template engine
    this.templateEngine = templateEngine;
    
    // Expose constants
    this.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
    this.PRIORITY_MAP = PRIORITY_MAP;
    this.DEFAULT_CHANNELS = DEFAULT_CHANNELS;
    this.CRITICAL_NOTIFICATION_TYPES = CRITICAL_NOTIFICATION_TYPES;
    this.BATCHING_CONFIG = BATCHING_CONFIG;
    this.RETRY_CONFIG = RETRY_CONFIG;
    
    // Batching queue
    this.batchingQueue = new Map();
  }

  /**
   * Initialize email transporter with configuration
   */
  initializeEmailTransporter() {
    try {
      if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
        console.warn('Nodemailer not properly loaded - email notifications will be disabled');
        return;
      }
      
      const transportConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false
      };

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transportConfig.auth = {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        };
      }

      this.emailTransporter = nodemailer.createTransport(transportConfig);
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.emailTransporter = null;
    }
  }

  /**
   * Get priority for a notification type
   */
  getPriorityForType(type) {
    return PRIORITY_MAP[type] || 'medium';
  }

  /**
   * Get default channels for a notification type
   */
  getDefaultChannelsForType(type) {
    return DEFAULT_CHANNELS[type] || ['in_app'];
  }

  /**
   * Check if a notification type is critical
   */
  isCriticalNotification(type) {
    return CRITICAL_NOTIFICATION_TYPES.includes(type);
  }

  /**
   * Check if current time is within user's quiet hours
   */
  isWithinQuietHours(preference, currentTime = new Date()) {
    if (!preference || !preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }

    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    const start = preference.quietHoursStart;
    const end = preference.quietHoursEnd;

    if (start > end) {
      return currentTimeStr >= start || currentTimeStr < end;
    }
    
    return currentTimeStr >= start && currentTimeStr < end;
  }

  /**
   * Get user preferences for a specific notification type
   * Returns the preference object with all settings
   */
  async getUserPreferences(userId, type) {
    try {
      const preference = await NotificationPreference.getPreferenceForType(userId, type);
      return preference;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Check if a specific channel is enabled for a user and notification type
   * Critical notifications bypass user preferences
   */
  async isChannelEnabled(userId, type, channel) {
    // Critical notifications always use all channels
    if (this.isCriticalNotification(type)) {
      return true;
    }

    try {
      const preference = await this.getUserPreferences(userId, type);
      
      if (!preference) {
        return true; // Default to enabled if no preference exists
      }

      switch (channel) {
        case 'email': return preference.emailEnabled;
        case 'sms': return preference.smsEnabled;
        case 'in_app': return preference.inAppEnabled;
        case 'push': return preference.pushEnabled;
        default: return true;
      }
    } catch (error) {
      console.error('Error checking channel enabled:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Apply user preferences to determine final channels
   * Filters out disabled channels based on user preferences
   * Critical notifications bypass user preferences
   */
  async applyUserPreferences(userId, type, defaultChannels) {
    // Critical notifications bypass user preferences
    if (this.isCriticalNotification(type)) {
      return defaultChannels;
    }

    try {
      const preference = await NotificationPreference.getPreferenceForType(userId, type);
      
      if (!preference) {
        return defaultChannels;
      }

      const enabledChannels = defaultChannels.filter(channel => {
        switch (channel) {
          case 'email': return preference.emailEnabled;
          case 'sms': return preference.smsEnabled;
          case 'in_app': return preference.inAppEnabled;
          case 'push': return preference.pushEnabled;
          default: return true;
        }
      });

      return enabledChannels;
    } catch (error) {
      console.error('Error applying user preferences:', error);
      return defaultChannels;
    }
  }

  /**
   * Check if notification should be held due to quiet hours
   * Returns the scheduled time if notification should be held, null otherwise
   * Urgent notifications bypass quiet hours
   */
  async checkQuietHours(userId, type, priority, currentTime = new Date()) {
    // Urgent notifications bypass quiet hours
    if (priority === 'urgent') {
      return null;
    }

    // Critical notifications bypass quiet hours
    if (this.isCriticalNotification(type)) {
      return null;
    }

    try {
      const preference = await this.getUserPreferences(userId, type);
      
      if (!preference || !preference.quietHoursStart || !preference.quietHoursEnd) {
        return null;
      }

      if (this.isWithinQuietHours(preference, currentTime)) {
        // Calculate when quiet hours end
        const endHour = parseInt(preference.quietHoursEnd.split(':')[0], 10);
        const endMinute = parseInt(preference.quietHoursEnd.split(':')[1], 10);
        
        const scheduledTime = new Date(currentTime);
        scheduledTime.setHours(endHour, endMinute, 0, 0);
        
        // If end time is before current time, it means quiet hours end tomorrow
        if (scheduledTime <= currentTime) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        return scheduledTime;
      }

      return null;
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return null;
    }
  }

  /**
   * Get the digest mode for a user and notification type
   * Returns 'immediate', 'daily', or 'weekly'
   */
  async getDigestMode(userId, type) {
    try {
      const preference = await this.getUserPreferences(userId, type);
      return preference?.digestMode || 'immediate';
    } catch (error) {
      console.error('Error getting digest mode:', error);
      return 'immediate';
    }
  }

  /**
   * Get the preferred language for a user
   */
  async getPreferredLanguage(userId, type) {
    try {
      const preference = await this.getUserPreferences(userId, type);
      return preference?.language || 'en';
    } catch (error) {
      console.error('Error getting preferred language:', error);
      return 'en';
    }
  }

  /**
   * Render email template using the template engine
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code
   * @returns {Promise<string>} Rendered HTML email
   */
  async renderEmailTemplate(type, data, language = 'en') {
    if (!this.templateEngine) {
      // Fallback to simple HTML if template engine not available
      return `<html><body><h1>${data.title || type}</h1><p>${data.message || ''}</p></body></html>`;
    }
    
    try {
      return await this.templateEngine.renderEmailTemplate(type, data, language);
    } catch (error) {
      console.error(`Error rendering email template for ${type}:`, error);
      // Fallback to simple HTML
      return `<html><body><h1>${data.title || type}</h1><p>${data.message || ''}</p></body></html>`;
    }
  }

  /**
   * Render SMS template using the template engine
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code
   * @returns {Promise<Object>} Rendered SMS with metadata
   */
  async renderSmsTemplate(type, data, language = 'en') {
    if (!this.templateEngine) {
      // Fallback to simple text if template engine not available
      const text = this.stripHtmlTags(data.message || '').substring(0, 160);
      return { text, length: text.length, truncated: false };
    }
    
    try {
      return await this.templateEngine.renderSmsTemplate(type, data, language);
    } catch (error) {
      console.error(`Error rendering SMS template for ${type}:`, error);
      // Fallback to simple text
      const text = this.stripHtmlTags(data.message || '').substring(0, 160);
      return { text, length: text.length, truncated: false };
    }
  }

  /**
   * Render in-app notification template
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code
   * @returns {Promise<Object>} In-app notification object
   */
  async renderInAppTemplate(type, data, language = 'en') {
    if (!this.templateEngine) {
      return {
        type,
        title: data.title || type,
        message: data.message || '',
        actionUrl: data.actionUrl || '',
        language
      };
    }
    
    try {
      return await this.templateEngine.renderInAppTemplate(type, data, language);
    } catch (error) {
      console.error(`Error rendering in-app template for ${type}:`, error);
      return {
        type,
        title: data.title || type,
        message: data.message || '',
        actionUrl: data.actionUrl || '',
        language
      };
    }
  }

  /**
   * Create a notification record in the database
   * Applies user preferences for channel filtering and quiet hours
   */
  async createNotification(data) {
    const {
      userId,
      type,
      title,
      message,
      metadata = {},
      scheduledFor = null,
      priority = null,
      channels = null
    } = data;

    if (!userId) throw new Error('userId is required');
    if (!type) throw new Error('type is required');
    if (!title) throw new Error('title is required');
    if (!message) throw new Error('message is required');

    const notificationPriority = priority || this.getPriorityForType(type);
    let notificationChannels = channels || this.getDefaultChannelsForType(type);
    
    // Apply user preferences to filter channels (Requirements 7.1, 7.2, 7.3, 7.6)
    notificationChannels = await this.applyUserPreferences(userId, type, notificationChannels);

    // Check quiet hours for non-urgent notifications (Requirement 7.4)
    if (!scheduledFor) {
      const quietHoursScheduledTime = await this.checkQuietHours(userId, type, notificationPriority);
      
      if (quietHoursScheduledTime) {
        // Schedule notification for after quiet hours end
        return await Notification.create({
          userId,
          type,
          title,
          message,
          priority: notificationPriority,
          status: 'pending',
          channels: Array.isArray(notificationChannels) ? notificationChannels : [notificationChannels || 'in_app'],
          metadata: {
            ...metadata,
            heldForQuietHours: true,
            originalRequestTime: new Date().toISOString()
          },
          scheduledFor
        });
      }
    }

    return await Notification.create({
      userId,
      type,
      title,
      message,
      priority: notificationPriority,
      status: 'pending',
      channels: Array.isArray(notificationChannels) ? notificationChannels : [notificationChannels || 'in_app'],
      metadata,
      scheduledFor
    });
  }

  /**
   * Send a notification via all configured channels
   */
  async sendNotificationById(notificationOrId) {
    let notification;
    
    if (typeof notificationOrId === 'string') {
      notification = await Notification.findByPk(notificationOrId, {
        include: [{ model: User, as: 'user' }]
      });
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationOrId}`);
      }
    } else {
      notification = notificationOrId;
      if (!notification.user) {
        notification = await Notification.findByPk(notification.id, {
          include: [{ model: User, as: 'user' }]
        });
      }
    }

    if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
      return {
        notificationId: notification.id,
        status: 'scheduled',
        scheduledFor: notification.scheduledFor,
        channels: []
      };
    }

    const deliveryResult = {
      notificationId: notification.id,
      status: 'sent',
      channels: [],
      errors: []
    };

    const user = notification.user;
    
    // Get user's preferred language (Requirement 10.4)
    const language = await this.getPreferredLanguage(notification.userId, notification.type);
    
    // Prepare template data from notification metadata
    const templateData = {
      ...notification.metadata,
      title: notification.title,
      message: notification.message
    };
    
    // Render templates for each channel
    let emailHtml, smsResult;
    
    if (notification.channels.includes('email') && this.templateEngine) {
      try {
        emailHtml = await this.renderEmailTemplate(notification.type, templateData, language);
      } catch (e) {
        console.warn('Failed to render email template, using fallback:', e.message);
        emailHtml = notification.message;
      }
    }
    
    if (notification.channels.includes('sms') && this.templateEngine) {
      try {
        smsResult = await this.renderSmsTemplate(notification.type, templateData, language);
      } catch (e) {
        console.warn('Failed to render SMS template, using fallback:', e.message);
        smsResult = { text: this.stripHtmlTags(notification.message).substring(0, 160) };
      }
    }
    
    const content = {
      subject: notification.title,
      body: emailHtml || notification.message,
      smsText: smsResult?.text || this.stripHtmlTags(notification.message).substring(0, 160),
      priority: notification.priority,
      language
    };

    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'email':
            if (user?.email) {
              await this.sendEmailNotification(content, { email: user.email });
              await notification.updateDeliveryStatus(channel, 'sent');
              deliveryResult.channels.push({ channel: 'email', success: true });
            } else {
              await notification.updateDeliveryStatus(channel, 'failed', 'No email address');
              deliveryResult.channels.push({ channel: 'email', success: false, error: 'No email address' });
              deliveryResult.errors.push('email: No email address');
            }
            break;
            
          case 'sms':
            if (user?.phone) {
              await this.sendSMSNotification(content, { phone: user.phone });
              await notification.updateDeliveryStatus(channel, 'sent');
              deliveryResult.channels.push({ channel: 'sms', success: true });
            } else {
              await notification.updateDeliveryStatus(channel, 'failed', 'No phone number');
              deliveryResult.channels.push({ channel: 'sms', success: false, error: 'No phone number' });
              deliveryResult.errors.push('sms: No phone number');
            }
            break;
            
          case 'in_app':
            await notification.updateDeliveryStatus(channel, 'sent');
            deliveryResult.channels.push({ channel: 'in_app', success: true });
            break;
            
          case 'push':
            await notification.updateDeliveryStatus(channel, 'sent');
            deliveryResult.channels.push({ channel: 'push', success: true });
            break;
            
          default:
            await notification.updateDeliveryStatus(channel, 'failed', `Unknown channel: ${channel}`);
            deliveryResult.channels.push({ channel, success: false, error: `Unknown channel: ${channel}` });
            deliveryResult.errors.push(`${channel}: Unknown channel`);
        }
      } catch (error) {
        await notification.updateDeliveryStatus(channel, 'failed', error.message);
        deliveryResult.channels.push({ channel, success: false, error: error.message });
        deliveryResult.errors.push(`${channel}: ${error.message}`);
      }
    }

    const anySuccess = deliveryResult.channels.some(c => c.success);
    const allFailed = deliveryResult.channels.every(c => !c.success);

    if (allFailed) {
      notification.status = 'failed';
      deliveryResult.status = 'failed';
    } else {
      notification.status = 'sent';
      notification.sentAt = new Date();
    }

    await notification.save();
    this.logDeliveryAttempt(notification.id, deliveryResult);

    return deliveryResult;
  }

  /**
   * Log notification delivery attempt
   */
  logDeliveryAttempt(notificationId, result) {
    const logEntry = {
      notificationId,
      timestamp: new Date().toISOString(),
      status: result.status,
      channels: result.channels.map(c => ({
        channel: c.channel,
        status: c.success ? 'sent' : 'failed',
        error: c.error || null
      }))
    };

    console.log('Notification delivery attempt:', JSON.stringify(logEntry));
  }

  /**
   * Strip HTML tags from text
   */
  stripHtmlTags(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(content, recipient) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }
    
    const recipientEmail = recipient.user?.email || recipient.email;
    if (!recipientEmail) {
      throw new Error('No email address available for recipient');
    }
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@goroomz.com',
      to: recipientEmail,
      subject: content.subject,
      html: content.body
    };
    
    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  async sendSMSNotification(content, recipient) {
    const phoneNumber = recipient.user?.phone || recipient.phone;
    
    if (!phoneNumber) {
      throw new Error('No phone number available for recipient');
    }
    
    // Placeholder - would integrate with Twilio, AWS SNS, etc.
    console.log(`SMS to ${phoneNumber}: ${content.smsText}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(content, recipient) {
    if (!recipient.user?.id) {
      throw new Error('No user ID available for in-app notification');
    }
    
    const notificationData = {
      userId: recipient.user.id,
      type: 'notification',
      title: content.subject,
      message: this.stripHtmlTags(content.body),
      priority: content.priority,
      status: 'unread',
      deliveryMethod: ['in_app'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('In-app notification created:', notificationData);
  }


  /**
   * Add notification to batching queue
   */
  async addToBatchQueue(notificationData) {
    const { userId, type, priority } = notificationData;
    
    if (priority === 'urgent' || this.isCriticalNotification(type)) {
      const notification = await this.createNotification(notificationData);
      const result = await this.sendNotificationById(notification);
      return { batched: false, notification, result };
    }

    if (!BATCHING_CONFIG.ENABLED) {
      const notification = await this.createNotification(notificationData);
      const result = await this.sendNotificationById(notification);
      return { batched: false, notification, result };
    }

    let batchEntry = this.batchingQueue.get(userId);
    const now = new Date();

    if (!batchEntry) {
      batchEntry = {
        notifications: [],
        windowStart: now,
        timer: null
      };
      this.batchingQueue.set(userId, batchEntry);
    }

    const windowAge = now.getTime() - batchEntry.windowStart.getTime();
    if (windowAge >= BATCHING_CONFIG.WINDOW_MS) {
      await this.processBatch(userId);
      batchEntry = {
        notifications: [],
        windowStart: now,
        timer: null
      };
      this.batchingQueue.set(userId, batchEntry);
    }

    batchEntry.notifications.push(notificationData);

    if (batchEntry.timer) {
      clearTimeout(batchEntry.timer);
    }
    
    const remainingTime = BATCHING_CONFIG.WINDOW_MS - (now.getTime() - batchEntry.windowStart.getTime());
    batchEntry.timer = setTimeout(() => {
      this.processBatch(userId);
    }, remainingTime);

    return {
      batched: true,
      batchSize: batchEntry.notifications.length,
      windowStart: batchEntry.windowStart,
      windowEnd: new Date(batchEntry.windowStart.getTime() + BATCHING_CONFIG.WINDOW_MS)
    };
  }

  /**
   * Process a batch of notifications for a user
   */
  async processBatch(userId) {
    const batchEntry = this.batchingQueue.get(userId);
    
    if (!batchEntry || batchEntry.notifications.length === 0) {
      this.batchingQueue.delete(userId);
      return { processed: false, reason: 'No notifications in batch' };
    }

    if (batchEntry.timer) {
      clearTimeout(batchEntry.timer);
    }

    const notifications = batchEntry.notifications;
    const batchedNotificationIds = [];

    try {
      if (notifications.length === 1) {
        const notification = await this.createNotification(notifications[0]);
        batchedNotificationIds.push(notification.id);
        const result = await this.sendNotificationById(notification);
        
        this.batchingQueue.delete(userId);
        return {
          processed: true,
          batched: false,
          notificationCount: 1,
          notificationIds: batchedNotificationIds,
          result
        };
      }

      const combinedTitle = `You have ${notifications.length} new notifications`;
      const combinedMessage = this.generateBatchedMessage(notifications);
      
      const allChannels = new Set();
      notifications.forEach(n => {
        const channels = n.channels || this.getDefaultChannelsForType(n.type);
        channels.forEach(c => allChannels.add(c));
      });

      const priorities = ['low', 'medium', 'high', 'urgent'];
      let highestPriority = 'low';
      notifications.forEach(n => {
        const priority = n.priority || this.getPriorityForType(n.type);
        if (priorities.indexOf(priority) > priorities.indexOf(highestPriority)) {
          highestPriority = priority;
        }
      });

      for (const notifData of notifications) {
        const notification = await this.createNotification({
          ...notifData,
          metadata: {
            ...notifData.metadata,
            batched: true,
            batchedAt: new Date().toISOString()
          }
        });
        batchedNotificationIds.push(notification.id);
      }

      const summaryNotification = await this.createNotification({
        userId,
        type: notifications[0].type,
        title: combinedTitle,
        message: combinedMessage,
        priority: highestPriority,
        channels: Array.from(allChannels),
        metadata: {
          batched: true,
          batchedNotificationIds,
          batchedAt: new Date().toISOString(),
          originalNotificationCount: notifications.length
        }
      });

      const result = await this.sendNotificationById(summaryNotification);

      for (const notifId of batchedNotificationIds) {
        try {
          const notif = await Notification.findByPk(notifId);
          if (notif) {
            notif.status = result.status === 'sent' ? 'sent' : 'failed';
            notif.sentAt = result.status === 'sent' ? new Date() : null;
            notif.deliveryStatus = {
              ...notif.deliveryStatus,
              batchedDelivery: {
                summaryNotificationId: summaryNotification.id,
                status: result.status,
                timestamp: new Date().toISOString()
              }
            };
            await notif.save();
          }
        } catch (error) {
          console.error(`Failed to update batched notification ${notifId}:`, error);
        }
      }

      this.batchingQueue.delete(userId);
      
      return {
        processed: true,
        batched: true,
        notificationCount: notifications.length,
        notificationIds: batchedNotificationIds,
        summaryNotificationId: summaryNotification.id,
        result
      };

    } catch (error) {
      console.error('Error processing batch:', error);
      this.batchingQueue.delete(userId);
      throw error;
    }
  }

  /**
   * Generate combined message for batched notifications
   */
  generateBatchedMessage(notifications) {
    const lines = ['<h2>Notification Summary</h2>', '<ul>'];
    
    notifications.forEach((notif) => {
      lines.push(`<li><strong>${notif.title}</strong>: ${this.stripHtmlTags(notif.message).substring(0, 100)}${notif.message.length > 100 ? '...' : ''}</li>`);
    });
    
    lines.push('</ul>');
    lines.push('<p>Please check your dashboard for full details.</p>');
    
    return lines.join('\n');
  }

  /**
   * Retry a failed notification with exponential backoff
   */
  async retryNotification(notificationId) {
    const notification = await Notification.findByPk(notificationId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    if (!notification.canRetry()) {
      return {
        notificationId,
        retried: false,
        reason: notification.retryCount >= RETRY_CONFIG.MAX_RETRIES 
          ? 'Max retries exceeded' 
          : 'Notification not in failed status'
      };
    }

    const backoffDelay = this.calculateBackoffDelay(notification.retryCount);
    await notification.incrementRetry();

    console.log(`Retrying notification ${notificationId}, attempt ${notification.retryCount}, backoff: ${backoffDelay}ms`);

    notification.status = 'pending';
    await notification.save();

    try {
      const result = await this.sendNotificationById(notification);
      
      return {
        notificationId,
        retried: true,
        retryCount: notification.retryCount,
        backoffDelay,
        result
      };
    } catch (error) {
      notification.status = 'failed';
      await notification.save();

      return {
        notificationId,
        retried: true,
        retryCount: notification.retryCount,
        backoffDelay,
        error: error.message,
        canRetryAgain: notification.canRetry()
      };
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(retryCount) {
    if (retryCount >= RETRY_CONFIG.BACKOFF_DELAYS.length) {
      return RETRY_CONFIG.BACKOFF_DELAYS[RETRY_CONFIG.BACKOFF_DELAYS.length - 1];
    }
    return RETRY_CONFIG.BACKOFF_DELAYS[retryCount];
  }

  /**
   * Schedule a retry for a failed notification
   */
  async scheduleRetry(notificationId) {
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    if (!notification.canRetry()) {
      return {
        notificationId,
        scheduled: false,
        reason: notification.retryCount >= RETRY_CONFIG.MAX_RETRIES 
          ? 'Max retries exceeded' 
          : 'Notification not in failed status'
      };
    }

    const backoffDelay = this.calculateBackoffDelay(notification.retryCount);
    const scheduledTime = new Date(Date.now() + backoffDelay);

    notification.scheduledFor = scheduledTime;
    notification.metadata = {
      ...notification.metadata,
      scheduledRetry: {
        scheduledAt: new Date().toISOString(),
        scheduledFor: scheduledTime.toISOString(),
        retryAttempt: notification.retryCount + 1
      }
    };
    await notification.save();

    setTimeout(async () => {
      try {
        await this.retryNotification(notificationId);
      } catch (error) {
        console.error(`Scheduled retry failed for notification ${notificationId}:`, error);
      }
    }, backoffDelay);

    return {
      notificationId,
      scheduled: true,
      scheduledFor: scheduledTime,
      backoffDelay,
      retryAttempt: notification.retryCount + 1
    };
  }

  /**
   * Process all failed notifications that need retry
   */
  async processFailedNotifications() {
    try {
      const failedNotifications = await Notification.findAll({
        where: {
          status: 'failed',
          retryCount: {
            [require('sequelize').Op.lt]: RETRY_CONFIG.MAX_RETRIES
          }
        },
        order: [['createdAt', 'ASC']],
        limit: 100
      });

      const results = {
        total: failedNotifications.length,
        retried: 0,
        scheduled: 0,
        skipped: 0,
        errors: []
      };

      for (const notification of failedNotifications) {
        try {
          if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
            results.skipped++;
            continue;
          }

          const scheduleResult = await this.scheduleRetry(notification.id);
          if (scheduleResult.scheduled) {
            results.scheduled++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push({
            notificationId: notification.id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing failed notifications:', error);
      throw error;
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAllBatches() {
    const results = [];
    const userIds = Array.from(this.batchingQueue.keys());
    
    for (const userId of userIds) {
      try {
        const result = await this.processBatch(userId);
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ userId, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = BaseNotificationService;

