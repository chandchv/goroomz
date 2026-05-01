/**
 * Notification System Constants
 * 
 * Centralized configuration for notification types, priorities, channels, and settings.
 */

/**
 * Notification Types Enum
 * All supported notification types in the system
 */
const NOTIFICATION_TYPES = {
  // Property Claims - map to 'alert'
  PROPERTY_CLAIM_SUBMITTED: 'alert',
  PROPERTY_CLAIM_APPROVED: 'alert',
  PROPERTY_CLAIM_REJECTED: 'alert',
  
  // Bookings - map to 'alert'
  BOOKING_CREATED: 'alert',
  BOOKING_CONFIRMED: 'alert',
  BOOKING_CANCELLED: 'alert',
  BOOKING_MODIFIED: 'alert',
  CHECK_IN_COMPLETED: 'alert',
  CHECK_OUT_COMPLETED: 'alert',
  
  // Payments - map to 'reminder'
  PAYMENT_REMINDER_7_DAY: 'reminder',
  PAYMENT_REMINDER_3_DAY: 'reminder',
  PAYMENT_REMINDER_1_DAY: 'reminder',
  PAYMENT_OVERDUE: 'alert',
  PAYMENT_RECEIVED: 'alert',
  CHECKOUT_REMINDER: 'reminder',
  
  // Internal Staff
  LEAD_ASSIGNED: 'lead_assignment',
  APPROVAL_REQUIRED: 'approval_request',
  TICKET_CREATED: 'ticket_assignment',
  ZERO_OCCUPANCY_ALERT: 'alert',
  PAYMENT_FAILURE_ALERT: 'alert',
  
  // Summaries
  DAILY_SUMMARY_OWNER: 'announcement',
  DAILY_SUMMARY_MANAGER: 'announcement',
  
  // Website Guest
  BOOKING_REQUEST_RECEIVED: 'alert',
  BOOKING_REJECTED: 'alert',
  CHECKIN_REMINDER: 'reminder',
  STAY_COMPLETED: 'alert'
};

/**
 * Priority Map for automatic priority assignment
 * Maps notification types to their default priority levels
 */
const PRIORITY_MAP = {
  // Urgent priority
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: 'urgent',
  [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 'urgent',
  [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: 'urgent',
  
  // High priority
  [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: 'high',
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: 'high',
  [NOTIFICATION_TYPES.BOOKING_CREATED]: 'high',
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: 'high',
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 'high',
  [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: 'high',
  [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: 'high',
  
  // Medium priority
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: 'medium',
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: 'medium',
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: 'medium',
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: 'medium',
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'medium',
  [NOTIFICATION_TYPES.BOOKING_MODIFIED]: 'medium',
  [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: 'medium',
  [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: 'medium',
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'medium',
  [NOTIFICATION_TYPES.TICKET_CREATED]: 'medium',
  [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: 'medium',
  [NOTIFICATION_TYPES.BOOKING_REJECTED]: 'medium',
  [NOTIFICATION_TYPES.CHECKIN_REMINDER]: 'medium',
  [NOTIFICATION_TYPES.STAY_COMPLETED]: 'medium',
  
  // Low priority
  [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: 'low',
  [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: 'low'
};

/**
 * Default Channels Configuration
 * Maps notification types to their default delivery channels
 */
const DEFAULT_CHANNELS = {
  // Property Claims
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: ['email', 'in_app'],
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: ['email', 'sms'],
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: ['email'],
  
  // Bookings
  [NOTIFICATION_TYPES.BOOKING_CREATED]: ['email', 'in_app'],
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: ['email', 'in_app'],
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: ['email', 'in_app'],
  [NOTIFICATION_TYPES.BOOKING_MODIFIED]: ['in_app'],
  [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: ['in_app'],
  [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: ['in_app'],
  
  // Payments
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: ['email', 'sms'],
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: ['email', 'sms'],
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: ['email', 'sms'],
  [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: ['email', 'sms'],
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: ['email', 'sms'],
  [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: ['email', 'sms'],
  
  // Internal Staff
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: ['email', 'sms', 'in_app'],
  [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: ['in_app'],
  [NOTIFICATION_TYPES.TICKET_CREATED]: ['in_app'],
  [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: ['email', 'in_app'],
  [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: ['email', 'in_app'],
  
  // Summaries
  [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: ['email'],
  [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: ['email'],
  
  // Website Guest
  [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: ['email'],
  [NOTIFICATION_TYPES.BOOKING_REJECTED]: ['email'],
  [NOTIFICATION_TYPES.CHECKIN_REMINDER]: ['email', 'sms'],
  [NOTIFICATION_TYPES.STAY_COMPLETED]: ['email']
};

/**
 * Critical notification types that bypass user preferences
 * These are system-critical alerts that must always be delivered
 */
const CRITICAL_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT,
  NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT,
  NOTIFICATION_TYPES.PAYMENT_OVERDUE
];

/**
 * Batching configuration
 */
const BATCHING_CONFIG = {
  WINDOW_MS: 5 * 60 * 1000, // 5 minutes in milliseconds
  ENABLED: true
};

/**
 * Retry configuration with exponential backoff
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_DELAYS: [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000], // 1min, 5min, 15min
  ENABLED: true
};

module.exports = {
  NOTIFICATION_TYPES,
  PRIORITY_MAP,
  DEFAULT_CHANNELS,
  CRITICAL_NOTIFICATION_TYPES,
  BATCHING_CONFIG,
  RETRY_CONFIG
};
