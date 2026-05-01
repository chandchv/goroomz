/**
 * Notification Scheduler Service
 * 
 * Handles scheduled notification jobs using node-cron:
 * - Payment reminders (hourly)
 * - Daily summaries (8:00 AM)
 * - Checkout reminders (8:00 AM and 11:00 AM)
 * - Scheduled notifications processing (every 5 minutes)
 * 
 * Requirements: 8.1, 8.2
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Booking, User, Property, Room, Notification, Payment } = require('../../models');
const { NOTIFICATION_TYPES, PRIORITY_MAP, DEFAULT_CHANNELS } = require('./constants');

class NotificationScheduler {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize and start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('NotificationScheduler is already running');
      return;
    }

    console.log('🕐 Starting NotificationScheduler...');

    // Schedule payment reminders - runs every hour
    this.schedulePaymentReminders();

    // Schedule daily summaries - runs at 8:00 AM
    this.scheduleDailySummaries();

    // Schedule checkout reminders - runs at 8:00 AM and 11:00 AM
    this.scheduleCheckoutReminders();

    // Schedule processing of scheduled notifications - runs every 5 minutes
    this.scheduleNotificationProcessing();

    this.isRunning = true;
    console.log('✅ NotificationScheduler started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 Stopping NotificationScheduler...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`  Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ NotificationScheduler stopped');
  }

  /**
   * Schedule payment reminders job - runs every hour
   * Requirements: 3.1, 3.2, 3.3, 3.4, 8.1
   */
  schedulePaymentReminders() {
    // Run every hour at minute 0
    const job = cron.schedule('0 * * * *', async () => {
      console.log('📧 Running payment reminders job...');
      try {
        await this.processPaymentReminders();
        console.log('✅ Payment reminders job completed');
      } catch (error) {
        console.error('❌ Payment reminders job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('paymentReminders', job);
    console.log('  📅 Payment reminders scheduled (hourly)');
  }

  /**
   * Schedule daily summaries job - runs at 8:00 AM
   * Requirements: 2.6, 8.2
   */
  scheduleDailySummaries() {
    // Run at 8:00 AM every day
    const job = cron.schedule('0 8 * * *', async () => {
      console.log('📧 Running daily summaries job...');
      try {
        await this.sendDailySummaries();
        console.log('✅ Daily summaries job completed');
      } catch (error) {
        console.error('❌ Daily summaries job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('dailySummaries', job);
    console.log('  📅 Daily summaries scheduled (8:00 AM)');
  }

  /**
   * Schedule checkout reminders - runs at 8:00 AM and 11:00 AM
   * Requirements: 4.1, 4.2
   */
  scheduleCheckoutReminders() {
    // 8:00 AM checkout reminder (email)
    const morningJob = cron.schedule('0 8 * * *', async () => {
      console.log('📧 Running morning checkout reminders job...');
      try {
        await this.sendCheckoutReminders('morning');
        console.log('✅ Morning checkout reminders job completed');
      } catch (error) {
        console.error('❌ Morning checkout reminders job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    // 11:00 AM checkout reminder (SMS for outstanding balance)
    const lateJob = cron.schedule('0 11 * * *', async () => {
      console.log('📧 Running late checkout reminders job...');
      try {
        await this.sendCheckoutReminders('late');
        console.log('✅ Late checkout reminders job completed');
      } catch (error) {
        console.error('❌ Late checkout reminders job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('checkoutRemindersMorning', morningJob);
    this.jobs.set('checkoutRemindersLate', lateJob);
    console.log('  📅 Checkout reminders scheduled (8:00 AM and 11:00 AM)');
  }

  /**
   * Schedule notification processing - runs every 5 minutes
   * Requirements: 8.1
   */
  scheduleNotificationProcessing() {
    // Run every 5 minutes
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.processScheduledNotifications();
      } catch (error) {
        console.error('❌ Scheduled notifications processing failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('scheduledNotifications', job);
    console.log('  📅 Scheduled notifications processing (every 5 minutes)');
  }


  /**
   * Process payment reminders
   * Query bookings with payments due in 7, 3, 1 days and overdue payments
   * Requirements: 3.1, 3.2, 3.3, 3.4, 8.1
   */
  async processPaymentReminders() {
    const results = {
      reminders7Day: 0,
      reminders3Day: 0,
      reminders1Day: 0,
      overdueReminders: 0,
      errors: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get PG bookings (monthly payment type)
      const pgBookings = await Booking.findAll({
        where: {
          bookingType: 'monthly',
          status: 'confirmed',
          paymentStatus: { [Op.in]: ['pending', 'pending'] }
        },
        include: [
          { model: User, as: 'user' },
          { model: User, as: 'owner' },
          { model: Room, as: 'room', include: [{ model: Property, as: 'property' }] }
        ]
      });

      for (const booking of pgBookings) {
        try {
          // Calculate next payment due date (monthly from check-in)
          const checkInDate = new Date(booking.checkIn);
          const nextDueDate = this.calculateNextPaymentDueDate(checkInDate);
          const daysUntilDue = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

          // Check if already sent reminder today for this threshold
          const alreadySent = await this.hasReminderBeenSentToday(booking.id, daysUntilDue);
          if (alreadySent) continue;

          if (daysUntilDue === 7) {
            await this.notificationService.sendPaymentReminderNotification(booking, 7);
            results.reminders7Day++;
          } else if (daysUntilDue === 3) {
            await this.notificationService.sendPaymentReminderNotification(booking, 3);
            results.reminders3Day++;
          } else if (daysUntilDue === 1) {
            await this.notificationService.sendPaymentReminderNotification(booking, 1);
            results.reminders1Day++;
          } else if (daysUntilDue < 0) {
            // Payment is overdue
            const daysOverdue = Math.abs(daysUntilDue);
            await this.notificationService.sendPaymentOverdueNotification(booking, daysOverdue);
            results.overdueReminders++;
          }
        } catch (error) {
          results.errors.push({
            bookingId: booking.id,
            error: error.message
          });
        }
      }

      console.log('Payment reminders processed:', results);
      return results;
    } catch (error) {
      console.error('Error processing payment reminders:', error);
      throw error;
    }
  }

  /**
   * Calculate next payment due date based on check-in date
   */
  calculateNextPaymentDueDate(checkInDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkIn = new Date(checkInDate);
    const dayOfMonth = checkIn.getDate();
    
    // Find the next occurrence of the payment day
    let nextDue = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    
    if (nextDue <= today) {
      // Move to next month
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    
    return nextDue;
  }

  /**
   * Check if a reminder has already been sent today for a specific threshold
   */
  async hasReminderBeenSentToday(bookingId, daysUntilDue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let reminderType;
    if (daysUntilDue === 7) {
      reminderType = NOTIFICATION_TYPES.PAYMENT_REMINDER_7_DAY;
    } else if (daysUntilDue === 3) {
      reminderType = NOTIFICATION_TYPES.PAYMENT_REMINDER_3_DAY;
    } else if (daysUntilDue === 1) {
      reminderType = NOTIFICATION_TYPES.PAYMENT_REMINDER_1_DAY;
    } else if (daysUntilDue < 0) {
      reminderType = NOTIFICATION_TYPES.PAYMENT_OVERDUE;
    } else {
      return false;
    }

    const existingNotification = await Notification.findOne({
      where: {
        type: reminderType,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        metadata: {
          bookingId: bookingId
        }
      }
    });

    return !!existingNotification;
  }


  /**
   * Send daily summaries to property owners
   * Query today's check-ins and check-outs per property
   * Requirements: 2.6, 8.2
   */
  async sendDailySummaries() {
    const results = {
      summariesSent: 0,
      propertiesProcessed: 0,
      errors: []
    };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all active properties with their owners
      const properties = await Property.findAll({
        where: { isActive: true },
        include: [{ model: User, as: 'owner' }]
      });

      for (const property of properties) {
        try {
          if (!property.owner) continue;

          // Get today's expected check-ins
          const checkIns = await Booking.findAll({
            where: {
              propertyId: property.id,
              checkIn: {
                [Op.gte]: today,
                [Op.lt]: tomorrow
              },
              status: { [Op.in]: ['confirmed', 'pending'] }
            },
            include: [
              { model: User, as: 'user' },
              { model: Room, as: 'room' }
            ]
          });

          // Get today's expected check-outs
          const checkOuts = await Booking.findAll({
            where: {
              propertyId: property.id,
              checkOut: {
                [Op.gte]: today,
                [Op.lt]: tomorrow
              },
              status: 'confirmed'
            },
            include: [
              { model: User, as: 'user' },
              { model: Room, as: 'room' }
            ]
          });

          results.propertiesProcessed++;

          // Only send summary if there are check-ins or check-outs
          if (checkIns.length === 0 && checkOuts.length === 0) {
            continue;
          }

          // Generate summary content
          const summaryContent = this.generateDailySummaryContent(property, checkIns, checkOuts);

          // Create and send notification
          const notification = await this.notificationService.createNotification({
            userId: property.owner.id,
            type: NOTIFICATION_TYPES.DAILY_SUMMARY_OWNER,
            title: `Daily Summary for ${property.name}`,
            message: summaryContent,
            priority: 'low',
            channels: ['email'],
            metadata: {
              propertyId: property.id,
              propertyName: property.name,
              checkInsCount: checkIns.length,
              checkOutsCount: checkOuts.length,
              date: today.toISOString().split('T')[0]
            }
          });

          await this.notificationService.sendNotificationById(notification);
          results.summariesSent++;

        } catch (error) {
          results.errors.push({
            propertyId: property.id,
            error: error.message
          });
        }
      }

      console.log('Daily summaries sent:', results);
      return results;
    } catch (error) {
      console.error('Error sending daily summaries:', error);
      throw error;
    }
  }

  /**
   * Generate daily summary content HTML
   */
  generateDailySummaryContent(property, checkIns, checkOuts) {
    const today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let html = `
      <h2>Daily Summary for ${property.name}</h2>
      <p><strong>Date:</strong> ${today}</p>
    `;

    if (checkIns.length > 0) {
      html += `
        <h3>Expected Check-ins (${checkIns.length})</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <th>Guest Name</th>
            <th>Room</th>
            <th>Contact</th>
          </tr>
      `;
      
      for (const booking of checkIns) {
        html += `
          <tr>
            <td>${booking.user?.name || 'N/A'}</td>
            <td>${booking.room?.name || 'N/A'}</td>
            <td>${booking.contactInfo?.phone || 'N/A'}</td>
          </tr>
        `;
      }
      
      html += '</table>';
    }

    if (checkOuts.length > 0) {
      html += `
        <h3>Expected Check-outs (${checkOuts.length})</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <th>Guest Name</th>
            <th>Room</th>
            <th>Outstanding Balance</th>
          </tr>
      `;
      
      for (const booking of checkOuts) {
        const balance = booking.getOutstandingBalance ? booking.getOutstandingBalance() : 
          (parseFloat(booking.totalAmount) - parseFloat(booking.paidAmount));
        
        html += `
          <tr>
            <td>${booking.user?.name || 'N/A'}</td>
            <td>${booking.room?.name || 'N/A'}</td>
            <td>₹${balance.toFixed(2)}</td>
          </tr>
        `;
      }
      
      html += '</table>';
    }

    html += `
      <p style="margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'https://goroomz.in'}/dashboard">View Dashboard</a>
      </p>
    `;

    return html;
  }


  /**
   * Send checkout reminders for hotel bookings
   * Requirements: 4.1, 4.2
   * 
   * @param {string} reminderType - 'morning' (8:00 AM email) or 'late' (11:00 AM SMS)
   */
  async sendCheckoutReminders(reminderType = 'morning') {
    const results = {
      remindersSent: 0,
      bookingsProcessed: 0,
      errors: []
    };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get hotel bookings with checkout today
      const bookings = await Booking.findAll({
        where: {
          bookingType: 'daily', // Hotel bookings
          checkOut: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          },
          status: 'confirmed'
        },
        include: [
          { model: User, as: 'user' },
          { model: Room, as: 'room', include: [{ model: Property, as: 'property' }] }
        ]
      });

      for (const booking of bookings) {
        try {
          results.bookingsProcessed++;

          const outstandingBalance = booking.getOutstandingBalance ? 
            booking.getOutstandingBalance() : 
            (parseFloat(booking.totalAmount) - parseFloat(booking.paidAmount));

          if (reminderType === 'morning') {
            // 8:00 AM - Send email reminder to all
            await this.notificationService.hotelCheckout.sendCheckoutReminderNotification(
              booking, 
              'morning'
            );
            results.remindersSent++;
          } else if (reminderType === 'late' && outstandingBalance > 0) {
            // 11:00 AM - Send SMS only if outstanding balance > 0
            await this.notificationService.hotelCheckout.sendCheckoutReminderNotification(
              booking, 
              'late'
            );
            results.remindersSent++;
          }
        } catch (error) {
          results.errors.push({
            bookingId: booking.id,
            error: error.message
          });
        }
      }

      console.log(`Checkout reminders (${reminderType}) sent:`, results);
      return results;
    } catch (error) {
      console.error('Error sending checkout reminders:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   * Query notifications with scheduledFor <= now and send them
   * Requirements: 8.1
   */
  async processScheduledNotifications() {
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    };

    try {
      const now = new Date();

      // Find all pending notifications that are scheduled for now or earlier
      const scheduledNotifications = await Notification.findAll({
        where: {
          status: 'pending',
          scheduledFor: {
            [Op.lte]: now,
            [Op.ne]: null
          }
        },
        include: [{ model: User, as: 'user' }],
        order: [['scheduledFor', 'ASC']],
        limit: 100 // Process in batches
      });

      results.processed = scheduledNotifications.length;

      if (scheduledNotifications.length === 0) {
        return results;
      }

      console.log(`Processing ${scheduledNotifications.length} scheduled notifications...`);

      for (const notification of scheduledNotifications) {
        try {
          const deliveryResult = await this.notificationService.sendNotificationById(notification);
          
          if (deliveryResult.status === 'sent') {
            results.sent++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            notificationId: notification.id,
            error: error.message
          });
        }
      }

      if (results.processed > 0) {
        console.log('Scheduled notifications processed:', results);
      }
      
      return results;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Manually trigger a specific job (for testing/admin purposes)
   */
  async triggerJob(jobName) {
    switch (jobName) {
      case 'paymentReminders':
        return await this.processPaymentReminders();
      case 'dailySummaries':
        return await this.sendDailySummaries();
      case 'checkoutRemindersMorning':
        return await this.sendCheckoutReminders('morning');
      case 'checkoutRemindersLate':
        return await this.sendCheckoutReminders('late');
      case 'scheduledNotifications':
        return await this.processScheduledNotifications();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: {}
    };

    for (const [name, job] of this.jobs) {
      status.jobs[name] = {
        scheduled: true,
        running: job.running || false
      };
    }

    return status;
  }
}

module.exports = NotificationScheduler;

