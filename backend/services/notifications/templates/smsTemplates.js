/**
 * SMS Templates for All Notification Types
 * 
 * SMS templates with strict 160 character limits.
 * Supports English and Hindi localization.
 * 
 * Requirements: 10.3, 10.4
 */

const { NOTIFICATION_TYPES } = require('../constants');

const MAX_SMS_LENGTH = 160;

/**
 * SMS Templates - English
 * Each template is designed to be under 160 characters
 */
const SMS_TEMPLATES_EN = {
  // Property Claims
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: 
    'GoRoomz: New property claim for {{propertyName}} submitted. Review required. Login to admin panel.',
  
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: 
    'GoRoomz: Your claim for {{propertyName}} is approved! Login to complete setup: {{url}}',
  
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: 
    'GoRoomz: Your claim for {{propertyName}} was not approved. Check email for details.',

  // Bookings
  [NOTIFICATION_TYPES.BOOKING_CREATED]: 
    'GoRoomz: New booking! {{guestName}} booked {{propertyName}} for {{checkIn}}. View details in app.',
  
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 
    'GoRoomz: Booking confirmed! Ref: {{bookingRef}}. Check-in: {{checkIn}} at {{propertyName}}.',
  
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 
    'GoRoomz: Booking {{bookingRef}} cancelled. Guest: {{guestName}}. Check app for details.',
  
  [NOTIFICATION_TYPES.BOOKING_MODIFIED]: 
    'GoRoomz: Booking {{bookingRef}} modified. New dates: {{newCheckIn}} - {{newCheckOut}}.',
  
  [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: 
    'GoRoomz: {{guestName}} checked in to Room {{roomNumber}} at {{propertyName}}.',
  
  [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: 
    'GoRoomz: {{guestName}} checked out. Room {{roomNumber}}. Final: {{finalAmount}}.',

  // Payments
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: 
    'GoRoomz: Payment of {{amount}} due in 7 days for {{propertyName}}. Pay now to avoid late fees.',
  
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: 
    'GoRoomz: Payment of {{amount}} due in 3 days for {{propertyName}}. Pay now: {{url}}',
  
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: 
    'URGENT GoRoomz: {{amount}} due TOMORROW for {{propertyName}}. Pay immediately: {{url}}',
  
  [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 
    'OVERDUE GoRoomz: {{amount}} is {{daysOverdue}} days overdue. Pay now to avoid service issues.',
  
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 
    'GoRoomz: Payment of {{amount}} received. Thank you! Ref: {{transactionId}}.',
  
  [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: 
    'GoRoomz: Checkout today! Balance: {{outstandingBalance}}. Please settle before leaving.',

  // Internal Staff
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: 
    'GoRoomz: New lead assigned! {{leadName}} - {{leadPhone}}. Priority: {{priority}}. Check app.',
  
  [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: 
    'GoRoomz: Approval needed for {{itemType}}. Login to review and approve.',
  
  [NOTIFICATION_TYPES.TICKET_CREATED]: 
    'GoRoomz: New ticket #{{ticketId}}: {{subject}}. Priority: {{priority}}.',
  
  [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: 
    'ALERT GoRoomz: {{propertyName}} has 0 occupancy for {{daysEmpty}} days. Action needed.',
  
  [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: 
    'ALERT GoRoomz: Payment failed for {{guestName}}. Amount: {{amount}}. Check immediately.',

  // Daily Summaries (not typically sent via SMS, but included for completeness)
  [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: 
    'GoRoomz Daily: {{todayCheckIns}} check-ins, {{todayCheckOuts}} check-outs. Occupancy: {{occupancyRate}}%.',
  
  [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: 
    'GoRoomz Daily: {{totalProperties}} properties, {{averageOccupancy}}% avg occupancy, {{newBookings}} bookings.',

  // Website Guest
  [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: 
    'GoRoomz: Booking request received! Ref: {{bookingRef}}. We will confirm shortly.',
  
  [NOTIFICATION_TYPES.BOOKING_REJECTED]: 
    'GoRoomz: Sorry, your booking for {{propertyName}} could not be confirmed. Try other dates.',
  
  [NOTIFICATION_TYPES.CHECKIN_REMINDER]: 
    'GoRoomz: Check-in tomorrow at {{propertyName}}! Address: {{propertyAddress}}. Call: {{contactPhone}}.',
  
  [NOTIFICATION_TYPES.STAY_COMPLETED]: 
    'GoRoomz: Thanks for staying at {{propertyName}}! Share your feedback: {{url}}'
};


/**
 * SMS Templates - Hindi
 * Each template is designed to be under 160 characters
 * Note: Hindi characters may use more bytes, so templates are kept shorter
 */
const SMS_TEMPLATES_HI = {
  // Property Claims
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: 
    'GoRoomz: {{propertyName}} के लिए नया दावा। समीक्षा आवश्यक।',
  
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: 
    'GoRoomz: {{propertyName}} का दावा स्वीकृत! सेटअप पूरा करें: {{url}}',
  
  [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: 
    'GoRoomz: {{propertyName}} का दावा अस्वीकृत। ईमेल देखें।',

  // Bookings
  [NOTIFICATION_TYPES.BOOKING_CREATED]: 
    'GoRoomz: नई बुकिंग! {{guestName}} ने {{propertyName}} बुक किया।',
  
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 
    'GoRoomz: बुकिंग पुष्टि! Ref: {{bookingRef}}. चेक-इन: {{checkIn}}.',
  
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 
    'GoRoomz: बुकिंग {{bookingRef}} रद्द। अतिथि: {{guestName}}.',
  
  [NOTIFICATION_TYPES.BOOKING_MODIFIED]: 
    'GoRoomz: बुकिंग {{bookingRef}} बदली। नई तिथि: {{newCheckIn}}.',
  
  [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: 
    'GoRoomz: {{guestName}} कमरा {{roomNumber}} में चेक-इन।',
  
  [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: 
    'GoRoomz: {{guestName}} चेक-आउट। राशि: {{finalAmount}}.',

  // Payments
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: 
    'GoRoomz: {{amount}} 7 दिन में देय। अभी भुगतान करें।',
  
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: 
    'GoRoomz: {{amount}} 3 दिन में देय। भुगतान करें: {{url}}',
  
  [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: 
    'तत्काल GoRoomz: {{amount}} कल देय! अभी भुगतान करें।',
  
  [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 
    'अतिदेय GoRoomz: {{amount}} {{daysOverdue}} दिन अतिदेय। तुरंत भुगतान करें।',
  
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 
    'GoRoomz: {{amount}} भुगतान प्राप्त। धन्यवाद! Ref: {{transactionId}}.',
  
  [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: 
    'GoRoomz: आज चेक-आउट! बकाया: {{outstandingBalance}}. कृपया भुगतान करें।',

  // Internal Staff
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: 
    'GoRoomz: नया लीड! {{leadName}} - {{leadPhone}}. ऐप देखें।',
  
  [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: 
    'GoRoomz: {{itemType}} के लिए अनुमोदन आवश्यक।',
  
  [NOTIFICATION_TYPES.TICKET_CREATED]: 
    'GoRoomz: नया टिकट #{{ticketId}}: {{subject}}.',
  
  [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: 
    'चेतावनी GoRoomz: {{propertyName}} {{daysEmpty}} दिन खाली।',
  
  [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: 
    'चेतावनी GoRoomz: {{guestName}} का भुगतान विफल। राशि: {{amount}}.',

  // Daily Summaries
  [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: 
    'GoRoomz: {{todayCheckIns}} चेक-इन, {{todayCheckOuts}} चेक-आउट। अधिभोग: {{occupancyRate}}%.',
  
  [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: 
    'GoRoomz: {{totalProperties}} संपत्ति, {{averageOccupancy}}% अधिभोग।',

  // Website Guest
  [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: 
    'GoRoomz: बुकिंग अनुरोध प्राप्त! Ref: {{bookingRef}}. जल्द पुष्टि होगी।',
  
  [NOTIFICATION_TYPES.BOOKING_REJECTED]: 
    'GoRoomz: {{propertyName}} की बुकिंग अस्वीकृत। अन्य तिथि आज़माएं।',
  
  [NOTIFICATION_TYPES.CHECKIN_REMINDER]: 
    'GoRoomz: कल चेक-इन! {{propertyName}}. फोन: {{contactPhone}}.',
  
  [NOTIFICATION_TYPES.STAY_COMPLETED]: 
    'GoRoomz: {{propertyName}} में रहने के लिए धन्यवाद! प्रतिक्रिया दें: {{url}}'
};


/**
 * Replace template placeholders with actual data
 * @param {string} template - Template string with {{placeholder}} syntax
 * @param {Object} data - Data object with values to replace
 * @returns {string} Rendered template
 */
function replacePlaceholders(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}

/**
 * Format currency for SMS (shorter format)
 */
function formatCurrencyShort(amount) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

/**
 * Format date for SMS (shorter format)
 */
function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' });
  return `${day} ${month}`;
}

/**
 * Truncate text to fit within character limit
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Prepare data for SMS template (format values appropriately)
 */
function prepareSmsData(data) {
  const prepared = { ...data };
  
  // Format amounts
  if (prepared.amount !== undefined) {
    prepared.amount = formatCurrencyShort(prepared.amount);
  }
  if (prepared.finalAmount !== undefined) {
    prepared.finalAmount = formatCurrencyShort(prepared.finalAmount);
  }
  if (prepared.outstandingBalance !== undefined) {
    prepared.outstandingBalance = formatCurrencyShort(prepared.outstandingBalance);
  }
  
  // Format dates
  if (prepared.checkIn) {
    prepared.checkIn = formatDateShort(prepared.checkIn);
  }
  if (prepared.checkOut) {
    prepared.checkOut = formatDateShort(prepared.checkOut);
  }
  if (prepared.newCheckIn) {
    prepared.newCheckIn = formatDateShort(prepared.newCheckIn);
  }
  if (prepared.newCheckOut) {
    prepared.newCheckOut = formatDateShort(prepared.newCheckOut);
  }
  if (prepared.dueDate) {
    prepared.dueDate = formatDateShort(prepared.dueDate);
  }
  
  // Truncate long text fields
  if (prepared.propertyName) {
    prepared.propertyName = truncateText(prepared.propertyName, 25);
  }
  if (prepared.guestName) {
    prepared.guestName = truncateText(prepared.guestName, 20);
  }
  if (prepared.leadName) {
    prepared.leadName = truncateText(prepared.leadName, 20);
  }
  if (prepared.subject) {
    prepared.subject = truncateText(prepared.subject, 30);
  }
  if (prepared.propertyAddress) {
    prepared.propertyAddress = truncateText(prepared.propertyAddress, 40);
  }
  
  return prepared;
}


/**
 * Get SMS template for a notification type
 * @param {string} type - Notification type
 * @param {string} language - Language code ('en' or 'hi')
 * @returns {string} Template string
 */
function getSmsTemplate(type, language = 'en') {
  const templates = language === 'hi' ? SMS_TEMPLATES_HI : SMS_TEMPLATES_EN;
  return templates[type] || SMS_TEMPLATES_EN[type] || null;
}

/**
 * Render SMS template with data
 * @param {string} type - Notification type
 * @param {Object} data - Data to populate template
 * @param {string} language - Language code ('en' or 'hi')
 * @returns {Object} Rendered SMS with text and metadata
 */
function renderSmsTemplate(type, data, language = 'en') {
  const template = getSmsTemplate(type, language);
  
  if (!template) {
    throw new Error(`No SMS template found for notification type: ${type}`);
  }
  
  const preparedData = prepareSmsData(data);
  let renderedText = replacePlaceholders(template, preparedData);
  
  // Ensure SMS is within character limit
  const originalLength = renderedText.length;
  if (renderedText.length > MAX_SMS_LENGTH) {
    // Try to truncate intelligently
    renderedText = truncateText(renderedText, MAX_SMS_LENGTH);
  }
  
  return {
    text: renderedText,
    length: renderedText.length,
    originalLength,
    truncated: originalLength > MAX_SMS_LENGTH,
    segments: Math.ceil(renderedText.length / MAX_SMS_LENGTH),
    language,
    type
  };
}

/**
 * Validate SMS template length
 * @param {string} type - Notification type
 * @param {Object} sampleData - Sample data to test with
 * @param {string} language - Language code
 * @returns {Object} Validation result
 */
function validateSmsTemplate(type, sampleData = {}, language = 'en') {
  try {
    const result = renderSmsTemplate(type, sampleData, language);
    return {
      valid: result.length <= MAX_SMS_LENGTH,
      length: result.length,
      maxLength: MAX_SMS_LENGTH,
      overflow: Math.max(0, result.length - MAX_SMS_LENGTH),
      text: result.text
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Get all SMS templates for validation
 */
function getAllSmsTemplates() {
  return {
    en: SMS_TEMPLATES_EN,
    hi: SMS_TEMPLATES_HI
  };
}

module.exports = {
  renderSmsTemplate,
  getSmsTemplate,
  validateSmsTemplate,
  getAllSmsTemplates,
  prepareSmsData,
  truncateText,
  formatCurrencyShort,
  formatDateShort,
  MAX_SMS_LENGTH,
  SMS_TEMPLATES_EN,
  SMS_TEMPLATES_HI
};
