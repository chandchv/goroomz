/**
 * Template Engine for Notification System
 * 
 * Provides unified interface for rendering notification templates
 * across all channels (email, SMS, in-app) with localization support.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

const { renderEmailTemplate, getStrings, getActionUrl, isMarketingEmail } = require('./emailTemplates');
const { renderSmsTemplate, validateSmsTemplate, MAX_SMS_LENGTH } = require('./smsTemplates');
const { NOTIFICATION_TYPES } = require('../constants');

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['en', 'hi'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Template Engine Class
 * Handles rendering of notification templates across all channels
 */
class TemplateEngine {
  constructor() {
    this.defaultLanguage = DEFAULT_LANGUAGE;
    this.supportedLanguages = SUPPORTED_LANGUAGES;
  }

  /**
   * Validate language code and return supported language
   * @param {string} language - Language code
   * @returns {string} Valid language code
   */
  validateLanguage(language) {
    if (!language || !this.supportedLanguages.includes(language)) {
      return this.defaultLanguage;
    }
    return language;
  }

  /**
   * Render email template for a notification type
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code ('en' or 'hi')
   * @returns {Promise<string>} Rendered HTML email
   */
  async renderEmailTemplate(type, data, language = 'en') {
    const validLanguage = this.validateLanguage(language);
    
    try {
      const html = renderEmailTemplate(type, data, validLanguage);
      return html;
    } catch (error) {
      console.error(`Error rendering email template for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Render SMS template for a notification type
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code ('en' or 'hi')
   * @returns {Promise<Object>} Rendered SMS with metadata
   */
  async renderSmsTemplate(type, data, language = 'en') {
    const validLanguage = this.validateLanguage(language);
    
    try {
      const result = renderSmsTemplate(type, data, validLanguage);
      return result;
    } catch (error) {
      console.error(`Error rendering SMS template for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Render in-app notification template
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string} language - Language code ('en' or 'hi')
   * @returns {Promise<Object>} In-app notification object
   */
  async renderInAppTemplate(type, data, language = 'en') {
    const validLanguage = this.validateLanguage(language);
    const strings = getStrings(type, validLanguage);
    const actionUrl = getActionUrl(type, data);
    
    return {
      type,
      title: this.interpolate(strings.title || type, data),
      message: this.interpolate(strings.body || '', data),
      actionUrl,
      actionText: strings.actionButton || 'View',
      language: validLanguage,
      data
    };
  }

  /**
   * Simple string interpolation for in-app templates
   * @param {string} template - Template string
   * @param {Object} data - Data object
   * @returns {string} Interpolated string
   */
  interpolate(template, data) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }


  /**
   * Get template for a specific notification type and channel
   * @param {string} type - Notification type
   * @param {string} channel - Channel ('email', 'sms', 'in_app')
   * @param {string} language - Language code
   * @returns {Object} Template information
   */
  getTemplate(type, channel, language = 'en') {
    const validLanguage = this.validateLanguage(language);
    
    return {
      type,
      channel,
      language: validLanguage,
      exists: this.templateExists(type, channel),
      isMarketing: channel === 'email' ? isMarketingEmail(type) : false
    };
  }

  /**
   * Check if a template exists for a notification type and channel
   * @param {string} type - Notification type
   * @param {string} channel - Channel
   * @returns {boolean} Whether template exists
   */
  templateExists(type, channel) {
    const validTypes = Object.values(NOTIFICATION_TYPES);
    if (!validTypes.includes(type)) {
      return false;
    }
    
    // All notification types have templates for all channels
    return ['email', 'sms', 'in_app', 'push'].includes(channel);
  }

  /**
   * Validate template data for a notification type
   * @param {string} type - Notification type
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validateTemplateData(type, data) {
    const requiredFields = this.getRequiredFields(type);
    const missingFields = [];
    const warnings = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        missingFields.push(field);
      }
    }
    
    // Check SMS length if applicable
    try {
      const smsValidation = validateSmsTemplate(type, data);
      if (!smsValidation.valid && smsValidation.overflow) {
        warnings.push(`SMS template exceeds ${MAX_SMS_LENGTH} characters by ${smsValidation.overflow}`);
      }
    } catch (e) {
      // SMS validation failed, add warning
      warnings.push(`SMS template validation failed: ${e.message}`);
    }
    
    return {
      valid: missingFields.length === 0,
      missingFields,
      warnings,
      type
    };
  }

  /**
   * Get required fields for a notification type
   * @param {string} type - Notification type
   * @returns {string[]} Required field names
   */
  getRequiredFields(type) {
    const fieldMap = {
      // Property Claims
      [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: ['propertyName', 'claimantName'],
      [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: ['propertyName'],
      [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: ['propertyName', 'rejectionReason'],
      
      // Bookings
      [NOTIFICATION_TYPES.BOOKING_CREATED]: ['propertyName', 'guestName', 'checkIn', 'checkOut'],
      [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: ['bookingRef', 'propertyName', 'checkIn', 'checkOut'],
      [NOTIFICATION_TYPES.BOOKING_CANCELLED]: ['bookingRef', 'guestName'],
      [NOTIFICATION_TYPES.BOOKING_MODIFIED]: ['bookingRef', 'originalCheckIn', 'newCheckIn'],
      [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: ['guestName', 'roomNumber'],
      [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: ['guestName', 'roomNumber', 'finalAmount'],
      
      // Payments
      [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: ['amount', 'dueDate', 'propertyName'],
      [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: ['amount', 'dueDate', 'propertyName'],
      [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: ['amount', 'dueDate', 'propertyName'],
      [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: ['amount', 'daysOverdue', 'propertyName'],
      [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: ['amount', 'transactionId'],
      [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: ['outstandingBalance', 'propertyName'],
      
      // Internal Staff
      [NOTIFICATION_TYPES.LEAD_ASSIGNED]: ['leadName', 'leadPhone'],
      [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: ['itemType'],
      [NOTIFICATION_TYPES.TICKET_CREATED]: ['ticketId', 'subject'],
      [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: ['propertyName', 'daysEmpty'],
      [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: ['guestName', 'amount'],
      
      // Daily Summaries
      [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: ['todayCheckIns', 'todayCheckOuts'],
      [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: ['totalProperties', 'averageOccupancy'],
      
      // Website Guest
      [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: ['bookingRef', 'propertyName'],
      [NOTIFICATION_TYPES.BOOKING_REJECTED]: ['propertyName'],
      [NOTIFICATION_TYPES.CHECKIN_REMINDER]: ['propertyName', 'propertyAddress'],
      [NOTIFICATION_TYPES.STAY_COMPLETED]: ['propertyName']
    };
    
    return fieldMap[type] || [];
  }


  /**
   * Render all channel templates for a notification
   * @param {string} type - Notification type
   * @param {Object} data - Template data
   * @param {string[]} channels - Channels to render
   * @param {string} language - Language code
   * @returns {Promise<Object>} Rendered templates by channel
   */
  async renderAllChannels(type, data, channels = ['email', 'sms', 'in_app'], language = 'en') {
    const results = {};
    const errors = [];
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            results.email = await this.renderEmailTemplate(type, data, language);
            break;
          case 'sms':
            results.sms = await this.renderSmsTemplate(type, data, language);
            break;
          case 'in_app':
            results.in_app = await this.renderInAppTemplate(type, data, language);
            break;
          case 'push':
            // Push uses same format as in_app
            results.push = await this.renderInAppTemplate(type, data, language);
            break;
          default:
            errors.push({ channel, error: `Unknown channel: ${channel}` });
        }
      } catch (error) {
        errors.push({ channel, error: error.message });
      }
    }
    
    return {
      type,
      language,
      channels: Object.keys(results),
      templates: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get supported languages
   * @returns {string[]} Supported language codes
   */
  getSupportedLanguages() {
    return [...this.supportedLanguages];
  }

  /**
   * Check if a language is supported
   * @param {string} language - Language code
   * @returns {boolean} Whether language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Get action URL for a notification type
   * @param {string} type - Notification type
   * @param {Object} data - Data containing IDs for URL
   * @returns {string} Action URL
   */
  getActionUrl(type, data) {
    return getActionUrl(type, data);
  }

  /**
   * Check if notification type requires unsubscribe link
   * @param {string} type - Notification type
   * @returns {boolean} Whether unsubscribe is required
   */
  requiresUnsubscribe(type) {
    return isMarketingEmail(type);
  }
}

// Export singleton instance and class
const templateEngine = new TemplateEngine();

module.exports = TemplateEngine;
module.exports.templateEngine = templateEngine;
module.exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
module.exports.DEFAULT_LANGUAGE = DEFAULT_LANGUAGE;
