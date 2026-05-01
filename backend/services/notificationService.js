/**
 * Notification Service - Backward Compatibility Layer
 * 
 * This file re-exports the modular notification service for backward compatibility.
 * The notification system has been refactored into separate category-based modules:
 * 
 * - notifications/BaseNotificationService.js - Core functionality
 * - notifications/PropertyClaimNotifications.js - Property claim notifications
 * - notifications/BookingNotifications.js - Booking notifications
 * - notifications/PaymentNotifications.js - Payment notifications
 * - notifications/InternalStaffNotifications.js - Internal staff notifications
 * - notifications/HotelCheckoutNotifications.js - Hotel checkout notifications
 * - notifications/constants.js - Shared constants
 * - notifications/index.js - Main entry point
 * 
 * All existing imports of this file will continue to work.
 */

// Re-export everything from the modular notification service
const notificationService = require('./notifications');

// Export the singleton instance as default
module.exports = notificationService;

// Also export named exports for backward compatibility
module.exports.NotificationService = notificationService.NotificationService;
module.exports.NotificationScheduler = notificationService.NotificationScheduler;
module.exports.NOTIFICATION_TYPES = notificationService.NOTIFICATION_TYPES;
module.exports.PRIORITY_MAP = notificationService.PRIORITY_MAP;
module.exports.DEFAULT_CHANNELS = notificationService.DEFAULT_CHANNELS;
module.exports.CRITICAL_NOTIFICATION_TYPES = notificationService.CRITICAL_NOTIFICATION_TYPES;
module.exports.BATCHING_CONFIG = notificationService.BATCHING_CONFIG;
module.exports.RETRY_CONFIG = notificationService.RETRY_CONFIG;
