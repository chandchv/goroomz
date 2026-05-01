/**
 * Notification Service - Main Entry Point
 * 
 * This module aggregates all notification services and provides a unified interface.
 * The notification system is split into categories for better maintainability:
 * 
 * - BaseNotificationService: Core functionality, email/SMS/in-app delivery
 * - PropertyClaimNotifications: Property claim submission, approval, rejection
 * - BookingNotifications: Booking creation, check-in, check-out, modifications
 * - PaymentNotifications: Payment reminders, receipts, overdue alerts
 * - InternalStaffNotifications: Lead assignments, approvals, tickets, alerts
 * - HotelCheckoutNotifications: Hotel-specific checkout reminders and receipts
 * - NotificationScheduler: Scheduled jobs for payment reminders, daily summaries, etc.
 */

const BaseNotificationService = require('./BaseNotificationService');
const PropertyClaimNotifications = require('./PropertyClaimNotifications');
const BookingNotifications = require('./BookingNotifications');
const PaymentNotifications = require('./PaymentNotifications');
const InternalStaffNotifications = require('./InternalStaffNotifications');
const HotelCheckoutNotifications = require('./HotelCheckoutNotifications');
const WebsiteGuestNotifications = require('./WebsiteGuestNotifications');
const NotificationScheduler = require('./NotificationScheduler');

// Re-export constants
const {
  NOTIFICATION_TYPES,
  PRIORITY_MAP,
  DEFAULT_CHANNELS,
  CRITICAL_NOTIFICATION_TYPES,
  BATCHING_CONFIG,
  RETRY_CONFIG
} = require('./constants');

/**
 * Unified Notification Service
 * Combines all notification categories into a single service
 */
class NotificationService extends BaseNotificationService {
  constructor() {
    super();
    
    // Initialize category services
    this.propertyClaims = new PropertyClaimNotifications(this);
    this.bookings = new BookingNotifications(this);
    this.payments = new PaymentNotifications(this);
    this.internalStaff = new InternalStaffNotifications(this);
    this.hotelCheckout = new HotelCheckoutNotifications(this);
    this.websiteGuest = new WebsiteGuestNotifications(this);
    
    // Initialize scheduler (but don't start it automatically)
    this.scheduler = new NotificationScheduler(this);
  }

  /**
   * Start the notification scheduler
   */
  startScheduler() {
    this.scheduler.start();
  }

  /**
   * Stop the notification scheduler
   */
  stopScheduler() {
    this.scheduler.stop();
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus() {
    return this.scheduler.getStatus();
  }

  /**
   * Manually trigger a scheduled job
   */
  async triggerScheduledJob(jobName) {
    return this.scheduler.triggerJob(jobName);
  }

  // ==================== Property Claims ====================
  
  async sendPropertyClaimSubmittedNotification(claim) {
    return this.propertyClaims.sendPropertyClaimSubmittedNotification(claim);
  }

  async sendPropertyClaimApprovedNotification(claim) {
    return this.propertyClaims.sendPropertyClaimApprovedNotification(claim);
  }

  async sendPropertyClaimRejectedNotification(claim, reason) {
    return this.propertyClaims.sendPropertyClaimRejectedNotification(claim, reason);
  }

  // ==================== Bookings ====================
  
  async sendBookingCreatedNotification(booking) {
    return this.bookings.sendBookingCreatedNotification(booking);
  }

  async sendCheckInNotification(booking) {
    return this.bookings.sendCheckInNotification(booking);
  }

  async sendCheckOutNotification(booking, checkoutSummary) {
    return this.bookings.sendCheckOutNotification(booking, checkoutSummary);
  }

  async sendBookingCancelledNotification(booking, cancellationDetails) {
    return this.bookings.sendBookingCancelledNotification(booking, cancellationDetails);
  }

  async sendBookingModifiedNotification(booking, originalDates) {
    return this.bookings.sendBookingModifiedNotification(booking, originalDates);
  }

  async sendOnlineBookingCreatedNotification(bookingData) {
    return this.bookings.sendOnlineBookingCreatedNotification(bookingData);
  }

  async sendBookingConfirmedNotification(booking) {
    return this.bookings.sendBookingConfirmedNotification(booking);
  }

  // ==================== Payments ====================
  
  async sendPaymentReminderNotification(booking, daysUntilDue) {
    return this.payments.sendPaymentReminderNotification(booking, daysUntilDue);
  }

  async sendPaymentOverdueNotification(booking, daysOverdue) {
    return this.payments.sendPaymentOverdueNotification(booking, daysOverdue);
  }

  async sendPaymentReceivedNotification(payment, booking) {
    return this.payments.sendPaymentReceivedNotification(payment, booking);
  }

  // ==================== Internal Staff ====================
  
  async sendInternalLeadAssignedNotification(lead, agent) {
    return this.internalStaff.sendInternalLeadAssignedNotification(lead, agent);
  }

  async sendApprovalRequiredNotification(lead, approvalType) {
    return this.internalStaff.sendApprovalRequiredNotification(lead, approvalType);
  }

  async sendTicketNotification(ticket, action) {
    return this.internalStaff.sendTicketNotification(ticket, action);
  }

  async sendZeroOccupancyAlert(property, daysWithZeroOccupancy) {
    return this.internalStaff.sendZeroOccupancyAlert(property, daysWithZeroOccupancy);
  }

  async sendPaymentFailureAlert(payment, booking, failureReason) {
    return this.internalStaff.sendPaymentFailureAlert(payment, booking, failureReason);
  }

  // ==================== Hotel Checkout ====================
  
  async sendCheckoutReminderNotification(booking, reminderType) {
    return this.hotelCheckout.sendCheckoutReminderNotification(booking, reminderType);
  }

  async sendCheckoutExtendedNotification(booking, originalCheckoutDate, additionalCharges) {
    return this.hotelCheckout.sendCheckoutExtendedNotification(booking, originalCheckoutDate, additionalCharges);
  }

  async sendPaymentReceiptNotification(payment, booking) {
    return this.hotelCheckout.sendPaymentReceiptNotification(payment, booking);
  }

  // ==================== Website Guest ====================
  
  async sendBookingRequestNotification(booking) {
    return this.websiteGuest.sendBookingRequestNotification(booking);
  }

  async sendBookingConfirmedToGuestNotification(booking, checkInInstructions) {
    return this.websiteGuest.sendBookingConfirmedNotification(booking, checkInInstructions);
  }

  async sendBookingRejectedNotification(booking, rejectionDetails) {
    return this.websiteGuest.sendBookingRejectedNotification(booking, rejectionDetails);
  }

  async sendCheckInReminderNotification(booking) {
    return this.websiteGuest.sendCheckInReminderNotification(booking);
  }

  async sendStayCompletedNotification(booking, feedbackUrl) {
    return this.websiteGuest.sendStayCompletedNotification(booking, feedbackUrl);
  }

  // ==================== Preference Management ====================

  /**
   * Get user preferences for a specific notification type
   */
  async getUserPreferencesForType(userId, type) {
    return this.getUserPreferences(userId, type);
  }

  /**
   * Check if a specific channel is enabled for a user
   */
  async isChannelEnabledForUser(userId, type, channel) {
    return this.isChannelEnabled(userId, type, channel);
  }

  /**
   * Check if notification should be held due to quiet hours
   */
  async shouldHoldForQuietHours(userId, type, priority) {
    const scheduledTime = await this.checkQuietHours(userId, type, priority);
    return scheduledTime !== null;
  }

  /**
   * Get the digest mode for a user
   */
  async getUserDigestMode(userId, type) {
    return this.getDigestMode(userId, type);
  }

  /**
   * Get the preferred language for a user
   */
  async getUserPreferredLanguage(userId, type) {
    return this.getPreferredLanguage(userId, type);
  }
}

// Create singleton instance
const notificationServiceInstance = new NotificationService();

module.exports = notificationServiceInstance;
module.exports.NotificationService = NotificationService;
module.exports.NotificationScheduler = NotificationScheduler;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.PRIORITY_MAP = PRIORITY_MAP;
module.exports.DEFAULT_CHANNELS = DEFAULT_CHANNELS;
module.exports.CRITICAL_NOTIFICATION_TYPES = CRITICAL_NOTIFICATION_TYPES;
module.exports.BATCHING_CONFIG = BATCHING_CONFIG;
module.exports.RETRY_CONFIG = RETRY_CONFIG;
