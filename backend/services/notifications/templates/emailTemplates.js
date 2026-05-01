/**
 * Email Templates for All Notification Types
 * 
 * HTML email templates with consistent branding for all notification types.
 * Supports English and Hindi localization.
 * Includes unsubscribe links for marketing emails.
 * 
 * Requirements: 10.1, 10.2, 10.4, 10.5
 */

const { 
  generateBaseEmail, 
  formatCurrency, 
  formatDate, 
  formatTime,
  BASE_URL 
} = require('./baseEmailTemplate');

const { NOTIFICATION_TYPES } = require('../constants');

/**
 * Localized strings for email templates
 */
const STRINGS = {
  en: {
    // Property Claims
    propertyClaimSubmitted: {
      title: 'New Property Claim Submitted',
      greeting: 'Hello Admin,',
      body: 'A new property claim has been submitted and requires your review.',
      propertyName: 'Property Name',
      claimantName: 'Claimant Name',
      claimantEmail: 'Claimant Email',
      claimantPhone: 'Claimant Phone',
      submittedAt: 'Submitted At',
      actionButton: 'Review Claim'
    },
    propertyClaimApproved: {
      title: 'Property Claim Approved',
      greeting: 'Congratulations!',
      body: 'Your property claim has been approved. You can now manage your property on GoRoomz.',
      propertyName: 'Property Name',
      nextSteps: 'Next Steps',
      nextStepsContent: 'Log in to your dashboard to complete your property setup and start receiving bookings.',
      actionButton: 'Go to Dashboard'
    },
    propertyClaimRejected: {
      title: 'Property Claim Update',
      greeting: 'Hello,',
      body: 'We regret to inform you that your property claim has been rejected.',
      propertyName: 'Property Name',
      reason: 'Reason',
      contactSupport: 'If you believe this is an error, please contact our support team.',
      actionButton: 'Contact Support'
    },

    // Bookings
    bookingCreated: {
      title: 'New Booking Received',
      greeting: 'Hello,',
      body: 'You have received a new booking for your property.',
      propertyName: 'Property',
      guestName: 'Guest Name',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      roomType: 'Room Type',
      totalAmount: 'Total Amount',
      actionButton: 'View Booking'
    },
    bookingConfirmed: {
      title: 'Booking Confirmed',
      greeting: 'Great news!',
      body: 'Your booking has been confirmed.',
      bookingRef: 'Booking Reference',
      propertyName: 'Property',
      propertyAddress: 'Address',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      checkInInstructions: 'Check-in Instructions',
      actionButton: 'View Booking Details'
    },
    bookingCancelled: {
      title: 'Booking Cancelled',
      greeting: 'Hello,',
      body: 'A booking has been cancelled.',
      bookingRef: 'Booking Reference',
      guestName: 'Guest Name',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      cancellationReason: 'Reason',
      actionButton: 'View Details'
    },
    bookingModified: {
      title: 'Booking Modified',
      greeting: 'Hello,',
      body: 'A booking has been modified.',
      bookingRef: 'Booking Reference',
      originalDates: 'Original Dates',
      newDates: 'New Dates',
      actionButton: 'View Booking'
    },
    checkInCompleted: {
      title: 'Guest Checked In',
      greeting: 'Hello,',
      body: 'A guest has checked in to your property.',
      guestName: 'Guest Name',
      roomNumber: 'Room',
      checkInTime: 'Check-in Time',
      actionButton: 'View Details'
    },
    checkOutCompleted: {
      title: 'Guest Checked Out',
      greeting: 'Hello,',
      body: 'A guest has checked out from your property.',
      guestName: 'Guest Name',
      roomNumber: 'Room',
      checkOutTime: 'Check-out Time',
      finalAmount: 'Final Amount',
      actionButton: 'View Summary'
    },

    // Payments
    paymentReminder7Day: {
      title: 'Payment Reminder - Due in 7 Days',
      greeting: 'Hello,',
      body: 'This is a friendly reminder that your payment is due in 7 days.',
      amount: 'Amount Due',
      dueDate: 'Due Date',
      propertyName: 'Property',
      actionButton: 'Pay Now'
    },
    paymentReminder3Day: {
      title: 'Payment Reminder - Due in 3 Days',
      greeting: 'Hello,',
      body: 'Your payment is due in 3 days. Please ensure timely payment to avoid late fees.',
      amount: 'Amount Due',
      dueDate: 'Due Date',
      propertyName: 'Property',
      actionButton: 'Pay Now'
    },
    paymentReminder1Day: {
      title: 'URGENT: Payment Due Tomorrow',
      greeting: 'Hello,',
      body: 'Your payment is due tomorrow. Please make the payment immediately to avoid late fees.',
      amount: 'Amount Due',
      dueDate: 'Due Date',
      propertyName: 'Property',
      actionButton: 'Pay Now'
    },
    paymentOverdue: {
      title: 'Payment Overdue',
      greeting: 'Hello,',
      body: 'Your payment is overdue. Please make the payment immediately to avoid service interruption.',
      amount: 'Amount Overdue',
      daysOverdue: 'Days Overdue',
      propertyName: 'Property',
      actionButton: 'Pay Now'
    },
    paymentReceived: {
      title: 'Payment Received',
      greeting: 'Thank you!',
      body: 'We have received your payment.',
      amount: 'Amount Paid',
      paymentDate: 'Payment Date',
      transactionId: 'Transaction ID',
      propertyName: 'Property',
      actionButton: 'View Receipt'
    },
    checkoutReminder: {
      title: 'Checkout Reminder',
      greeting: 'Hello,',
      body: 'This is a reminder that your checkout is scheduled for today.',
      checkoutTime: 'Checkout Time',
      outstandingBalance: 'Outstanding Balance',
      propertyName: 'Property',
      actionButton: 'View Details'
    },

    // Internal Staff
    leadAssigned: {
      title: 'New Lead Assigned',
      greeting: 'Hello,',
      body: 'A new lead has been assigned to you.',
      leadName: 'Lead Name',
      leadPhone: 'Phone',
      leadEmail: 'Email',
      propertyInterest: 'Property Interest',
      priority: 'Priority',
      actionButton: 'View Lead'
    },
    approvalRequired: {
      title: 'Approval Required',
      greeting: 'Hello,',
      body: 'An item requires your approval.',
      itemType: 'Type',
      itemDescription: 'Description',
      requestedBy: 'Requested By',
      actionButton: 'Review & Approve'
    },
    ticketCreated: {
      title: 'New Support Ticket',
      greeting: 'Hello,',
      body: 'A new support ticket has been created.',
      ticketId: 'Ticket ID',
      subject: 'Subject',
      priority: 'Priority',
      createdBy: 'Created By',
      actionButton: 'View Ticket'
    },
    zeroOccupancyAlert: {
      title: 'Zero Occupancy Alert',
      greeting: 'Attention Required,',
      body: 'A property has had zero occupancy for 3 consecutive days.',
      propertyName: 'Property',
      daysEmpty: 'Days Empty',
      lastOccupied: 'Last Occupied',
      actionButton: 'View Property'
    },
    paymentFailureAlert: {
      title: 'Payment Failure Alert',
      greeting: 'Attention Required,',
      body: 'A payment has failed and requires attention.',
      guestName: 'Guest Name',
      amount: 'Amount',
      errorMessage: 'Error',
      propertyName: 'Property',
      actionButton: 'View Details'
    },

    // Daily Summaries
    dailySummaryOwner: {
      title: 'Daily Property Summary',
      greeting: 'Good morning!',
      body: 'Here is your daily summary for today.',
      todayCheckIns: "Today's Check-ins",
      todayCheckOuts: "Today's Check-outs",
      occupancyRate: 'Occupancy Rate',
      pendingPayments: 'Pending Payments',
      actionButton: 'View Dashboard'
    },
    dailySummaryManager: {
      title: 'Daily Territory Summary',
      greeting: 'Good morning!',
      body: 'Here is your daily territory performance summary.',
      totalProperties: 'Total Properties',
      averageOccupancy: 'Average Occupancy',
      newBookings: 'New Bookings',
      revenue: 'Revenue',
      actionButton: 'View Dashboard'
    },

    // Website Guest
    bookingRequestReceived: {
      title: 'Booking Request Received',
      greeting: 'Thank you for your booking request!',
      body: 'We have received your booking request and will confirm shortly.',
      bookingRef: 'Booking Reference',
      propertyName: 'Property',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      totalAmount: 'Total Amount',
      actionButton: 'View Booking'
    },
    bookingRejected: {
      title: 'Booking Request Update',
      greeting: 'Hello,',
      body: 'Unfortunately, your booking request could not be confirmed.',
      propertyName: 'Property',
      checkIn: 'Requested Check-in',
      checkOut: 'Requested Check-out',
      alternativeSuggestion: 'You may want to try alternative dates or properties.',
      actionButton: 'Search Properties'
    },
    checkinReminder: {
      title: 'Check-in Reminder',
      greeting: 'Hello,',
      body: 'Your check-in is tomorrow! Here are the details you need.',
      propertyName: 'Property',
      propertyAddress: 'Address',
      checkInTime: 'Check-in Time',
      contactPhone: 'Contact Phone',
      actionButton: 'View Booking'
    },
    stayCompleted: {
      title: 'Thank You for Staying with Us',
      greeting: 'Thank you!',
      body: 'We hope you enjoyed your stay. We would love to hear your feedback.',
      propertyName: 'Property',
      stayDuration: 'Stay Duration',
      feedbackRequest: 'Please take a moment to share your experience.',
      actionButton: 'Leave Feedback'
    }
  },

  hi: {
    // Property Claims
    propertyClaimSubmitted: {
      title: 'नई संपत्ति दावा प्रस्तुत',
      greeting: 'नमस्ते एडमिन,',
      body: 'एक नया संपत्ति दावा प्रस्तुत किया गया है और आपकी समीक्षा की आवश्यकता है।',
      propertyName: 'संपत्ति का नाम',
      claimantName: 'दावेदार का नाम',
      claimantEmail: 'दावेदार का ईमेल',
      claimantPhone: 'दावेदार का फोन',
      submittedAt: 'प्रस्तुत किया गया',
      actionButton: 'दावा देखें'
    },
    propertyClaimApproved: {
      title: 'संपत्ति दावा स्वीकृत',
      greeting: 'बधाई हो!',
      body: 'आपका संपत्ति दावा स्वीकृत हो गया है। अब आप GoRoomz पर अपनी संपत्ति का प्रबंधन कर सकते हैं।',
      propertyName: 'संपत्ति का नाम',
      nextSteps: 'अगले कदम',
      nextStepsContent: 'अपने डैशबोर्ड में लॉग इन करें और अपनी संपत्ति सेटअप पूरा करें।',
      actionButton: 'डैशबोर्ड पर जाएं'
    },
    propertyClaimRejected: {
      title: 'संपत्ति दावा अपडेट',
      greeting: 'नमस्ते,',
      body: 'हमें खेद है कि आपका संपत्ति दावा अस्वीकार कर दिया गया है।',
      propertyName: 'संपत्ति का नाम',
      reason: 'कारण',
      contactSupport: 'यदि आपको लगता है कि यह गलती है, तो कृपया हमारी सहायता टीम से संपर्क करें।',
      actionButton: 'सहायता से संपर्क करें'
    },

    // Bookings
    bookingCreated: {
      title: 'नई बुकिंग प्राप्त',
      greeting: 'नमस्ते,',
      body: 'आपकी संपत्ति के लिए एक नई बुकिंग प्राप्त हुई है।',
      propertyName: 'संपत्ति',
      guestName: 'अतिथि का नाम',
      checkIn: 'चेक-इन',
      checkOut: 'चेक-आउट',
      roomType: 'कमरे का प्रकार',
      totalAmount: 'कुल राशि',
      actionButton: 'बुकिंग देखें'
    },
    bookingConfirmed: {
      title: 'बुकिंग की पुष्टि',
      greeting: 'शुभ समाचार!',
      body: 'आपकी बुकिंग की पुष्टि हो गई है।',
      bookingRef: 'बुकिंग संदर्भ',
      propertyName: 'संपत्ति',
      propertyAddress: 'पता',
      checkIn: 'चेक-इन',
      checkOut: 'चेक-आउट',
      checkInInstructions: 'चेक-इन निर्देश',
      actionButton: 'बुकिंग विवरण देखें'
    },
    bookingCancelled: {
      title: 'बुकिंग रद्द',
      greeting: 'नमस्ते,',
      body: 'एक बुकिंग रद्द कर दी गई है।',
      bookingRef: 'बुकिंग संदर्भ',
      guestName: 'अतिथि का नाम',
      checkIn: 'चेक-इन',
      checkOut: 'चेक-आउट',
      cancellationReason: 'कारण',
      actionButton: 'विवरण देखें'
    },
    bookingModified: {
      title: 'बुकिंग संशोधित',
      greeting: 'नमस्ते,',
      body: 'एक बुकिंग संशोधित की गई है।',
      bookingRef: 'बुकिंग संदर्भ',
      originalDates: 'मूल तिथियां',
      newDates: 'नई तिथियां',
      actionButton: 'बुकिंग देखें'
    },
    checkInCompleted: {
      title: 'अतिथि चेक-इन',
      greeting: 'नमस्ते,',
      body: 'एक अतिथि ने आपकी संपत्ति में चेक-इन किया है।',
      guestName: 'अतिथि का नाम',
      roomNumber: 'कमरा',
      checkInTime: 'चेक-इन समय',
      actionButton: 'विवरण देखें'
    },
    checkOutCompleted: {
      title: 'अतिथि चेक-आउट',
      greeting: 'नमस्ते,',
      body: 'एक अतिथि ने आपकी संपत्ति से चेक-आउट किया है।',
      guestName: 'अतिथि का नाम',
      roomNumber: 'कमरा',
      checkOutTime: 'चेक-आउट समय',
      finalAmount: 'अंतिम राशि',
      actionButton: 'सारांश देखें'
    },

    // Payments
    paymentReminder7Day: {
      title: 'भुगतान अनुस्मारक - 7 दिन शेष',
      greeting: 'नमस्ते,',
      body: 'यह एक मित्रवत अनुस्मारक है कि आपका भुगतान 7 दिनों में देय है।',
      amount: 'देय राशि',
      dueDate: 'देय तिथि',
      propertyName: 'संपत्ति',
      actionButton: 'अभी भुगतान करें'
    },
    paymentReminder3Day: {
      title: 'भुगतान अनुस्मारक - 3 दिन शेष',
      greeting: 'नमस्ते,',
      body: 'आपका भुगतान 3 दिनों में देय है। विलंब शुल्क से बचने के लिए समय पर भुगतान करें।',
      amount: 'देय राशि',
      dueDate: 'देय तिथि',
      propertyName: 'संपत्ति',
      actionButton: 'अभी भुगतान करें'
    },
    paymentReminder1Day: {
      title: 'तत्काल: कल भुगतान देय',
      greeting: 'नमस्ते,',
      body: 'आपका भुगतान कल देय है। विलंब शुल्क से बचने के लिए तुरंत भुगतान करें।',
      amount: 'देय राशि',
      dueDate: 'देय तिथि',
      propertyName: 'संपत्ति',
      actionButton: 'अभी भुगतान करें'
    },
    paymentOverdue: {
      title: 'भुगतान अतिदेय',
      greeting: 'नमस्ते,',
      body: 'आपका भुगतान अतिदेय है। सेवा में रुकावट से बचने के लिए तुरंत भुगतान करें।',
      amount: 'अतिदेय राशि',
      daysOverdue: 'अतिदेय दिन',
      propertyName: 'संपत्ति',
      actionButton: 'अभी भुगतान करें'
    },
    paymentReceived: {
      title: 'भुगतान प्राप्त',
      greeting: 'धन्यवाद!',
      body: 'हमें आपका भुगतान प्राप्त हो गया है।',
      amount: 'भुगतान राशि',
      paymentDate: 'भुगतान तिथि',
      transactionId: 'लेनदेन आईडी',
      propertyName: 'संपत्ति',
      actionButton: 'रसीद देखें'
    },
    checkoutReminder: {
      title: 'चेक-आउट अनुस्मारक',
      greeting: 'नमस्ते,',
      body: 'यह एक अनुस्मारक है कि आपका चेक-आउट आज निर्धारित है।',
      checkoutTime: 'चेक-आउट समय',
      outstandingBalance: 'बकाया राशि',
      propertyName: 'संपत्ति',
      actionButton: 'विवरण देखें'
    },

    // Internal Staff
    leadAssigned: {
      title: 'नया लीड असाइन किया गया',
      greeting: 'नमस्ते,',
      body: 'आपको एक नया लीड असाइन किया गया है।',
      leadName: 'लीड का नाम',
      leadPhone: 'फोन',
      leadEmail: 'ईमेल',
      propertyInterest: 'संपत्ति रुचि',
      priority: 'प्राथमिकता',
      actionButton: 'लीड देखें'
    },
    approvalRequired: {
      title: 'अनुमोदन आवश्यक',
      greeting: 'नमस्ते,',
      body: 'एक आइटम को आपकी अनुमोदन की आवश्यकता है।',
      itemType: 'प्रकार',
      itemDescription: 'विवरण',
      requestedBy: 'अनुरोधकर्ता',
      actionButton: 'समीक्षा और अनुमोदन'
    },
    ticketCreated: {
      title: 'नया सहायता टिकट',
      greeting: 'नमस्ते,',
      body: 'एक नया सहायता टिकट बनाया गया है।',
      ticketId: 'टिकट आईडी',
      subject: 'विषय',
      priority: 'प्राथमिकता',
      createdBy: 'द्वारा बनाया गया',
      actionButton: 'टिकट देखें'
    },
    zeroOccupancyAlert: {
      title: 'शून्य अधिभोग चेतावनी',
      greeting: 'ध्यान आवश्यक,',
      body: 'एक संपत्ति में लगातार 3 दिनों से शून्य अधिभोग है।',
      propertyName: 'संपत्ति',
      daysEmpty: 'खाली दिन',
      lastOccupied: 'अंतिम अधिभोग',
      actionButton: 'संपत्ति देखें'
    },
    paymentFailureAlert: {
      title: 'भुगतान विफलता चेतावनी',
      greeting: 'ध्यान आवश्यक,',
      body: 'एक भुगतान विफल हो गया है और ध्यान देने की आवश्यकता है।',
      guestName: 'अतिथि का नाम',
      amount: 'राशि',
      errorMessage: 'त्रुटि',
      propertyName: 'संपत्ति',
      actionButton: 'विवरण देखें'
    },

    // Daily Summaries
    dailySummaryOwner: {
      title: 'दैनिक संपत्ति सारांश',
      greeting: 'सुप्रभात!',
      body: 'यहां आज के लिए आपका दैनिक सारांश है।',
      todayCheckIns: 'आज के चेक-इन',
      todayCheckOuts: 'आज के चेक-आउट',
      occupancyRate: 'अधिभोग दर',
      pendingPayments: 'लंबित भुगतान',
      actionButton: 'डैशबोर्ड देखें'
    },
    dailySummaryManager: {
      title: 'दैनिक क्षेत्र सारांश',
      greeting: 'सुप्रभात!',
      body: 'यहां आपका दैनिक क्षेत्र प्रदर्शन सारांश है।',
      totalProperties: 'कुल संपत्तियां',
      averageOccupancy: 'औसत अधिभोग',
      newBookings: 'नई बुकिंग',
      revenue: 'राजस्व',
      actionButton: 'डैशबोर्ड देखें'
    },

    // Website Guest
    bookingRequestReceived: {
      title: 'बुकिंग अनुरोध प्राप्त',
      greeting: 'आपके बुकिंग अनुरोध के लिए धन्यवाद!',
      body: 'हमें आपका बुकिंग अनुरोध प्राप्त हो गया है और जल्द ही पुष्टि करेंगे।',
      bookingRef: 'बुकिंग संदर्भ',
      propertyName: 'संपत्ति',
      checkIn: 'चेक-इन',
      checkOut: 'चेक-आउट',
      totalAmount: 'कुल राशि',
      actionButton: 'बुकिंग देखें'
    },
    bookingRejected: {
      title: 'बुकिंग अनुरोध अपडेट',
      greeting: 'नमस्ते,',
      body: 'दुर्भाग्य से, आपके बुकिंग अनुरोध की पुष्टि नहीं हो सकी।',
      propertyName: 'संपत्ति',
      checkIn: 'अनुरोधित चेक-इन',
      checkOut: 'अनुरोधित चेक-आउट',
      alternativeSuggestion: 'आप वैकल्पिक तिथियां या संपत्तियां आज़मा सकते हैं।',
      actionButton: 'संपत्तियां खोजें'
    },
    checkinReminder: {
      title: 'चेक-इन अनुस्मारक',
      greeting: 'नमस्ते,',
      body: 'आपका चेक-इन कल है! यहां आवश्यक विवरण हैं।',
      propertyName: 'संपत्ति',
      propertyAddress: 'पता',
      checkInTime: 'चेक-इन समय',
      contactPhone: 'संपर्क फोन',
      actionButton: 'बुकिंग देखें'
    },
    stayCompleted: {
      title: 'हमारे साथ रहने के लिए धन्यवाद',
      greeting: 'धन्यवाद!',
      body: 'हमें आशा है कि आपने अपने प्रवास का आनंद लिया। हम आपकी प्रतिक्रिया सुनना चाहेंगे।',
      propertyName: 'संपत्ति',
      stayDuration: 'प्रवास अवधि',
      feedbackRequest: 'कृपया अपना अनुभव साझा करने के लिए कुछ समय निकालें।',
      actionButton: 'प्रतिक्रिया दें'
    }
  }
};


/**
 * Get localized strings for a notification type
 */
function getStrings(type, language = 'en') {
  const lang = STRINGS[language] || STRINGS.en;
  const typeKey = getTypeKey(type);
  return lang[typeKey] || STRINGS.en[typeKey] || {};
}

/**
 * Convert notification type to template key
 */
function getTypeKey(type) {
  const typeMap = {
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: 'propertyClaimSubmitted',
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: 'propertyClaimApproved',
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: 'propertyClaimRejected',
    [NOTIFICATION_TYPES.BOOKING_CREATED]: 'bookingCreated',
    [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'bookingConfirmed',
    [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 'bookingCancelled',
    [NOTIFICATION_TYPES.BOOKING_MODIFIED]: 'bookingModified',
    [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: 'checkInCompleted',
    [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: 'checkOutCompleted',
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: 'paymentReminder7Day',
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: 'paymentReminder3Day',
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: 'paymentReminder1Day',
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 'paymentOverdue',
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'paymentReceived',
    [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: 'checkoutReminder',
    [NOTIFICATION_TYPES.LEAD_ASSIGNED]: 'leadAssigned',
    [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: 'approvalRequired',
    [NOTIFICATION_TYPES.TICKET_CREATED]: 'ticketCreated',
    [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: 'zeroOccupancyAlert',
    [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: 'paymentFailureAlert',
    [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: 'dailySummaryOwner',
    [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: 'dailySummaryManager',
    [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: 'bookingRequestReceived',
    [NOTIFICATION_TYPES.BOOKING_REJECTED]: 'bookingRejected',
    [NOTIFICATION_TYPES.CHECKIN_REMINDER]: 'checkinReminder',
    [NOTIFICATION_TYPES.STAY_COMPLETED]: 'stayCompleted'
  };
  return typeMap[type] || type;
}

/**
 * Check if notification type is marketing-related (requires unsubscribe)
 */
function isMarketingEmail(type) {
  const marketingTypes = [
    NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER,
    NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER,
    NOTIFICATION_TYPES.STAY_COMPLETED
  ];
  return marketingTypes.includes(type);
}


/**
 * Generate action URL for notification type
 */
function getActionUrl(type, data = {}) {
  const urlMap = {
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: `${BASE_URL}/admin/property-claims/${data.claimId || ''}`,
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: `${BASE_URL}/owner/dashboard`,
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: `${BASE_URL}/support`,
    [NOTIFICATION_TYPES.BOOKING_CREATED]: `${BASE_URL}/owner/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: `${BASE_URL}/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.BOOKING_CANCELLED]: `${BASE_URL}/owner/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.BOOKING_MODIFIED]: `${BASE_URL}/owner/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: `${BASE_URL}/owner/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: `${BASE_URL}/owner/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: `${BASE_URL}/payments/${data.paymentId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: `${BASE_URL}/payments/${data.paymentId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: `${BASE_URL}/payments/${data.paymentId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: `${BASE_URL}/payments/${data.paymentId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: `${BASE_URL}/payments/${data.paymentId || ''}/receipt`,
    [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: `${BASE_URL}/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.LEAD_ASSIGNED]: `${BASE_URL}/staff/leads/${data.leadId || ''}`,
    [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: `${BASE_URL}/staff/approvals/${data.approvalId || ''}`,
    [NOTIFICATION_TYPES.TICKET_CREATED]: `${BASE_URL}/staff/tickets/${data.ticketId || ''}`,
    [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: `${BASE_URL}/staff/properties/${data.propertyId || ''}`,
    [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: `${BASE_URL}/staff/payments/${data.paymentId || ''}`,
    [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: `${BASE_URL}/owner/dashboard`,
    [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: `${BASE_URL}/staff/dashboard`,
    [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: `${BASE_URL}/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.BOOKING_REJECTED]: `${BASE_URL}/search`,
    [NOTIFICATION_TYPES.CHECKIN_REMINDER]: `${BASE_URL}/bookings/${data.bookingId || ''}`,
    [NOTIFICATION_TYPES.STAY_COMPLETED]: `${BASE_URL}/feedback/${data.bookingId || ''}`
  };
  return urlMap[type] || BASE_URL;
}


/**
 * Render property claim submitted email
 */
function renderPropertyClaimSubmitted(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.claimantName}</td><td>${data.claimantName || 'N/A'}</td></tr>
        <tr><td>${s.claimantEmail}</td><td>${data.claimantEmail || 'N/A'}</td></tr>
        <tr><td>${s.claimantPhone}</td><td>${data.claimantPhone || 'N/A'}</td></tr>
        <tr><td>${s.submittedAt}</td><td>${formatDate(data.submittedAt || new Date(), language)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED, data) }
  });
}

/**
 * Render property claim approved email
 */
function renderPropertyClaimApproved(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight success">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
    <h3>${s.nextSteps}</h3>
    <p>${s.nextStepsContent}</p>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED, data) }
  });
}

/**
 * Render property claim rejected email
 */
function renderPropertyClaimRejected(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.reason}</td><td>${data.rejectionReason || 'N/A'}</td></tr>
      </table>
    </div>
    <p>${s.contactSupport}</p>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED, data) }
  });
}


/**
 * Render booking created email
 */
function renderBookingCreated(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_CREATED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.guestName}</td><td>${data.guestName || 'N/A'}</td></tr>
        <tr><td>${s.checkIn}</td><td>${formatDate(data.checkIn, language)}</td></tr>
        <tr><td>${s.checkOut}</td><td>${formatDate(data.checkOut, language)}</td></tr>
        <tr><td>${s.roomType}</td><td>${data.roomType || 'N/A'}</td></tr>
        <tr><td>${s.totalAmount}</td><td>${formatCurrency(data.totalAmount || 0)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_CREATED, data) }
  });
}

/**
 * Render booking confirmed email
 */
function renderBookingConfirmed(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_CONFIRMED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight success">
      <table class="info-table">
        <tr><td>${s.bookingRef}</td><td><strong>${data.bookingRef || 'N/A'}</strong></td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.propertyAddress}</td><td>${data.propertyAddress || 'N/A'}</td></tr>
        <tr><td>${s.checkIn}</td><td>${formatDate(data.checkIn, language)}</td></tr>
        <tr><td>${s.checkOut}</td><td>${formatDate(data.checkOut, language)}</td></tr>
      </table>
    </div>
    ${data.checkInInstructions ? `<h3>${s.checkInInstructions}</h3><p>${data.checkInInstructions}</p>` : ''}
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_CONFIRMED, data) }
  });
}

/**
 * Render booking cancelled email
 */
function renderBookingCancelled(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_CANCELLED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.bookingRef}</td><td>${data.bookingRef || 'N/A'}</td></tr>
        <tr><td>${s.guestName}</td><td>${data.guestName || 'N/A'}</td></tr>
        <tr><td>${s.checkIn}</td><td>${formatDate(data.checkIn, language)}</td></tr>
        <tr><td>${s.checkOut}</td><td>${formatDate(data.checkOut, language)}</td></tr>
        ${data.cancellationReason ? `<tr><td>${s.cancellationReason}</td><td>${data.cancellationReason}</td></tr>` : ''}
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_CANCELLED, data) }
  });
}


/**
 * Render booking modified email
 */
function renderBookingModified(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_MODIFIED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.bookingRef}</td><td>${data.bookingRef || 'N/A'}</td></tr>
        <tr><td>${s.originalDates}</td><td>${formatDate(data.originalCheckIn, language)} - ${formatDate(data.originalCheckOut, language)}</td></tr>
        <tr><td>${s.newDates}</td><td>${formatDate(data.newCheckIn, language)} - ${formatDate(data.newCheckOut, language)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_MODIFIED, data) }
  });
}

/**
 * Render check-in completed email
 */
function renderCheckInCompleted(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.CHECK_IN_COMPLETED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight success">
      <table class="info-table">
        <tr><td>${s.guestName}</td><td>${data.guestName || 'N/A'}</td></tr>
        <tr><td>${s.roomNumber}</td><td>${data.roomNumber || 'N/A'}</td></tr>
        <tr><td>${s.checkInTime}</td><td>${formatTime(data.checkInTime || new Date(), language)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.CHECK_IN_COMPLETED, data) }
  });
}

/**
 * Render check-out completed email
 */
function renderCheckOutCompleted(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.CHECK_OUT_COMPLETED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.guestName}</td><td>${data.guestName || 'N/A'}</td></tr>
        <tr><td>${s.roomNumber}</td><td>${data.roomNumber || 'N/A'}</td></tr>
        <tr><td>${s.checkOutTime}</td><td>${formatTime(data.checkOutTime || new Date(), language)}</td></tr>
        <tr><td>${s.finalAmount}</td><td>${formatCurrency(data.finalAmount || 0)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.CHECK_OUT_COMPLETED, data) }
  });
}


/**
 * Render payment reminder email (7, 3, 1 day)
 */
function renderPaymentReminder(data, language = 'en', daysUntilDue = 7) {
  const typeMap = {
    7: NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY,
    3: NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY,
    1: NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY
  };
  const type = typeMap[daysUntilDue] || NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY;
  const s = getStrings(type, language);
  const isUrgent = daysUntilDue === 1;
  
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight ${isUrgent ? 'urgent' : ''}">
      <table class="info-table">
        <tr><td>${s.amount}</td><td><strong>${formatCurrency(data.amount || 0)}</strong></td></tr>
        <tr><td>${s.dueDate}</td><td>${formatDate(data.dueDate, language)}</td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(type, data) }
  });
}

/**
 * Render payment overdue email
 */
function renderPaymentOverdue(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PAYMENT_OVERDUE, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight urgent">
      <table class="info-table">
        <tr><td>${s.amount}</td><td><strong>${formatCurrency(data.amount || 0)}</strong></td></tr>
        <tr><td>${s.daysOverdue}</td><td>${data.daysOverdue || 0} days</td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PAYMENT_OVERDUE, data) }
  });
}

/**
 * Render payment received email
 */
function renderPaymentReceived(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PAYMENT_RECEIVED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight success">
      <table class="info-table">
        <tr><td>${s.amount}</td><td><strong>${formatCurrency(data.amount || 0)}</strong></td></tr>
        <tr><td>${s.paymentDate}</td><td>${formatDate(data.paymentDate || new Date(), language)}</td></tr>
        <tr><td>${s.transactionId}</td><td>${data.transactionId || 'N/A'}</td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PAYMENT_RECEIVED, data) }
  });
}

/**
 * Render checkout reminder email
 */
function renderCheckoutReminder(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.CHECKOUT_REMINDER, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.checkoutTime}</td><td>${data.checkoutTime || '11:00 AM'}</td></tr>
        <tr><td>${s.outstandingBalance}</td><td>${formatCurrency(data.outstandingBalance || 0)}</td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.CHECKOUT_REMINDER, data) }
  });
}


/**
 * Render lead assigned email
 */
function renderLeadAssigned(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.LEAD_ASSIGNED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.leadName}</td><td>${data.leadName || 'N/A'}</td></tr>
        <tr><td>${s.leadPhone}</td><td>${data.leadPhone || 'N/A'}</td></tr>
        <tr><td>${s.leadEmail}</td><td>${data.leadEmail || 'N/A'}</td></tr>
        <tr><td>${s.propertyInterest}</td><td>${data.propertyInterest || 'N/A'}</td></tr>
        <tr><td>${s.priority}</td><td>${data.priority || 'Normal'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.LEAD_ASSIGNED, data) }
  });
}

/**
 * Render approval required email
 */
function renderApprovalRequired(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.APPROVAL_REQUIRED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.itemType}</td><td>${data.itemType || 'N/A'}</td></tr>
        <tr><td>${s.itemDescription}</td><td>${data.itemDescription || 'N/A'}</td></tr>
        <tr><td>${s.requestedBy}</td><td>${data.requestedBy || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.APPROVAL_REQUIRED, data) }
  });
}

/**
 * Render ticket created email
 */
function renderTicketCreated(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.TICKET_CREATED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.ticketId}</td><td>${data.ticketId || 'N/A'}</td></tr>
        <tr><td>${s.subject}</td><td>${data.subject || 'N/A'}</td></tr>
        <tr><td>${s.priority}</td><td>${data.priority || 'Normal'}</td></tr>
        <tr><td>${s.createdBy}</td><td>${data.createdBy || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.TICKET_CREATED, data) }
  });
}

/**
 * Render zero occupancy alert email
 */
function renderZeroOccupancyAlert(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight urgent">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.daysEmpty}</td><td>${data.daysEmpty || 3} days</td></tr>
        <tr><td>${s.lastOccupied}</td><td>${formatDate(data.lastOccupied, language)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT, data) }
  });
}

/**
 * Render payment failure alert email
 */
function renderPaymentFailureAlert(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight urgent">
      <table class="info-table">
        <tr><td>${s.guestName}</td><td>${data.guestName || 'N/A'}</td></tr>
        <tr><td>${s.amount}</td><td>${formatCurrency(data.amount || 0)}</td></tr>
        <tr><td>${s.errorMessage}</td><td>${data.errorMessage || 'N/A'}</td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT, data) }
  });
}


/**
 * Render daily summary for property owner email
 */
function renderDailySummaryOwner(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.todayCheckIns}</td><td>${data.todayCheckIns || 0}</td></tr>
        <tr><td>${s.todayCheckOuts}</td><td>${data.todayCheckOuts || 0}</td></tr>
        <tr><td>${s.occupancyRate}</td><td>${data.occupancyRate || 0}%</td></tr>
        <tr><td>${s.pendingPayments}</td><td>${formatCurrency(data.pendingPayments || 0)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    includeUnsubscribe: true,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER, data) }
  });
}

/**
 * Render daily summary for manager email
 */
function renderDailySummaryManager(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.totalProperties}</td><td>${data.totalProperties || 0}</td></tr>
        <tr><td>${s.averageOccupancy}</td><td>${data.averageOccupancy || 0}%</td></tr>
        <tr><td>${s.newBookings}</td><td>${data.newBookings || 0}</td></tr>
        <tr><td>${s.revenue}</td><td>${formatCurrency(data.revenue || 0)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    includeUnsubscribe: true,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER, data) }
  });
}

/**
 * Render booking request received email
 */
function renderBookingRequestReceived(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.bookingRef}</td><td><strong>${data.bookingRef || 'N/A'}</strong></td></tr>
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.checkIn}</td><td>${formatDate(data.checkIn, language)}</td></tr>
        <tr><td>${s.checkOut}</td><td>${formatDate(data.checkOut, language)}</td></tr>
        <tr><td>${s.totalAmount}</td><td>${formatCurrency(data.totalAmount || 0)}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED, data) }
  });
}

/**
 * Render booking rejected email
 */
function renderBookingRejected(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.BOOKING_REJECTED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.checkIn}</td><td>${formatDate(data.checkIn, language)}</td></tr>
        <tr><td>${s.checkOut}</td><td>${formatDate(data.checkOut, language)}</td></tr>
      </table>
    </div>
    <p>${s.alternativeSuggestion}</p>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.BOOKING_REJECTED, data) }
  });
}


/**
 * Render check-in reminder email
 */
function renderCheckinReminder(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.CHECKIN_REMINDER, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.propertyAddress}</td><td>${data.propertyAddress || 'N/A'}</td></tr>
        <tr><td>${s.checkInTime}</td><td>${data.checkInTime || '2:00 PM'}</td></tr>
        <tr><td>${s.contactPhone}</td><td>${data.contactPhone || 'N/A'}</td></tr>
      </table>
    </div>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.CHECKIN_REMINDER, data) }
  });
}

/**
 * Render stay completed email
 */
function renderStayCompleted(data, language = 'en') {
  const s = getStrings(NOTIFICATION_TYPES.STAY_COMPLETED, language);
  const content = `
    <h2>${s.title}</h2>
    <p>${s.greeting}</p>
    <p>${s.body}</p>
    <div class="highlight success">
      <table class="info-table">
        <tr><td>${s.propertyName}</td><td>${data.propertyName || 'N/A'}</td></tr>
        <tr><td>${s.stayDuration}</td><td>${data.stayDuration || 'N/A'}</td></tr>
      </table>
    </div>
    <p>${s.feedbackRequest}</p>
  `;
  return generateBaseEmail({
    title: s.title,
    content,
    language,
    includeUnsubscribe: true,
    actionButton: { text: s.actionButton, url: getActionUrl(NOTIFICATION_TYPES.STAY_COMPLETED, data) }
  });
}

/**
 * Main render function - routes to appropriate template
 */
function renderEmailTemplate(type, data, language = 'en') {
  const renderers = {
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED]: renderPropertyClaimSubmitted,
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED]: renderPropertyClaimApproved,
    [NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED]: renderPropertyClaimRejected,
    [NOTIFICATION_TYPES.BOOKING_CREATED]: renderBookingCreated,
    [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: renderBookingConfirmed,
    [NOTIFICATION_TYPES.BOOKING_CANCELLED]: renderBookingCancelled,
    [NOTIFICATION_TYPES.BOOKING_MODIFIED]: renderBookingModified,
    [NOTIFICATION_TYPES.CHECK_IN_COMPLETED]: renderCheckInCompleted,
    [NOTIFICATION_TYPES.CHECK_OUT_COMPLETED]: renderCheckOutCompleted,
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY]: (d, l) => renderPaymentReminder(d, l, 7),
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY]: (d, l) => renderPaymentReminder(d, l, 3),
    [NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY]: (d, l) => renderPaymentReminder(d, l, 1),
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: renderPaymentOverdue,
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: renderPaymentReceived,
    [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: renderCheckoutReminder,
    [NOTIFICATION_TYPES.LEAD_ASSIGNED]: renderLeadAssigned,
    [NOTIFICATION_TYPES.APPROVAL_REQUIRED]: renderApprovalRequired,
    [NOTIFICATION_TYPES.TICKET_CREATED]: renderTicketCreated,
    [NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT]: renderZeroOccupancyAlert,
    [NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT]: renderPaymentFailureAlert,
    [NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER]: renderDailySummaryOwner,
    [NOTIFICATION_TYPES.DAILY_SUMMARY_MANAGER]: renderDailySummaryManager,
    [NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED]: renderBookingRequestReceived,
    [NOTIFICATION_TYPES.BOOKING_REJECTED]: renderBookingRejected,
    [NOTIFICATION_TYPES.CHECKIN_REMINDER]: renderCheckinReminder,
    [NOTIFICATION_TYPES.STAY_COMPLETED]: renderStayCompleted
  };

  const renderer = renderers[type];
  if (!renderer) {
    throw new Error(`No email template found for notification type: ${type}`);
  }

  return renderer(data, language);
}

module.exports = {
  renderEmailTemplate,
  getStrings,
  getActionUrl,
  isMarketingEmail,
  STRINGS,
  // Individual renderers for direct access
  renderPropertyClaimSubmitted,
  renderPropertyClaimApproved,
  renderPropertyClaimRejected,
  renderBookingCreated,
  renderBookingConfirmed,
  renderBookingCancelled,
  renderBookingModified,
  renderCheckInCompleted,
  renderCheckOutCompleted,
  renderPaymentReminder,
  renderPaymentOverdue,
  renderPaymentReceived,
  renderCheckoutReminder,
  renderLeadAssigned,
  renderApprovalRequired,
  renderTicketCreated,
  renderZeroOccupancyAlert,
  renderPaymentFailureAlert,
  renderDailySummaryOwner,
  renderDailySummaryManager,
  renderBookingRequestReceived,
  renderBookingRejected,
  renderCheckinReminder,
  renderStayCompleted
};
