const { Op } = require('sequelize');
const { 
  Alert, 
  Notification, 
  Room, 
  Booking, 
  Payment, 
  SupportTicket, 
  User 
} = require('../models');
const emailService = require('../utils/emailService');

class AlertService {
  constructor() {
    this.alertThresholds = {
      zeroOccupancyDays: 7,
      paymentFailureThreshold: 5, // Number of failed payments to trigger alert
      systemErrorThreshold: 10 // Number of errors affecting multiple properties
    };
  }

  /**
   * Generate alerts for zero occupancy properties
   * Requirement 14.1: WHEN a property has zero occupancy for more than 7 days THEN the System SHALL create an alert
   */
  async generateZeroOccupancyAlerts() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.alertThresholds.zeroOccupancyDays);

      // Find properties with zero occupancy for more than 7 days
      const propertiesWithZeroOccupancy = await Room.findAll({
        where: {
          isActive: true
        },
        include: [{
          model: Booking,
          as: 'bookings',
          where: {
            status: ['confirmed', 'completed'],
            checkOut: {
              [Op.gte]: cutoffDate
            }
          },
          required: false
        }]
      });

      const zeroOccupancyProperties = propertiesWithZeroOccupancy.filter(property => {
        // Check if property has no active bookings in the last 7 days
        const recentBookings = property.bookings.filter(booking => {
          const checkOut = new Date(booking.checkOut);
          return checkOut >= cutoffDate;
        });
        return recentBookings.length === 0;
      });

      const alerts = [];
      for (const property of zeroOccupancyProperties) {
        // Check if alert already exists for this property
        const existingAlert = await Alert.findOne({
          where: {
            type: 'zero_occupancy',
            propertyId: property.id,
            status: ['new', 'in_progress']
          }
        });

        if (!existingAlert) {
          const alert = await Alert.create({
            type: 'zero_occupancy',
            title: `Zero Occupancy Alert - ${property.title}`,
            description: `Property "${property.title}" has had zero occupancy for more than ${this.alertThresholds.zeroOccupancyDays} days. Immediate attention required to improve bookings.`,
            severity: 'high',
            propertyId: property.id,
            ownerId: property.ownerId,
            metadata: {
              propertyTitle: property.title,
              daysSinceLastBooking: this.alertThresholds.zeroOccupancyDays,
              location: property.location
            }
          });

          alerts.push(alert);

          // Create notifications for Operations Managers
          await this.createNotificationsForRole('operations_manager', {
            type: 'alert',
            title: alert.title,
            message: alert.description,
            priority: 'high',
            metadata: {
              alertId: alert.id,
              propertyId: property.id,
              alertType: 'zero_occupancy'
            }
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error generating zero occupancy alerts:', error);
      throw error;
    }
  }

  /**
   * Generate alerts for payment failures
   * Requirement 14.2: WHEN payment failures exceed a threshold THEN the System SHALL alert the Operations Manager
   */
  async generatePaymentFailureAlerts() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 1); // Last 24 hours

      // Find properties with multiple payment failures
      const failedPayments = await Payment.findAll({
        where: {
          status: 'failed',
          createdAt: {
            [Op.gte]: cutoffDate
          }
        },
        include: [{
          model: Booking,
          as: 'booking',
          include: [{
            model: Room,
            as: 'room'
          }]
        }]
      });

      // Group by property and count failures
      const propertyFailures = {};
      failedPayments.forEach(payment => {
        const propertyId = payment.booking.room.id;
        if (!propertyFailures[propertyId]) {
          propertyFailures[propertyId] = {
            count: 0,
            property: payment.booking.room,
            ownerId: payment.booking.room.ownerId,
            failures: []
          };
        }
        propertyFailures[propertyId].count++;
        propertyFailures[propertyId].failures.push(payment);
      });

      const alerts = [];
      for (const [propertyId, data] of Object.entries(propertyFailures)) {
        if (data.count >= this.alertThresholds.paymentFailureThreshold) {
          // Check if alert already exists
          const existingAlert = await Alert.findOne({
            where: {
              type: 'payment_failure',
              propertyId: propertyId,
              status: ['new', 'in_progress'],
              triggeredAt: {
                [Op.gte]: cutoffDate
              }
            }
          });

          if (!existingAlert) {
            const alert = await Alert.create({
              type: 'payment_failure',
              title: `Payment Failure Alert - ${data.property.title}`,
              description: `Property "${data.property.title}" has experienced ${data.count} payment failures in the last 24 hours. This may indicate payment gateway issues or customer payment problems.`,
              severity: 'high',
              propertyId: propertyId,
              ownerId: data.ownerId,
              metadata: {
                failureCount: data.count,
                propertyTitle: data.property.title,
                failedPaymentIds: data.failures.map(f => f.id),
                timeframe: '24 hours'
              }
            });

            alerts.push(alert);

            // Create notifications for Operations Managers
            await this.createNotificationsForRole('operations_manager', {
              type: 'alert',
              title: alert.title,
              message: alert.description,
              priority: 'high',
              metadata: {
                alertId: alert.id,
                propertyId: propertyId,
                alertType: 'payment_failure'
              }
            });
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error generating payment failure alerts:', error);
      throw error;
    }
  }

  /**
   * Generate alerts for high-priority support tickets
   * Requirement 14.3: WHEN a property owner submits a high-priority support ticket THEN the System SHALL notify the Operations Manager immediately
   */
  async generateHighPriorityTicketAlerts() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - 5); // Last 5 minutes

      // Find new high-priority tickets
      const highPriorityTickets = await SupportTicket.findAll({
        where: {
          priority: ['high', 'urgent'],
          status: 'new',
          createdAt: {
            [Op.gte]: cutoffDate
          }
        },
        include: [{
          model: User,
          as: 'propertyOwner'
        }]
      });

      const alerts = [];
      for (const ticket of highPriorityTickets) {
        // Check if alert already exists for this ticket
        const existingAlert = await Alert.findOne({
          where: {
            type: 'high_priority_ticket',
            ticketId: ticket.id
          }
        });

        if (!existingAlert) {
          const alert = await Alert.create({
            type: 'high_priority_ticket',
            title: `High Priority Ticket - ${ticket.ticketNumber}`,
            description: `A ${ticket.priority} priority support ticket has been submitted by ${ticket.propertyOwner.name}. Ticket: "${ticket.title}". Immediate attention required.`,
            severity: ticket.priority === 'urgent' ? 'critical' : 'high',
            ticketId: ticket.id,
            ownerId: ticket.propertyOwnerId,
            metadata: {
              ticketNumber: ticket.ticketNumber,
              ticketTitle: ticket.title,
              propertyOwnerName: ticket.propertyOwner.name,
              category: ticket.category,
              priority: ticket.priority
            }
          });

          alerts.push(alert);

          // Create immediate notifications for Operations Managers
          await this.createNotificationsForRole('operations_manager', {
            type: 'alert',
            title: alert.title,
            message: alert.description,
            priority: ticket.priority === 'urgent' ? 'urgent' : 'high',
            deliveryMethod: ['in_app', 'email'], // Immediate email notification
            metadata: {
              alertId: alert.id,
              ticketId: ticket.id,
              alertType: 'high_priority_ticket'
            }
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error generating high priority ticket alerts:', error);
      throw error;
    }
  }

  /**
   * Generate alerts for system errors
   * Requirement 14.4: WHEN system errors occur THEN the System SHALL log the error and alert the Operations Manager if it affects multiple properties
   */
  async generateSystemErrorAlerts(errorDetails) {
    try {
      const { 
        errorType, 
        errorMessage, 
        affectedProperties = [], 
        severity = 'medium',
        metadata = {} 
      } = errorDetails;

      // Only create alert if it affects multiple properties or is critical
      if (affectedProperties.length >= this.alertThresholds.systemErrorThreshold || severity === 'critical') {
        const alert = await Alert.create({
          type: 'system_error',
          title: `System Error Alert - ${errorType}`,
          description: `System error detected: ${errorMessage}. ${affectedProperties.length > 0 ? `Affecting ${affectedProperties.length} properties.` : 'System-wide impact detected.'}`,
          severity: affectedProperties.length >= this.alertThresholds.systemErrorThreshold ? 'critical' : severity,
          metadata: {
            errorType,
            errorMessage,
            affectedPropertiesCount: affectedProperties.length,
            affectedPropertyIds: affectedProperties,
            ...metadata
          }
        });

        // Create notifications for Operations Managers and Platform Admins
        const roles = ['operations_manager'];
        if (severity === 'critical') {
          roles.push('platform_admin', 'superuser');
        }

        for (const role of roles) {
          await this.createNotificationsForRole(role, {
            type: 'alert',
            title: alert.title,
            message: alert.description,
            priority: alert.severity === 'critical' ? 'urgent' : 'high',
            deliveryMethod: alert.severity === 'critical' ? ['in_app', 'email'] : ['in_app'],
            metadata: {
              alertId: alert.id,
              alertType: 'system_error'
            }
          });
        }

        return alert;
      }

      return null;
    } catch (error) {
      console.error('Error generating system error alert:', error);
      throw error;
    }
  }

  /**
   * Create notifications for users with specific role
   */
  async createNotificationsForRole(role, notificationData) {
    try {
      const users = await User.findAll({
        where: {
          internalRole: role,
          isActive: true
        }
      });

      const notifications = [];
      for (const user of users) {
        const notification = await Notification.create({
          userId: user.id,
          ...notificationData
        });

        notifications.push(notification);

        // Send email if specified in delivery method
        if (notificationData.deliveryMethod?.includes('email')) {
          await this.sendEmailNotification(user, notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating notifications for role:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(user, notification) {
    try {
      const emailOptions = {
        to: user.email,
        subject: `GoRoomz Alert: ${notification.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Alert Notification</h2>
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Priority:</strong> ${notification.priority.toUpperCase()}<br>
              <strong>Time:</strong> ${new Date().toLocaleString()}
            </div>
            <p>Please log in to your dashboard to view more details and take appropriate action.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">
              This is an automated alert from the GoRoomz platform management system.
            </p>
          </div>
        `
      };

      await emailService.sendEmail(emailOptions);

      // Update notification as email sent
      await notification.update({ emailSent: true, sentAt: new Date() });
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw error to prevent breaking the alert generation process
    }
  }

  /**
   * Run all alert generation processes
   */
  async generateAllAlerts() {
    try {
      console.log('Starting alert generation process...');

      const results = {
        zeroOccupancy: await this.generateZeroOccupancyAlerts(),
        paymentFailures: await this.generatePaymentFailureAlerts(),
        highPriorityTickets: await this.generateHighPriorityTicketAlerts()
      };

      const totalAlerts = Object.values(results).reduce((sum, alerts) => sum + alerts.length, 0);
      console.log(`Alert generation completed. Generated ${totalAlerts} new alerts.`);

      return results;
    } catch (error) {
      console.error('Error in alert generation process:', error);
      throw error;
    }
  }

  /**
   * Get alerts with filtering
   * Requirement 14.5: WHEN viewing alerts THEN the System SHALL allow filtering by priority, type, and status
   */
  async getAlerts(filters = {}) {
    try {
      const where = {};

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.severity) {
        where.severity = filters.severity;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.propertyId) {
        where.propertyId = filters.propertyId;
      }

      if (filters.ownerId) {
        where.ownerId = filters.ownerId;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.triggeredAt = {};
        if (filters.dateFrom) {
          where.triggeredAt[Op.gte] = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.triggeredAt[Op.lte] = new Date(filters.dateTo);
        }
      }

      const alerts = await Alert.findAll({
        where,
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email']
          },
          {
            model: SupportTicket,
            as: 'ticket',
            attributes: ['id', 'ticketNumber', 'title', 'priority']
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['id', 'name']
          }
        ],
        order: [['triggeredAt', 'DESC']]
      });

      return alerts;
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy, resolutionNotes) {
    try {
      const alert = await Alert.findByPk(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      await alert.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes
      });

      return alert;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId) {
    try {
      const alert = await Alert.findByPk(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      await alert.update({
        status: 'dismissed'
      });

      return alert;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();