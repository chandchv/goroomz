/**
 * Website Guest Notifications Service
 * 
 * Handles notifications for website guests including:
 * - Booking request confirmation
 * - Booking confirmed with check-in instructions
 * - Booking rejected with alternative suggestions
 * - Check-in reminder (1 day before)
 * - Stay completed with feedback request
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

const { NOTIFICATION_TYPES } = require('./constants');

class WebsiteGuestNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send booking request confirmation email to guest
   * Requirements: 9.1
   * 
   * @param {Object} booking - Booking object with guest and property details
   * @returns {Object} Result with success status and notification details
   */
  async sendBookingRequestNotification(booking) {
    const notifications = [];
    const errors = [];

    try {
      // Extract guest email from booking
      const guestEmail = booking.contactInfo?.email || booking.guestEmail;
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      if (!guestEmail) {
        throw new Error('Guest email not found for booking request notification');
      }

      // Get property details
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      // Get room details
      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString();
      const totalAmount = booking.totalAmount || 0;
      const bookingNumber = booking.bookingNumber || booking.id;

      // Send email notification
      const emailContent = {
        subject: `Booking Request Received - ${bookingNumber}`,
        body: `
          <h2>Booking Request Received</h2>
          <p>Dear ${guestName},</p>
          <p>Thank you for your booking request! We have received your reservation and will confirm it shortly.</p>
          
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Booking Reference:</strong> ${bookingNumber}</li>
            <li><strong>Property:</strong> ${propertyName}</li>
            <li><strong>Room:</strong> ${roomTitle}</li>
            <li><strong>Check-in:</strong> ${checkInDate}</li>
            <li><strong>Check-out:</strong> ${checkOutDate}</li>
            <li><strong>Total Amount:</strong> Rs.${totalAmount}</li>
          </ul>
          
          <p>You will receive a confirmation email once your booking is approved by the property.</p>
          
          <p>Best regards,<br>GoRoomz Team</p>
        `,
        priority: 'medium'
      };

      try {
        await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
        notifications.push({ 
          channel: 'email', 
          recipient: guestEmail, 
          success: true,
          type: NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED
        });
      } catch (error) {
        errors.push({ channel: 'email', error: error.message });
      }

      const anySuccess = notifications.some(n => n.success);

      return { 
        success: anySuccess, 
        notifications, 
        errors,
        bookingNumber,
        guestEmail
      };
    } catch (error) {
      console.error('Error sending booking request notification:', error);
      throw error;
    }
  }


  /**
   * Send booking confirmed notification with check-in instructions
   * Requirements: 9.2
   * 
   * @param {Object} booking - Booking object with guest and property details
   * @param {Object} checkInInstructions - Optional check-in instructions
   * @returns {Object} Result with success status and notification details
   */
  async sendBookingConfirmedNotification(booking, checkInInstructions = {}) {
    const notifications = [];
    const errors = [];

    try {
      const guestEmail = booking.contactInfo?.email || booking.guestEmail;
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      if (!guestEmail) {
        throw new Error('Guest email not found for booking confirmed notification');
      }

      // Get property details
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      // Get room details
      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Property';
      const propertyAddress = property?.address || checkInInstructions.address || 'Address will be provided';
      const propertyPhone = property?.phone || property?.contactPhone || checkInInstructions.contactPhone || '';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString();
      const checkInTime = checkInInstructions.checkInTime || property?.checkInTime || '2:00 PM';
      const bookingNumber = booking.bookingNumber || booking.id;
      const totalAmount = booking.totalAmount || 0;

      // Build check-in instructions section
      let instructionsHtml = '';
      if (checkInInstructions.instructions || checkInInstructions.specialInstructions) {
        instructionsHtml = `
          <h3>Check-in Instructions:</h3>
          <p>${checkInInstructions.instructions || checkInInstructions.specialInstructions}</p>
        `;
      }

      const emailContent = {
        subject: `Booking Confirmed - ${bookingNumber}`,
        body: `
          <h2>Booking Confirmed!</h2>
          <p>Dear ${guestName},</p>
          <p>Great news! Your booking has been confirmed. We look forward to hosting you.</p>
          
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Booking Reference:</strong> ${bookingNumber}</li>
            <li><strong>Property:</strong> ${propertyName}</li>
            <li><strong>Address:</strong> ${propertyAddress}</li>
            <li><strong>Room:</strong> ${roomTitle}</li>
            <li><strong>Check-in:</strong> ${checkInDate} (${checkInTime})</li>
            <li><strong>Check-out:</strong> ${checkOutDate}</li>
            <li><strong>Total Amount:</strong> Rs.${totalAmount}</li>
            ${propertyPhone ? `<li><strong>Contact:</strong> ${propertyPhone}</li>` : ''}
          </ul>
          
          ${instructionsHtml}
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>GoRoomz Team</p>
        `,
        priority: 'medium'
      };

      try {
        await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
        notifications.push({ 
          channel: 'email', 
          recipient: guestEmail, 
          success: true,
          type: NOTIFICATION_TYPES.BOOKING_CONFIRMED
        });
      } catch (error) {
        errors.push({ channel: 'email', error: error.message });
      }

      const anySuccess = notifications.some(n => n.success);

      return { 
        success: anySuccess, 
        notifications, 
        errors,
        bookingNumber,
        guestEmail
      };
    } catch (error) {
      console.error('Error sending booking confirmed notification:', error);
      throw error;
    }
  }

  /**
   * Send booking rejected notification with alternative suggestions
   * Requirements: 9.3
   * 
   * @param {Object} booking - Booking object with guest and property details
   * @param {Object} rejectionDetails - Rejection reason and alternative suggestions
   * @returns {Object} Result with success status and notification details
   */
  async sendBookingRejectedNotification(booking, rejectionDetails = {}) {
    const notifications = [];
    const errors = [];

    try {
      const guestEmail = booking.contactInfo?.email || booking.guestEmail;
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      if (!guestEmail) {
        throw new Error('Guest email not found for booking rejected notification');
      }

      // Get property details
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      const propertyName = property?.name || 'Property';
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString();
      const bookingNumber = booking.bookingNumber || booking.id;
      const rejectionReason = rejectionDetails.reason || 'The property is not available for the requested dates.';

      // Build alternative suggestions section
      let alternativesHtml = '';
      if (rejectionDetails.alternatives && rejectionDetails.alternatives.length > 0) {
        alternativesHtml = `
          <h3>Alternative Suggestions:</h3>
          <ul>
            ${rejectionDetails.alternatives.map(alt => `<li>${alt.name || alt}</li>`).join('')}
          </ul>
        `;
      } else {
        alternativesHtml = `
          <p>You may want to try alternative dates or browse other properties on our platform.</p>
        `;
      }

      const emailContent = {
        subject: `Booking Request Update - ${bookingNumber}`,
        body: `
          <h2>Booking Request Update</h2>
          <p>Dear ${guestName},</p>
          <p>Unfortunately, your booking request could not be confirmed at this time.</p>
          
          <h3>Request Details:</h3>
          <ul>
            <li><strong>Booking Reference:</strong> ${bookingNumber}</li>
            <li><strong>Property:</strong> ${propertyName}</li>
            <li><strong>Requested Check-in:</strong> ${checkInDate}</li>
            <li><strong>Requested Check-out:</strong> ${checkOutDate}</li>
          </ul>
          
          <h3>Reason:</h3>
          <p>${rejectionReason}</p>
          
          ${alternativesHtml}
          
          <p>We apologize for any inconvenience and hope to serve you in the future.</p>
          
          <p>Best regards,<br>GoRoomz Team</p>
        `,
        priority: 'medium'
      };

      try {
        await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
        notifications.push({ 
          channel: 'email', 
          recipient: guestEmail, 
          success: true,
          type: NOTIFICATION_TYPES.BOOKING_REJECTED
        });
      } catch (error) {
        errors.push({ channel: 'email', error: error.message });
      }

      const anySuccess = notifications.some(n => n.success);

      return { 
        success: anySuccess, 
        notifications, 
        errors,
        bookingNumber,
        guestEmail
      };
    } catch (error) {
      console.error('Error sending booking rejected notification:', error);
      throw error;
    }
  }


  /**
   * Send check-in reminder notification 1 day before check-in
   * Requirements: 9.4
   * 
   * @param {Object} booking - Booking object with guest and property details
   * @returns {Object} Result with success status and notification details
   */
  async sendCheckInReminderNotification(booking) {
    const notifications = [];
    const errors = [];

    try {
      const guestEmail = booking.contactInfo?.email || booking.guestEmail;
      const guestPhone = booking.contactInfo?.phone || booking.guestPhone;
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      if (!guestEmail && !guestPhone) {
        throw new Error('Guest contact information not found for check-in reminder');
      }

      // Get property details
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      // Get room details
      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Property';
      const propertyAddress = property?.address || 'Address will be provided upon arrival';
      const propertyPhone = property?.phone || property?.contactPhone || '';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkInTime = property?.checkInTime || '2:00 PM';
      const bookingNumber = booking.bookingNumber || booking.id;

      // Send email notification
      if (guestEmail) {
        const emailContent = {
          subject: `Check-in Reminder - Tomorrow at ${propertyName}`,
          body: `
            <h2>Check-in Reminder</h2>
            <p>Dear ${guestName},</p>
            <p>This is a friendly reminder that your check-in is tomorrow! Here are the details you need:</p>
            
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Booking Reference:</strong> ${bookingNumber}</li>
              <li><strong>Property:</strong> ${propertyName}</li>
              <li><strong>Room:</strong> ${roomTitle}</li>
              <li><strong>Check-in Date:</strong> ${checkInDate}</li>
              <li><strong>Check-in Time:</strong> ${checkInTime}</li>
            </ul>
            
            <h3>Property Location:</h3>
            <p><strong>Address:</strong> ${propertyAddress}</p>
            ${propertyPhone ? `<p><strong>Contact Phone:</strong> ${propertyPhone}</p>` : ''}
            
            <p>Please ensure you have a valid ID for check-in. If you have any questions or need to make changes, please contact us.</p>
            
            <p>We look forward to welcoming you!</p>
            
            <p>Best regards,<br>GoRoomz Team</p>
          `,
          priority: 'medium'
        };

        try {
          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ 
            channel: 'email', 
            recipient: guestEmail, 
            success: true,
            type: NOTIFICATION_TYPES.CHECKIN_REMINDER
          });
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
        }
      }

      // Send SMS notification
      if (guestPhone) {
        const smsContent = {
          smsText: `GoRoomz: Check-in reminder! Your stay at ${propertyName} is tomorrow (${checkInDate}). Address: ${propertyAddress.substring(0, 50)}${propertyAddress.length > 50 ? '...' : ''}${propertyPhone ? ` Contact: ${propertyPhone}` : ''}`,
          priority: 'medium'
        };

        try {
          await this.baseService.sendSMSNotification(smsContent, { phone: guestPhone });
          notifications.push({ 
            channel: 'sms', 
            recipient: guestPhone, 
            success: true,
            type: NOTIFICATION_TYPES.CHECKIN_REMINDER
          });
        } catch (error) {
          errors.push({ channel: 'sms', error: error.message });
        }
      }

      const anySuccess = notifications.some(n => n.success);

      return { 
        success: anySuccess, 
        notifications, 
        errors,
        bookingNumber,
        guestEmail,
        guestPhone
      };
    } catch (error) {
      console.error('Error sending check-in reminder notification:', error);
      throw error;
    }
  }

  /**
   * Send stay completed notification with feedback request
   * Requirements: 9.5
   * 
   * @param {Object} booking - Booking object with guest and property details
   * @param {string} feedbackUrl - URL for feedback form (optional)
   * @returns {Object} Result with success status and notification details
   */
  async sendStayCompletedNotification(booking, feedbackUrl = null) {
    const notifications = [];
    const errors = [];

    try {
      const guestEmail = booking.contactInfo?.email || booking.guestEmail;
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      if (!guestEmail) {
        throw new Error('Guest email not found for stay completed notification');
      }

      // Get property details
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      const propertyName = property?.name || 'Property';
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const stayDuration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      const bookingNumber = booking.bookingNumber || booking.id;
      
      // Generate feedback URL if not provided
      const feedbackLink = feedbackUrl || `https://goroomz.com/feedback/${bookingNumber}`;

      const emailContent = {
        subject: `Thank You for Staying at ${propertyName}`,
        body: `
          <h2>Thank You for Staying with Us!</h2>
          <p>Dear ${guestName},</p>
          <p>We hope you had a wonderful stay at ${propertyName}. Thank you for choosing GoRoomz!</p>
          
          <h3>Stay Summary:</h3>
          <ul>
            <li><strong>Property:</strong> ${propertyName}</li>
            <li><strong>Check-in:</strong> ${checkInDate.toLocaleDateString()}</li>
            <li><strong>Check-out:</strong> ${checkOutDate.toLocaleDateString()}</li>
            <li><strong>Duration:</strong> ${stayDuration} night${stayDuration > 1 ? 's' : ''}</li>
          </ul>
          
          <h3>We'd Love Your Feedback!</h3>
          <p>Your feedback helps us improve and helps other travelers make informed decisions. Please take a moment to share your experience.</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${feedbackLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Leave Feedback</a>
          </p>
          
          <p>We hope to see you again soon!</p>
          
          <p>Best regards,<br>GoRoomz Team</p>
        `,
        priority: 'low'
      };

      try {
        await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
        notifications.push({ 
          channel: 'email', 
          recipient: guestEmail, 
          success: true,
          type: NOTIFICATION_TYPES.STAY_COMPLETED
        });
      } catch (error) {
        errors.push({ channel: 'email', error: error.message });
      }

      const anySuccess = notifications.some(n => n.success);

      return { 
        success: anySuccess, 
        notifications, 
        errors,
        bookingNumber,
        guestEmail,
        feedbackUrl: feedbackLink
      };
    } catch (error) {
      console.error('Error sending stay completed notification:', error);
      throw error;
    }
  }
}

module.exports = WebsiteGuestNotifications;
