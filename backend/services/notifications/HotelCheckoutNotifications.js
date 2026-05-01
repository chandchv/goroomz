/**
 * Hotel Checkout Notifications Service
 * 
 * Handles notifications for hotel checkout including:
 * - Checkout reminders (morning email, late SMS)
 * - Checkout extension notifications
 * - Payment receipt notifications
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

const { User } = require('../../models');
const { NOTIFICATION_TYPES } = require('./constants');

class HotelCheckoutNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send checkout reminder notification for hotel guests
   * Sends email at 8:00 AM with outstanding balance
   * Sends SMS at 11:00 AM if balance > 0
   * Requirements: 4.1, 4.2
   * @param {Object} booking - Booking object with checkout today
   * @param {string} reminderType - 'morning_email' (8 AM) or 'late_sms' (11 AM)
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendCheckoutReminderNotification(booking, reminderType = 'morning_email') {
    const notifications = [];
    const errors = [];

    try {
      let user = booking.user;
      if (!user && booking.userId) {
        user = await User.findByPk(booking.userId);
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

      const guestName = booking.contactInfo?.name || user?.name || 'Guest';
      const guestEmail = booking.contactInfo?.email || user?.email;
      const guestPhone = booking.contactInfo?.phone || user?.phone;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const outstandingBalance = Math.max(0, totalAmount - paidAmount);
      const hasOutstandingBalance = outstandingBalance > 0;

      const checkoutDate = new Date(booking.checkOut);
      const checkoutDateStr = checkoutDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: NOTIFICATION_TYPES.CHECKOUT_REMINDER,
          title: 'Checkout Reminder',
          message: hasOutstandingBalance 
            ? `Reminder: Your checkout is today. Outstanding balance: Rs.${outstandingBalance}`
            : `Reminder: Your checkout is today at ${propertyName}`,
          priority: hasOutstandingBalance ? 'high' : 'medium',
          channels: reminderType === 'morning_email' ? ['email'] : ['sms'],
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            roomId: booking.roomId,
            roomTitle,
            checkoutDate: booking.checkOut,
            totalAmount,
            paidAmount,
            outstandingBalance,
            hasOutstandingBalance,
            reminderType
          }
        });
      }

      // Morning email reminder (8:00 AM) - Requirements: 4.1
      if (reminderType === 'morning_email' && guestEmail) {
        try {
          const emailContent = {
            subject: `Checkout Reminder - ${propertyName}`,
            body: `
              <h2>Checkout Reminder</h2>
              <p>Dear ${guestName},</p>
              
              <p>This is a friendly reminder that your checkout is scheduled for <strong>today</strong>.</p>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Checkout Date:</strong> ${checkoutDateStr}</li>
              </ul>
              
              <h3>Account Summary:</h3>
              <ul>
                <li><strong>Total Amount:</strong> Rs.${totalAmount}</li>
                <li><strong>Amount Paid:</strong> Rs.${paidAmount}</li>
                <li><strong>Outstanding Balance:</strong> ${hasOutstandingBalance ? `Rs.${outstandingBalance}` : 'Rs.0 (Fully Paid)'}</li>
              </ul>
              
              ${hasOutstandingBalance ? `
              <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                <strong>Payment Required:</strong> Please settle your outstanding balance of Rs.${outstandingBalance} at checkout.
              </p>
              ` : `
              <p style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745;">
                <strong>All Paid:</strong> Your account is fully settled. Thank you!
              </p>
              `}
              
              <h3>Checkout Instructions:</h3>
              <ul>
                <li>Please vacate the room by the standard checkout time</li>
                <li>Return all room keys to the front desk</li>
                <li>Collect your belongings and check for any personal items</li>
              </ul>
              
              <p>Thank you for staying with us!</p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: hasOutstandingBalance ? 'high' : 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, success: true, reminderType: 'morning_email' });
          if (notification) await notification.updateDeliveryStatus('email', 'sent');
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) await notification.updateDeliveryStatus('email', 'failed', error.message);
        }
      }

      // Late SMS reminder (11:00 AM) - Only if outstanding balance > 0 - Requirements: 4.2
      if (reminderType === 'late_sms' && hasOutstandingBalance && guestPhone) {
        try {
          const smsContent = {
            smsText: `Checkout reminder: You have Rs.${outstandingBalance} outstanding at ${propertyName}. Please settle before checkout. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: guestPhone });
          notifications.push({ channel: 'sms', recipient: guestPhone, success: true, reminderType: 'late_sms' });
          if (notification) await notification.updateDeliveryStatus('sms', 'sent');
        } catch (error) {
          errors.push({ channel: 'sms', error: error.message });
          if (notification) await notification.updateDeliveryStatus('sms', 'failed', error.message);
        }
      } else if (reminderType === 'late_sms' && !hasOutstandingBalance) {
        notifications.push({ channel: 'sms', skipped: true, reason: 'No outstanding balance', reminderType: 'late_sms' });
      }

      if (notification) {
        const anySuccess = notifications.some(n => n.success);
        notification.status = anySuccess ? 'sent' : (notifications.some(n => n.skipped) ? 'sent' : 'failed');
        notification.sentAt = anySuccess ? new Date() : null;
        await notification.save();
      }

      return {
        success: notifications.some(n => n.success) || notifications.some(n => n.skipped),
        notifications,
        errors,
        notificationId: notification?.id,
        outstandingBalance,
        hasOutstandingBalance,
        reminderType
      };
    } catch (error) {
      console.error('Error sending checkout reminder notification:', error);
      throw error;
    }
  }


  /**
   * Send notification when a hotel guest's checkout is extended
   * Sends email with updated charges and new checkout date
   * Requirements: 4.3
   * @param {Object} booking - Booking object with extended checkout
   * @param {Date} originalCheckoutDate - Original checkout date before extension
   * @param {number} additionalCharges - Additional charges for the extension
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendCheckoutExtendedNotification(booking, originalCheckoutDate, additionalCharges = 0) {
    const notifications = [];
    const errors = [];

    try {
      let user = booking.user;
      if (!user && booking.userId) {
        user = await User.findByPk(booking.userId);
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

      const guestName = booking.contactInfo?.name || user?.name || 'Guest';
      const guestEmail = booking.contactInfo?.email || user?.email;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const originalDateStr = new Date(originalCheckoutDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const newCheckoutDate = new Date(booking.checkOut);
      const newDateStr = newCheckoutDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const outstandingBalance = Math.max(0, totalAmount - paidAmount);

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: NOTIFICATION_TYPES.BOOKING_MODIFIED,
          title: 'Checkout Extended',
          message: `Your checkout has been extended to ${newDateStr}. ${additionalCharges > 0 ? `Additional charges: Rs.${additionalCharges}` : ''}`,
          priority: 'medium',
          channels: ['email'],
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            roomId: booking.roomId,
            roomTitle,
            originalCheckoutDate,
            newCheckoutDate: booking.checkOut,
            additionalCharges,
            totalAmount,
            paidAmount,
            outstandingBalance
          }
        });
      }

      if (guestEmail) {
        try {
          const emailContent = {
            subject: `Checkout Extended - ${propertyName}`,
            body: `
              <h2>Checkout Extension Confirmation</h2>
              <p>Dear ${guestName},</p>
              
              <p>Your checkout has been successfully extended.</p>
              
              <h3>Extension Details:</h3>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Original Checkout:</strong> <span style="text-decoration: line-through;">${originalDateStr}</span></li>
                <li><strong>New Checkout Date:</strong> <strong>${newDateStr}</strong></li>
              </ul>
              
              <h3>Updated Charges:</h3>
              <ul>
                ${additionalCharges > 0 ? `<li><strong>Additional Charges:</strong> Rs.${additionalCharges}</li>` : ''}
                <li><strong>Updated Total:</strong> Rs.${totalAmount}</li>
                <li><strong>Amount Paid:</strong> Rs.${paidAmount}</li>
                <li><strong>Outstanding Balance:</strong> ${outstandingBalance > 0 ? `Rs.${outstandingBalance}` : 'Rs.0 (Fully Paid)'}</li>
              </ul>
              
              ${additionalCharges > 0 ? `
              <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                <strong>Note:</strong> Additional charges of Rs.${additionalCharges} have been added for the extended stay.
              </p>
              ` : ''}
              
              <p>If you have any questions, please contact the front desk.</p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, success: true });
          if (notification) {
            await notification.updateDeliveryStatus('email', 'sent');
            notification.status = 'sent';
            notification.sentAt = new Date();
            await notification.save();
          }
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) {
            await notification.updateDeliveryStatus('email', 'failed', error.message);
            notification.status = 'failed';
            await notification.save();
          }
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        notificationId: notification?.id,
        originalCheckoutDate,
        newCheckoutDate: booking.checkOut,
        additionalCharges,
        outstandingBalance
      };
    } catch (error) {
      console.error('Error sending checkout extended notification:', error);
      throw error;
    }
  }

  /**
   * Send payment receipt notification on payment completion
   * Requirements: 4.4
   * @param {Object} payment - Payment object with amount details
   * @param {Object} booking - Booking object
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendPaymentReceiptNotification(payment, booking) {
    const notifications = [];
    const errors = [];

    try {
      if (!booking && payment.bookingId) {
        const { Booking } = require('../../models');
        booking = await Booking.findByPk(payment.bookingId, {
          include: [
            { model: User, as: 'user' },
            { association: 'property' },
            { association: 'room' }
          ]
        });
      }

      if (!booking) {
        throw new Error('Booking not found for payment receipt');
      }

      let user = booking.user;
      if (!user && booking.userId) {
        user = await User.findByPk(booking.userId);
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

      const guestName = booking.contactInfo?.name || user?.name || 'Guest';
      const guestEmail = booking.contactInfo?.email || user?.email;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const paymentAmount = parseFloat(payment.amount) || 0;
      const paymentMethod = payment.paymentMethod || 'Unknown';
      const paymentDate = payment.paymentDate 
        ? new Date(payment.paymentDate).toLocaleString()
        : new Date().toLocaleString();
      const transactionRef = payment.transactionReference || payment.id || 'N/A';
      
      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const remainingBalance = Math.max(0, totalAmount - paidAmount);

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          title: 'Payment Receipt',
          message: `Payment receipt for Rs.${paymentAmount} at ${propertyName}. Transaction: ${transactionRef}`,
          priority: 'medium',
          channels: ['email'],
          metadata: {
            paymentId: payment.id,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            paymentAmount,
            paymentMethod,
            transactionReference: transactionRef,
            totalAmount,
            paidAmount,
            remainingBalance
          }
        });
      }

      if (guestEmail) {
        try {
          const emailContent = {
            subject: `Payment Receipt - Rs.${paymentAmount} - ${propertyName}`,
            body: `
              <h2>Payment Receipt</h2>
              <p>Dear ${guestName},</p>
              
              <p>Thank you for your payment. Please find your receipt below.</p>
              
              <div style="border: 1px solid #dee2e6; padding: 20px; margin: 20px 0; background-color: #f8f9fa;">
                <h3 style="margin-top: 0;">Receipt Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>Transaction Reference:</strong></td>
                    <td style="padding: 8px 0;">${transactionRef}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
                    <td style="padding: 8px 0;">Rs.${paymentAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
                    <td style="padding: 8px 0;">${paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0;">${paymentDate}</td>
                  </tr>
                </table>
              </div>
              
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                ${booking.bookingNumber ? `<li><strong>Booking Reference:</strong> ${booking.bookingNumber}</li>` : ''}
              </ul>
              
              <h3>Account Summary:</h3>
              <ul>
                <li><strong>Total Amount:</strong> Rs.${totalAmount}</li>
                <li><strong>Total Paid:</strong> Rs.${paidAmount}</li>
                <li><strong>Remaining Balance:</strong> ${remainingBalance > 0 ? `Rs.${remainingBalance}` : 'Rs.0 (Fully Paid)'}</li>
              </ul>
              
              <p style="font-size: 12px; color: #666; margin-top: 20px;">
                This is an official payment receipt. Please keep it for your records.
              </p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, success: true });
          if (notification) {
            await notification.updateDeliveryStatus('email', 'sent');
            notification.status = 'sent';
            notification.sentAt = new Date();
            await notification.save();
          }
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) {
            await notification.updateDeliveryStatus('email', 'failed', error.message);
            notification.status = 'failed';
            await notification.save();
          }
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        notificationId: notification?.id,
        paymentAmount,
        transactionReference: transactionRef,
        remainingBalance
      };
    } catch (error) {
      console.error('Error sending payment receipt notification:', error);
      throw error;
    }
  }
}

module.exports = HotelCheckoutNotifications;
