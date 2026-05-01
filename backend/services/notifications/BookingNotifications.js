/**
 * Booking Notifications Service
 * 
 * Handles notifications for bookings including:
 * - Booking creation notifications
 * - Check-in notifications
 * - Check-out notifications with summary
 * - Booking cancellation notifications
 * - Booking modification notifications
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

const { User } = require('../../models');
const { NOTIFICATION_TYPES } = require('./constants');

class BookingNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send notification when a new booking is created
   * Requirements: 2.1
   */
  async sendBookingCreatedNotification(booking) {
    const notifications = [];
    const errors = [];

    try {
      let owner = booking.owner;
      if (!owner && booking.ownerId) {
        owner = await User.findByPk(booking.ownerId);
      }

      if (!owner) {
        throw new Error('Property owner not found for booking');
      }

      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Your Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString();
      const totalAmount = booking.totalAmount || 0;

      const notification = await this.baseService.createNotification({
        userId: owner.id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'New Booking Received',
        message: `New booking from ${guestName} for ${roomTitle} at ${propertyName}. Check-in: ${checkInDate}, Check-out: ${checkOutDate}. Amount: Rs.${totalAmount}`,
        priority: 'high',
        channels: ['email', 'in_app'],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyId: booking.propertyId,
          propertyName,
          roomId: booking.roomId,
          roomTitle,
          guestName,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalAmount
        }
      });

      // Send email
      if (owner.email) {
        try {
          const emailContent = {
            subject: `New Booking - ${propertyName}`,
            body: `
              <h2>New Booking Received!</h2>
              <p>Dear ${owner.name || 'Property Owner'},</p>
              <p>You have received a new booking for <strong>${propertyName}</strong>.</p>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Booking Number:</strong> ${booking.bookingNumber || 'N/A'}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Guest:</strong> ${guestName}</li>
                <li><strong>Check-in:</strong> ${checkInDate}</li>
                <li><strong>Check-out:</strong> ${checkOutDate}</li>
                <li><strong>Amount:</strong> Rs.${totalAmount}</li>
              </ul>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: owner.email });
          await notification.updateDeliveryStatus('email', 'sent');
          notifications.push({ channel: 'email', recipient: owner.email, success: true });
        } catch (error) {
          await notification.updateDeliveryStatus('email', 'failed', error.message);
          errors.push({ channel: 'email', error: error.message });
        }
      }

      await notification.updateDeliveryStatus('in_app', 'sent');
      notifications.push({ channel: 'in_app', recipient: owner.id, success: true });

      const anySuccess = notifications.some(n => n.success);
      notification.status = anySuccess ? 'sent' : 'failed';
      notification.sentAt = anySuccess ? new Date() : null;
      await notification.save();

      return { success: anySuccess, notifications, errors, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending booking created notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a guest checks in
   * Requirements: 2.2
   */
  async sendCheckInNotification(booking) {
    const notifications = [];
    const errors = [];

    try {
      let owner = booking.owner;
      if (!owner && booking.ownerId) {
        owner = await User.findByPk(booking.ownerId);
      }

      if (!owner) {
        throw new Error('Property owner not found');
      }

      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Your Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      const checkInTime = booking.actualCheckInTime 
        ? new Date(booking.actualCheckInTime).toLocaleString()
        : new Date().toLocaleString();

      const notification = await this.baseService.createNotification({
        userId: owner.id,
        type: NOTIFICATION_TYPES.CHECK_IN_COMPLETED,
        title: 'Guest Checked In',
        message: `${guestName} has checked in to ${roomTitle} at ${propertyName}. Check-in time: ${checkInTime}`,
        priority: 'medium',
        channels: ['in_app'],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyName,
          roomTitle,
          guestName,
          checkInTime
        }
      });

      await notification.updateDeliveryStatus('in_app', 'sent');
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      notifications.push({ channel: 'in_app', recipient: owner.id, success: true });

      return { success: true, notifications, errors, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending check-in notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a guest checks out with summary
   * Requirements: 2.3
   */
  async sendCheckOutNotification(booking, checkoutSummary = {}) {
    const notifications = [];
    const errors = [];

    try {
      let owner = booking.owner;
      if (!owner && booking.ownerId) {
        owner = await User.findByPk(booking.ownerId);
      }

      if (!owner) {
        throw new Error('Property owner not found');
      }

      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Your Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      const finalAmount = checkoutSummary.finalAmount || booking.totalAmount || 0;
      const paidAmount = checkoutSummary.paidAmount || booking.paidAmount || 0;
      const outstandingBalance = checkoutSummary.outstandingBalance || (finalAmount - paidAmount);

      let summaryMessage = `${guestName} has checked out from ${roomTitle} at ${propertyName}. `;
      summaryMessage += `Final Amount: Rs.${finalAmount}. `;
      if (outstandingBalance > 0) {
        summaryMessage += `Outstanding Balance: Rs.${outstandingBalance}. `;
      } else {
        summaryMessage += `Payment Status: Fully Paid. `;
      }

      const notification = await this.baseService.createNotification({
        userId: owner.id,
        type: NOTIFICATION_TYPES.CHECK_OUT_COMPLETED,
        title: 'Guest Checked Out',
        message: summaryMessage,
        priority: 'medium',
        channels: ['in_app'],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyName,
          roomTitle,
          guestName,
          checkoutSummary: {
            finalAmount,
            paidAmount,
            outstandingBalance,
            refundAmount: checkoutSummary.refundAmount || 0
          }
        }
      });

      await notification.updateDeliveryStatus('in_app', 'sent');
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      notifications.push({ channel: 'in_app', recipient: owner.id, success: true });

      return { success: true, notifications, errors, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending check-out notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a booking is cancelled
   * Requirements: 2.4
   */
  async sendBookingCancelledNotification(booking, cancellationDetails = {}) {
    const notifications = [];
    const errors = [];

    try {
      let owner = booking.owner;
      if (!owner && booking.ownerId) {
        owner = await User.findByPk(booking.ownerId);
      }

      if (!owner) {
        throw new Error('Property owner not found');
      }

      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      const propertyName = property?.name || 'Your Property';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      const reason = cancellationDetails.reason || 'No reason provided';

      const notification = await this.baseService.createNotification({
        userId: owner.id,
        type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
        title: 'Booking Cancelled',
        message: `Booking by ${guestName} for ${propertyName} has been cancelled. Reason: ${reason}`,
        priority: 'high',
        channels: ['email', 'in_app'],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyName,
          guestName,
          cancellationReason: reason,
          cancelledAt: new Date().toISOString()
        }
      });

      // Send email
      if (owner.email) {
        try {
          const emailContent = {
            subject: `Booking Cancelled - ${propertyName}`,
            body: `
              <h2>Booking Cancelled</h2>
              <p>Dear ${owner.name || 'Property Owner'},</p>
              <p>A booking for <strong>${propertyName}</strong> has been cancelled.</p>
              
              <h3>Details:</h3>
              <ul>
                <li><strong>Guest:</strong> ${guestName}</li>
                <li><strong>Booking Number:</strong> ${booking.bookingNumber || 'N/A'}</li>
                <li><strong>Reason:</strong> ${reason}</li>
              </ul>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: owner.email });
          await notification.updateDeliveryStatus('email', 'sent');
          notifications.push({ channel: 'email', recipient: owner.email, success: true });
        } catch (error) {
          await notification.updateDeliveryStatus('email', 'failed', error.message);
          errors.push({ channel: 'email', error: error.message });
        }
      }

      await notification.updateDeliveryStatus('in_app', 'sent');
      notifications.push({ channel: 'in_app', recipient: owner.id, success: true });

      const anySuccess = notifications.some(n => n.success);
      notification.status = anySuccess ? 'sent' : 'failed';
      notification.sentAt = anySuccess ? new Date() : null;
      await notification.save();

      return { success: anySuccess, notifications, errors, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending booking cancelled notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when booking dates are modified
   * Requirements: 2.5
   */
  async sendBookingModifiedNotification(booking, originalDates = {}) {
    const notifications = [];
    const errors = [];

    try {
      let owner = booking.owner;
      if (!owner && booking.ownerId) {
        owner = await User.findByPk(booking.ownerId);
      }

      if (!owner) {
        throw new Error('Property owner not found');
      }

      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      const propertyName = property?.name || 'Your Property';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      
      const oldCheckIn = originalDates.checkIn ? new Date(originalDates.checkIn).toLocaleDateString() : 'N/A';
      const oldCheckOut = originalDates.checkOut ? new Date(originalDates.checkOut).toLocaleDateString() : 'N/A';
      const newCheckIn = new Date(booking.checkIn).toLocaleDateString();
      const newCheckOut = new Date(booking.checkOut).toLocaleDateString();

      const notification = await this.baseService.createNotification({
        userId: owner.id,
        type: NOTIFICATION_TYPES.BOOKING_MODIFIED,
        title: 'Booking Modified',
        message: `Booking by ${guestName} for ${propertyName} has been modified. Old dates: ${oldCheckIn} - ${oldCheckOut}. New dates: ${newCheckIn} - ${newCheckOut}`,
        priority: 'medium',
        channels: ['in_app'],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyName,
          guestName,
          originalDates: { checkIn: originalDates.checkIn, checkOut: originalDates.checkOut },
          newDates: { checkIn: booking.checkIn, checkOut: booking.checkOut },
          modifiedAt: new Date().toISOString()
        }
      });

      await notification.updateDeliveryStatus('in_app', 'sent');
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      notifications.push({ channel: 'in_app', recipient: owner.id, success: true });

      return { success: true, notifications, errors, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending booking modified notification:', error);
      throw error;
    }
  }

  /**
   * Send online booking creation notification to guest
   * Requirements: 11.3, 11.4
   */
  async sendOnlineBookingCreatedNotification(bookingData) {
    const notifications = [];
    const errors = [];

    try {
      // Create in-app notification for property owner - Requirement 11.4
      if (bookingData.id) {
        try {
          const notification = await this.baseService.createNotification({
            userId: bookingData.ownerId,
            type: NOTIFICATION_TYPES.BOOKING_CREATED,
            title: 'New Online Booking',
            message: `New online booking from ${bookingData.guestName} for ${bookingData.roomTitle} at ${bookingData.propertyName}. Check-in: ${new Date(bookingData.checkIn).toLocaleDateString()}`,
            priority: 'high',
            channels: ['in_app', 'email'],
            metadata: {
              bookingId: bookingData.id,
              bookingNumber: bookingData.bookingNumber,
              propertyName: bookingData.propertyName,
              roomTitle: bookingData.roomTitle,
              guestName: bookingData.guestName,
              checkIn: bookingData.checkIn,
              checkOut: bookingData.checkOut,
              totalAmount: bookingData.totalAmount,
              bookingSource: 'online'
            }
          });

          await notification.updateDeliveryStatus('in_app', 'sent');
          notifications.push({ channel: 'in_app', recipient: 'owner', success: true });
        } catch (error) {
          console.error('Error creating in-app notification:', error);
          errors.push({ channel: 'in_app', recipient: 'owner', error: error.message });
        }
      }

      // Send email to guest - Requirement 11.3
      if (bookingData.guestEmail) {
        try {
          const emailContent = {
            subject: `Booking Confirmation - ${bookingData.bookingNumber}`,
            body: `
              <h2>Booking Confirmation</h2>
              <p>Dear ${bookingData.guestName},</p>
              <p>Thank you for your booking! Your reservation is pending confirmation from the property owner.</p>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Confirmation Number:</strong> ${bookingData.bookingNumber}</li>
                <li><strong>Property:</strong> ${bookingData.propertyName || 'Property'}</li>
                <li><strong>Room:</strong> ${bookingData.roomTitle || 'Room'}</li>
                <li><strong>Check-in:</strong> ${new Date(bookingData.checkIn).toLocaleDateString()}</li>
                <li><strong>Check-out:</strong> ${new Date(bookingData.checkOut).toLocaleDateString()}</li>
                <li><strong>Guests:</strong> ${bookingData.guests}</li>
                <li><strong>Amount:</strong> Rs.${bookingData.totalAmount}</li>
              </ul>
              
              ${bookingData.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingData.specialRequests}</p>` : ''}
              
              <p>The property owner will review your booking and confirm shortly. You will receive another email once your booking is confirmed.</p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: bookingData.guestEmail });
          notifications.push({ channel: 'email', recipient: 'guest', success: true });
        } catch (error) {
          console.error('Error sending guest email:', error);
          errors.push({ channel: 'email', recipient: 'guest', error: error.message });
        }
      }

      // Send notification to property owner - Requirement 11.4
      if (bookingData.ownerEmail) {
        try {
          const emailContent = {
            subject: `New Online Booking - ${bookingData.propertyName}`,
            body: `
              <h2>New Online Booking Received!</h2>
              <p>Dear ${bookingData.ownerName || 'Property Owner'},</p>
              <p>You have received a new online booking for <strong>${bookingData.propertyName}</strong>.</p>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Booking Number:</strong> ${bookingData.bookingNumber}</li>
                <li><strong>Room:</strong> ${bookingData.roomTitle}</li>
                <li><strong>Guest:</strong> ${bookingData.guestName}</li>
                <li><strong>Guest Email:</strong> ${bookingData.guestEmail}</li>
                <li><strong>Check-in:</strong> ${new Date(bookingData.checkIn).toLocaleDateString()}</li>
                <li><strong>Check-out:</strong> ${new Date(bookingData.checkOut).toLocaleDateString()}</li>
                <li><strong>Guests:</strong> ${bookingData.guests}</li>
                <li><strong>Amount:</strong> Rs.${bookingData.totalAmount}</li>
              </ul>
              
              ${bookingData.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingData.specialRequests}</p>` : ''}
              
              <p>Please log in to your dashboard to review and confirm this booking.</p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: bookingData.ownerEmail });
          notifications.push({ channel: 'email', recipient: 'owner', success: true });
        } catch (error) {
          console.error('Error sending owner email:', error);
          errors.push({ channel: 'email', recipient: 'owner', error: error.message });
        }
      }

      return { success: notifications.some(n => n.success), notifications, errors };
    } catch (error) {
      console.error('Error sending online booking notification:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation notification to guest
   * Requirements: 11.6
   */
  async sendBookingConfirmedNotification(booking) {
    const notifications = [];
    const errors = [];

    try {
      let property = booking.property;
      if (!property && booking.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(booking.propertyId);
      }

      let room = booking.room;
      if (!room && booking.roomId) {
        const { Room } = require('../../models');
        room = await Room.findByPk(booking.roomId);
      }

      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      const guestName = booking.contactInfo?.name || booking.guestName || 'Guest';
      const guestEmail = booking.contactInfo?.email || booking.user?.email;
      const checkInDate = new Date(booking.checkIn).toLocaleDateString();
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString();
      const totalAmount = booking.totalAmount || 0;

      // Send email to guest
      if (guestEmail) {
        try {
          const emailContent = {
            subject: `Booking Confirmed - ${booking.bookingNumber}`,
            body: `
              <h2>Booking Confirmed!</h2>
              <p>Dear ${guestName},</p>
              <p>Great news! Your booking has been confirmed by the property owner.</p>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Confirmation Number:</strong> ${booking.bookingNumber}</li>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Check-in:</strong> ${checkInDate}</li>
                <li><strong>Check-out:</strong> ${checkOutDate}</li>
                <li><strong>Amount:</strong> Rs.${totalAmount}</li>
              </ul>
              
              <p>Please arrive at the property on your check-in date. Make sure to bring a valid ID for verification.</p>
              
              <p>We look forward to hosting you!</p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: 'guest', success: true });
        } catch (error) {
          console.error('Error sending confirmation email to guest:', error);
          errors.push({ channel: 'email', recipient: 'guest', error: error.message });
        }
      }

      return { success: notifications.some(n => n.success), notifications, errors };
    } catch (error) {
      console.error('Error sending booking confirmed notification:', error);
      throw error;
    }
  }
}

module.exports = BookingNotifications;
