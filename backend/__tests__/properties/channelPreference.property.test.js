/**
 * Property Tests: Channel Preference Enforcement
 * 
 * Property 17: Channel Preference Enforcement
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.6
 * 
 * For any notification type and user preference combination, if a channel is disabled
 * for that notification type, the notification service shall not send via that channel
 * (except for critical system alerts).
 * 
 * Feature: notification-system, Property 17: Channel Preference Enforcement
 */

const fc = require('fast-check');

/**
 * Channel Preference validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const ChannelPreferenceValidation = {
  // All supported notification types
  NOTIFICATION_TYPES: {
    // Property Claims
    PROPERTY_CLAIM_SUBMITTED: 'property_claim_submitted',
    PROPERTY_CLAIM_APPROVED: 'property_claim_approved',
    PROPERTY_CLAIM_REJECTED: 'property_claim_rejected',
    
    // Bookings
    BOOKING_CREATED: 'booking_created',
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_CANCELLED: 'booking_cancelled',
    BOOKING_MODIFIED: 'booking_modified',
    CHECK_IN_COMPLETED: 'check_in_completed',
    CHECK_OUT_COMPLETED: 'check_out_completed',
    
    // Payments
    PAYMENT_REMINDER_7_DAY: 'payment_reminder_7_day',
    PAYMENT_REMINDER_3_DAY: 'payment_reminder_3_day',
    PAYMENT_REMINDER_1_DAY: 'payment_reminder_1_day',
    PAYMENT_OVERDUE: 'payment_overdue',
    PAYMENT_RECEIVED: 'payment_received',
    CHECKOUT_REMINDER: 'checkout_reminder',
    
    // Internal Staff
    LEAD_ASSIGNED: 'lead_assigned',
    APPROVAL_REQUIRED: 'approval_required',
    TICKET_CREATED: 'ticket_created',
    ZERO_OCCUPANCY_ALERT: 'zero_occupancy_alert',
    PAYMENT_FAILURE_ALERT: 'payment_failure_alert',
    
    // Summaries
    DAILY_SUMMARY_OWNER: 'daily_summary_owner',
    DAILY_SUMMARY_MANAGER: 'daily_summary_manager'
  },

  // Critical notification types that bypass user preferences
  CRITICAL_NOTIFICATION_TYPES: [
    'payment_failure_alert',
    'zero_occupancy_alert',
    'payment_overdue'
  ],

  // All supported channels
  ALL_CHANNELS: ['email', 'sms', 'in_app', 'push'],

  /**
   * Check if a notification type is critical (bypasses user preferences)
   * Requirements: 7.6
   */
  isCriticalNotification(type) {
    return this.CRITICAL_NOTIFICATION_TYPES.includes(type);
  },

  /**
   * Create a user preference object
   */
  createPreference(options = {}) {
    return {
      emailEnabled: options.emailEnabled !== undefined ? options.emailEnabled : true,
      smsEnabled: options.smsEnabled !== undefined ? options.smsEnabled : true,
      inAppEnabled: options.inAppEnabled !== undefined ? options.inAppEnabled : true,
      pushEnabled: options.pushEnabled !== undefined ? options.pushEnabled : true,
      quietHoursStart: options.quietHoursStart || null,
      quietHoursEnd: options.quietHoursEnd || null,
      digestMode: options.digestMode || 'immediate',
      language: options.language || 'en'
    };
  },

  /**
   * Check if a channel is enabled in preferences
   * Requirements: 7.1, 7.2, 7.3
   */
  isChannelEnabled(preference, channel) {
    if (!preference) return true; // Default to enabled if no preference
    
    switch (channel) {
      case 'email':
        return preference.emailEnabled;
      case 'sms':
        return preference.smsEnabled;
      case 'in_app':
        return preference.inAppEnabled;
      case 'push':
        return preference.pushEnabled;
      default:
        return true;
    }
  },

  /**
   * Apply user preferences to filter channels
   * Requirements: 7.1, 7.2, 7.3, 7.6
   * 
   * @param {string} notificationType - The type of notification
   * @param {string[]} defaultChannels - Default channels for this notification type
   * @param {Object} preference - User's notification preferences
   * @returns {string[]} Filtered channels based on preferences
   */
  applyPreferences(notificationType, defaultChannels, preference) {
    // Critical notifications bypass preferences
    if (this.isCriticalNotification(notificationType)) {
      return defaultChannels;
    }

    // If no preference, return default channels
    if (!preference) {
      return defaultChannels;
    }

    // Filter channels based on user preferences
    return defaultChannels.filter(channel => this.isChannelEnabled(preference, channel));
  },

  /**
   * Get enabled channels from preference
   */
  getEnabledChannels(preference) {
    const channels = [];
    if (preference.emailEnabled) channels.push('email');
    if (preference.smsEnabled) channels.push('sms');
    if (preference.inAppEnabled) channels.push('in_app');
    if (preference.pushEnabled) channels.push('push');
    return channels;
  }
};

describe('Property Tests: Channel Preference Enforcement', () => {
  /**
   * Property 17: Channel Preference Enforcement
   * 
   * For any notification type and user preference combination, if a channel is disabled
   * for that notification type, the notification service shall not send via that channel
   * (except for critical system alerts).
   * 
   * Validates: Requirements 7.1, 7.2, 7.3, 7.6
   */
  describe('Property 17: Channel Preference Enforcement', () => {
    
    test('Property 17a: Disabled channels are excluded from non-critical notifications', () => {
      fc.assert(
        fc.property(
          // Generate notification type (non-critical)
          fc.constantFrom(
            'property_claim_submitted',
            'property_claim_approved',
            'booking_created',
            'booking_confirmed',
            'payment_reminder_7_day',
            'lead_assigned',
            'daily_summary_owner'
          ),
          // Generate default channels
          fc.array(
            fc.constantFrom('email', 'sms', 'in_app', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => [...new Set(arr)]), // Remove duplicates
          // Generate user preferences
          fc.record({
            emailEnabled: fc.boolean(),
            smsEnabled: fc.boolean(),
            inAppEnabled: fc.boolean(),
            pushEnabled: fc.boolean()
          }),
          (notificationType, defaultChannels, preferenceFlags) => {
            const preference = ChannelPreferenceValidation.createPreference(preferenceFlags);
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: Result channels should only contain enabled channels
            resultChannels.forEach(channel => {
              expect(ChannelPreferenceValidation.isChannelEnabled(preference, channel)).toBe(true);
            });

            // Property: Disabled channels should not be in result
            defaultChannels.forEach(channel => {
              if (!ChannelPreferenceValidation.isChannelEnabled(preference, channel)) {
                expect(resultChannels).not.toContain(channel);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17b: Critical notifications bypass user preferences', () => {
      fc.assert(
        fc.property(
          // Generate critical notification type
          fc.constantFrom('payment_failure_alert', 'zero_occupancy_alert', 'payment_overdue'),
          // Generate default channels
          fc.array(
            fc.constantFrom('email', 'sms', 'in_app', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => [...new Set(arr)]),
          // Generate user preferences (all disabled)
          fc.record({
            emailEnabled: fc.constant(false),
            smsEnabled: fc.constant(false),
            inAppEnabled: fc.constant(false),
            pushEnabled: fc.constant(false)
          }),
          (notificationType, defaultChannels, preferenceFlags) => {
            const preference = ChannelPreferenceValidation.createPreference(preferenceFlags);
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: Critical notifications should return all default channels
            // regardless of user preferences
            expect(resultChannels).toEqual(defaultChannels);
            expect(resultChannels.length).toBe(defaultChannels.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17c: Email preference enforcement', () => {
      fc.assert(
        fc.property(
          // Generate non-critical notification type
          fc.constantFrom(
            'property_claim_submitted',
            'booking_created',
            'payment_reminder_7_day'
          ),
          // Email enabled/disabled
          fc.boolean(),
          (notificationType, emailEnabled) => {
            const preference = ChannelPreferenceValidation.createPreference({ emailEnabled });
            const defaultChannels = ['email', 'sms', 'in_app'];
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: Email should be in result only if enabled
            if (emailEnabled) {
              expect(resultChannels).toContain('email');
            } else {
              expect(resultChannels).not.toContain('email');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17d: SMS preference enforcement', () => {
      fc.assert(
        fc.property(
          // Generate non-critical notification type
          fc.constantFrom(
            'property_claim_approved',
            'booking_cancelled',
            'payment_reminder_3_day'
          ),
          // SMS enabled/disabled
          fc.boolean(),
          (notificationType, smsEnabled) => {
            const preference = ChannelPreferenceValidation.createPreference({ smsEnabled });
            const defaultChannels = ['email', 'sms', 'in_app'];
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: SMS should be in result only if enabled
            if (smsEnabled) {
              expect(resultChannels).toContain('sms');
            } else {
              expect(resultChannels).not.toContain('sms');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17e: In-app preference enforcement', () => {
      fc.assert(
        fc.property(
          // Generate non-critical notification type
          fc.constantFrom(
            'booking_modified',
            'check_in_completed',
            'approval_required'
          ),
          // In-app enabled/disabled
          fc.boolean(),
          (notificationType, inAppEnabled) => {
            const preference = ChannelPreferenceValidation.createPreference({ inAppEnabled });
            const defaultChannels = ['email', 'sms', 'in_app'];
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: In-app should be in result only if enabled
            if (inAppEnabled) {
              expect(resultChannels).toContain('in_app');
            } else {
              expect(resultChannels).not.toContain('in_app');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17f: No preference defaults to all channels enabled', () => {
      fc.assert(
        fc.property(
          // Generate any notification type
          fc.constantFrom(
            'property_claim_submitted',
            'booking_created',
            'payment_reminder_7_day',
            'lead_assigned'
          ),
          // Generate default channels
          fc.array(
            fc.constantFrom('email', 'sms', 'in_app', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => [...new Set(arr)]),
          (notificationType, defaultChannels) => {
            // No preference (null)
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              null
            );

            // Property: Without preferences, all default channels should be returned
            expect(resultChannels).toEqual(defaultChannels);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17g: All channels disabled results in empty array for non-critical', () => {
      fc.assert(
        fc.property(
          // Generate non-critical notification type
          fc.constantFrom(
            'property_claim_submitted',
            'booking_created',
            'daily_summary_owner'
          ),
          // Generate default channels
          fc.array(
            fc.constantFrom('email', 'sms', 'in_app', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => [...new Set(arr)]),
          (notificationType, defaultChannels) => {
            // All channels disabled
            const preference = ChannelPreferenceValidation.createPreference({
              emailEnabled: false,
              smsEnabled: false,
              inAppEnabled: false,
              pushEnabled: false
            });
            
            const resultChannels = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );

            // Property: All channels disabled should result in empty array
            expect(resultChannels).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 17h: Preference filtering is idempotent', () => {
      fc.assert(
        fc.property(
          // Generate notification type
          fc.constantFrom(
            'property_claim_submitted',
            'booking_created',
            'payment_reminder_7_day'
          ),
          // Generate default channels
          fc.array(
            fc.constantFrom('email', 'sms', 'in_app', 'push'),
            { minLength: 1, maxLength: 4 }
          ).map(arr => [...new Set(arr)]),
          // Generate user preferences
          fc.record({
            emailEnabled: fc.boolean(),
            smsEnabled: fc.boolean(),
            inAppEnabled: fc.boolean(),
            pushEnabled: fc.boolean()
          }),
          (notificationType, defaultChannels, preferenceFlags) => {
            const preference = ChannelPreferenceValidation.createPreference(preferenceFlags);
            
            // Apply preferences once
            const firstResult = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              defaultChannels,
              preference
            );
            
            // Apply preferences again on the result
            const secondResult = ChannelPreferenceValidation.applyPreferences(
              notificationType,
              firstResult,
              preference
            );

            // Property: Applying preferences twice should give same result (idempotent)
            expect(secondResult).toEqual(firstResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
