/**
 * Payment Notifications Service
 * 
 * Handles notifications for payments including:
 * - Payment reminders (7, 3, 1 day before due)
 * - Payment overdue notifications with escalation
 * - Payment received confirmations
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

const { User } = require('../../models');
const { NOTIFICATION_TYPES } = require('./constants');

class PaymentNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send payment reminder notification to PG client
   * Sets priority based on days until due (urgent for 1 day)
   * Sends email and SMS with amount and due date
   * Requirements: 3.1, 3.2, 3.3
   * @param {Object} booking - Booking object with payment details
   * @param {number} daysUntilDue - Number of days until payment is due (7, 3, or 1)
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendPaymentReminderNotification(booking, daysUntilDue) {
    const notifications = [];
    const errors = [];

    try {
      if (![7, 3, 1].includes(daysUntilDue)) {
        throw new Error('daysUntilDue must be 7, 3, or 1');
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
      const guestPhone = booking.contactInfo?.phone || user?.phone;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const outstandingBalance = Math.max(0, totalAmount - paidAmount);
      
      const dueDate = booking.paymentDueDate 
        ? new Date(booking.paymentDueDate)
        : new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDate.toLocaleDateString();

      let notificationType, priority, urgencyText;
      
      switch (daysUntilDue) {
        case 7:
          notificationType = NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY;
          priority = 'medium';
          urgencyText = 'in 7 days';
          break;
        case 3:
          notificationType = NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY;
          priority = 'medium';
          urgencyText = 'in 3 days';
          break;
        case 1:
          notificationType = NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY;
          priority = 'urgent';
          urgencyText = 'tomorrow';
          break;
        default:
          notificationType = NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY;
          priority = 'medium';
          urgencyText = `in ${daysUntilDue} days`;
      }

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: notificationType,
          title: daysUntilDue === 1 ? 'Urgent: Payment Due Tomorrow' : `Payment Reminder - Due ${urgencyText}`,
          message: `Your payment of Rs.${outstandingBalance} for ${roomTitle} at ${propertyName} is due ${urgencyText} (${dueDateStr}).`,
          priority,
          channels: ['email', 'sms'],
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            roomId: booking.roomId,
            roomTitle,
            totalAmount,
            paidAmount,
            outstandingBalance,
            dueDate: dueDate.toISOString(),
            daysUntilDue
          }
        });
      }

      // Send email
      if (guestEmail) {
        try {
          const emailContent = {
            subject: daysUntilDue === 1 
              ? `Urgent: Payment Due Tomorrow - ${propertyName}`
              : `Payment Reminder - Due ${urgencyText} - ${propertyName}`,
            body: `
              <h2>${daysUntilDue === 1 ? 'Urgent Payment Reminder' : 'Payment Reminder'}</h2>
              <p>Dear ${guestName},</p>
              
              <p>This is a ${daysUntilDue === 1 ? '<strong>final reminder</strong>' : 'friendly reminder'} that your payment is due ${urgencyText}.</p>
              
              <h3>Payment Details:</h3>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Amount Due:</strong> Rs.${outstandingBalance}</li>
                <li><strong>Due Date:</strong> ${dueDateStr}</li>
              </ul>
              
              ${daysUntilDue === 1 ? `
              <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                <strong>Important:</strong> Please make your payment by ${dueDateStr} to avoid late fees.
              </p>
              ` : ''}
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, success: true });
          if (notification) await notification.updateDeliveryStatus('email', 'sent');
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) await notification.updateDeliveryStatus('email', 'failed', error.message);
        }
      }

      // Send SMS
      if (guestPhone) {
        try {
          const smsContent = {
            smsText: daysUntilDue === 1
              ? `URGENT: Payment of Rs.${outstandingBalance} for ${propertyName} due TOMORROW. Pay now to avoid late fees. -GoRoomz`
              : `Reminder: Payment of Rs.${outstandingBalance} for ${propertyName} due ${urgencyText}. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: guestPhone });
          notifications.push({ channel: 'sms', recipient: guestPhone, success: true });
          if (notification) await notification.updateDeliveryStatus('sms', 'sent');
        } catch (error) {
          errors.push({ channel: 'sms', error: error.message });
          if (notification) await notification.updateDeliveryStatus('sms', 'failed', error.message);
        }
      }

      if (notification) {
        const anySuccess = notifications.some(n => n.success);
        notification.status = anySuccess ? 'sent' : 'failed';
        notification.sentAt = anySuccess ? new Date() : null;
        await notification.save();
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        notificationId: notification?.id,
        daysUntilDue,
        priority,
        outstandingBalance
      };
    } catch (error) {
      console.error('Error sending payment reminder notification:', error);
      throw error;
    }
  }


  /**
   * Send payment overdue notification to PG client
   * Tracks days overdue, sends daily reminders for first 7 days
   * Escalates to property owner and operations after 7 days
   * Requirements: 3.4, 3.5
   * @param {Object} booking - Booking object with payment details
   * @param {number} daysOverdue - Number of days the payment is overdue
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendPaymentOverdueNotification(booking, daysOverdue) {
    const notifications = [];
    const errors = [];

    try {
      if (typeof daysOverdue !== 'number' || daysOverdue < 1) {
        throw new Error('daysOverdue must be a positive number');
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
      const guestPhone = booking.contactInfo?.phone || user?.phone;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const outstandingBalance = Math.max(0, totalAmount - paidAmount);
      
      const dueDate = booking.paymentDueDate 
        ? new Date(booking.paymentDueDate)
        : new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDate.toLocaleDateString();

      const shouldEscalate = daysOverdue > 7;

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: NOTIFICATION_TYPES.PAYMENT_OVERDUE,
          title: `Payment Overdue - ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''}`,
          message: `Your payment of Rs.${outstandingBalance} for ${roomTitle} at ${propertyName} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`,
          priority: 'urgent',
          channels: ['email', 'sms'],
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            roomId: booking.roomId,
            roomTitle,
            totalAmount,
            paidAmount,
            outstandingBalance,
            dueDate: dueDate.toISOString(),
            daysOverdue,
            escalated: shouldEscalate
          }
        });
      }

      // Send to guest (daily for first 7 days)
      if (guestEmail && daysOverdue <= 7) {
        try {
          const emailContent = {
            subject: `Payment Overdue - ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} - ${propertyName}`,
            body: `
              <h2 style="color: #dc3545;">Payment Overdue Notice</h2>
              <p>Dear ${guestName},</p>
              
              <p>Your payment is now <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.</p>
              
              <h3>Overdue Payment Details:</h3>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
                <li><strong>Amount Overdue:</strong> Rs.${outstandingBalance}</li>
                <li><strong>Original Due Date:</strong> ${dueDateStr}</li>
              </ul>
              
              <p style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545;">
                <strong>Important:</strong> Please make your payment immediately to avoid service interruption.
              </p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'urgent'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, recipientType: 'guest', success: true });
          if (notification) await notification.updateDeliveryStatus('email', 'sent');
        } catch (error) {
          errors.push({ channel: 'email', recipientType: 'guest', error: error.message });
          if (notification) await notification.updateDeliveryStatus('email', 'failed', error.message);
        }
      }

      if (guestPhone && daysOverdue <= 7) {
        try {
          const smsContent = {
            smsText: `OVERDUE: Payment of Rs.${outstandingBalance} for ${propertyName} is ${daysOverdue} day(s) overdue. Pay immediately. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: guestPhone });
          notifications.push({ channel: 'sms', recipient: guestPhone, recipientType: 'guest', success: true });
          if (notification) await notification.updateDeliveryStatus('sms', 'sent');
        } catch (error) {
          errors.push({ channel: 'sms', recipientType: 'guest', error: error.message });
          if (notification) await notification.updateDeliveryStatus('sms', 'failed', error.message);
        }
      }

      if (notification) {
        const guestSuccess = notifications.filter(n => n.recipientType === 'guest').some(n => n.success);
        notification.status = guestSuccess ? 'sent' : 'failed';
        notification.sentAt = guestSuccess ? new Date() : null;
        await notification.save();
      }

      // Escalate after 7 days
      if (shouldEscalate) {
        let owner = booking.owner;
        if (!owner && booking.ownerId) {
          owner = await User.findByPk(booking.ownerId);
        }

        if (owner?.email) {
          try {
            const ownerEmailContent = {
              subject: `Escalation: Payment ${daysOverdue} Days Overdue - ${guestName}`,
              body: `
                <h2 style="color: #dc3545;">Payment Escalation Notice</h2>
                <p>Dear ${owner.name || 'Property Owner'},</p>
                
                <p>A guest's payment has been overdue for more than 7 days.</p>
                
                <h3>Details:</h3>
                <ul>
                  <li><strong>Guest:</strong> ${guestName}</li>
                  <li><strong>Room:</strong> ${roomTitle}</li>
                  <li><strong>Amount Overdue:</strong> Rs.${outstandingBalance}</li>
                  <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
                </ul>
                
                <p>Best regards,<br>GoRoomz Team</p>
              `,
              priority: 'urgent'
            };

            await this.baseService.sendEmailNotification(ownerEmailContent, { email: owner.email });
            notifications.push({ channel: 'email', recipient: owner.email, recipientType: 'property_owner', success: true });
          } catch (error) {
            errors.push({ channel: 'email', recipientType: 'property_owner', error: error.message });
          }
        }

        // Notify operations
        const operationsEmail = process.env.OPERATIONS_TEAM_EMAIL || 'operations@goroomz.com';
        try {
          const opsEmailContent = {
            subject: `Payment Escalation: ${daysOverdue} Days Overdue - ${propertyName}`,
            body: `
              <h2 style="color: #dc3545;">Payment Escalation - Operations Alert</h2>
              <p>Payment overdue for more than 7 days requires review.</p>
              <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Guest:</strong> ${guestName}</li>
                <li><strong>Amount:</strong> Rs.${outstandingBalance}</li>
                <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
              </ul>
            `,
            priority: 'urgent'
          };

          await this.baseService.sendEmailNotification(opsEmailContent, { email: operationsEmail });
          notifications.push({ channel: 'email', recipient: operationsEmail, recipientType: 'operations', success: true });
        } catch (error) {
          errors.push({ channel: 'email', recipientType: 'operations', error: error.message });
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        notificationId: notification?.id,
        daysOverdue,
        escalated: shouldEscalate,
        outstandingBalance
      };
    } catch (error) {
      console.error('Error sending payment overdue notification:', error);
      throw error;
    }
  }

  /**
   * Send payment received confirmation notification to PG client
   * Sends confirmation email and SMS with payment amount
   * Requirements: 3.6
   * @param {Object} payment - Payment object with amount and booking details
   * @param {Object} booking - Booking object (optional, will be fetched if not provided)
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendPaymentReceivedNotification(payment, booking = null) {
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
        throw new Error('Booking not found for payment');
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
      const guestPhone = booking.contactInfo?.phone || user?.phone;
      const propertyName = property?.name || 'Property';
      const roomTitle = room?.title || room?.roomNumber || 'Room';
      
      const paymentAmount = parseFloat(payment.amount) || 0;
      const paymentMethod = payment.paymentMethod || 'Unknown';
      const paymentDate = payment.paymentDate 
        ? new Date(payment.paymentDate).toLocaleString()
        : new Date().toLocaleString();
      
      const totalAmount = parseFloat(booking.totalAmount) || 0;
      const paidAmount = parseFloat(booking.paidAmount) || 0;
      const remainingBalance = Math.max(0, totalAmount - paidAmount);
      const isFullyPaid = remainingBalance <= 0;

      let notification;
      if (booking.userId) {
        notification = await this.baseService.createNotification({
          userId: booking.userId,
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          title: 'Payment Received - Thank You!',
          message: `Your payment of Rs.${paymentAmount} for ${roomTitle} at ${propertyName} has been received. ${isFullyPaid ? 'Account fully paid.' : `Remaining: Rs.${remainingBalance}`}`,
          priority: 'medium',
          channels: ['email', 'sms'],
          metadata: {
            paymentId: payment.id,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            propertyId: booking.propertyId,
            propertyName,
            paymentAmount,
            paymentMethod,
            totalAmount,
            paidAmount,
            remainingBalance,
            isFullyPaid
          }
        });
      }

      if (guestEmail) {
        try {
          const emailContent = {
            subject: `Payment Received - Rs.${paymentAmount} - ${propertyName}`,
            body: `
              <h2 style="color: #28a745;">Payment Confirmation</h2>
              <p>Dear ${guestName},</p>
              
              <p>Thank you! We have received your payment.</p>
              
              <h3>Payment Details:</h3>
              <ul>
                <li><strong>Amount Paid:</strong> Rs.${paymentAmount}</li>
                <li><strong>Payment Method:</strong> ${paymentMethod}</li>
                <li><strong>Date:</strong> ${paymentDate}</li>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Room:</strong> ${roomTitle}</li>
              </ul>
              
              <h3>Account Summary:</h3>
              <ul>
                <li><strong>Total Amount:</strong> Rs.${totalAmount}</li>
                <li><strong>Total Paid:</strong> Rs.${paidAmount}</li>
                <li><strong>Remaining:</strong> ${isFullyPaid ? 'Rs.0 (Fully Paid)' : `Rs.${remainingBalance}`}</li>
              </ul>
              
              ${isFullyPaid ? `
              <p style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745;">
                Your account is now fully paid. Thank you!
              </p>
              ` : ''}
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: guestEmail });
          notifications.push({ channel: 'email', recipient: guestEmail, success: true });
          if (notification) await notification.updateDeliveryStatus('email', 'sent');
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) await notification.updateDeliveryStatus('email', 'failed', error.message);
        }
      }

      if (guestPhone) {
        try {
          const smsContent = {
            smsText: isFullyPaid
              ? `Payment of Rs.${paymentAmount} received for ${propertyName}. Account fully paid. Thank you! -GoRoomz`
              : `Payment of Rs.${paymentAmount} received for ${propertyName}. Remaining: Rs.${remainingBalance}. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: guestPhone });
          notifications.push({ channel: 'sms', recipient: guestPhone, success: true });
          if (notification) await notification.updateDeliveryStatus('sms', 'sent');
        } catch (error) {
          errors.push({ channel: 'sms', error: error.message });
          if (notification) await notification.updateDeliveryStatus('sms', 'failed', error.message);
        }
      }

      if (notification) {
        const anySuccess = notifications.some(n => n.success);
        notification.status = anySuccess ? 'sent' : 'failed';
        notification.sentAt = anySuccess ? new Date() : null;
        await notification.save();
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        notificationId: notification?.id,
        paymentAmount,
        remainingBalance,
        isFullyPaid
      };
    } catch (error) {
      console.error('Error sending payment received notification:', error);
      throw error;
    }
  }
}

module.exports = PaymentNotifications;
