/**
 * Internal Staff Notifications Service
 * 
 * Handles notifications for internal staff including:
 * - Lead assignments to agents
 * - Approval requests
 * - Support ticket notifications
 * - Zero occupancy alerts
 * - Payment failure alerts
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

const { User, Territory } = require('../../models');
const { NOTIFICATION_TYPES } = require('./constants');

class InternalStaffNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send notification when a new lead is assigned to an agent
   * Sends email, SMS, and in-app notification to the assigned agent
   * Requirements: 5.1
   * @param {Object} lead - Lead object with property and assignment details
   * @param {Object} agent - Agent user object
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendInternalLeadAssignedNotification(lead, agent) {
    const notifications = [];
    const errors = [];

    try {
      if (!agent || !agent.id) {
        throw new Error('Agent is required for lead assignment notification');
      }

      // Get property details if available
      let property = lead.property;
      if (!property && lead.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(lead.propertyId);
      }

      const propertyName = lead.propertyName || property?.name || 'New Property';
      const ownerName = lead.propertyOwnerName || 'Property Owner';
      const ownerPhone = lead.phone || 'N/A';
      const ownerEmail = lead.email || 'N/A';
      const city = lead.city || 'N/A';
      const state = lead.state || 'N/A';
      const propertyType = lead.propertyType || 'N/A';

      // Create notification record
      const notification = await this.baseService.createNotification({
        userId: agent.id,
        type: NOTIFICATION_TYPES.LEAD_ASSIGNED,
        title: 'New Lead Assigned',
        message: `You have been assigned a new lead: ${propertyName} in ${city}. Contact ${ownerName} at ${ownerPhone} within 4 hours.`,
        priority: 'high',
        channels: ['email', 'sms', 'in_app'],
        metadata: {
          leadId: lead.id,
          propertyId: lead.propertyId,
          propertyName,
          ownerName,
          ownerPhone,
          ownerEmail,
          city,
          state,
          propertyType,
          assignedAt: new Date().toISOString(),
          agentId: agent.id,
          agentName: agent.name
        }
      });

      // Send email notification
      if (agent.email) {
        try {
          const emailContent = {
            subject: `New Lead Assigned - ${propertyName}`,
            body: `
              <h2>New Lead Assigned to You</h2>
              <p>Dear ${agent.name || 'Agent'},</p>
              
              <p>You have been assigned a new property lead that requires your immediate attention.</p>
              
              <h3>Property Details:</h3>
              <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Property Name</strong></td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Owner</strong></td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${ownerName}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Location</strong></td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${city}, ${state}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Property Type</strong></td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${propertyType}</td>
                </tr>
              </table>
              
              <h3>Contact Information:</h3>
              <ul>
                <li><strong>Phone:</strong> ${ownerPhone}</li>
                <li><strong>Email:</strong> ${ownerEmail}</li>
              </ul>
              
              <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <strong>Action Required:</strong> Please contact the property owner within 4 hours.
              </p>
              
              <h3>Next Steps:</h3>
              <ol>
                <li>Contact the property owner within 4 hours</li>
                <li>Schedule a property visit or virtual tour</li>
                <li>Complete the lead qualification process</li>
                <li>Update the lead status in the system</li>
              </ol>
              
              <p><a href="${process.env.INTERNAL_DASHBOARD_URL || 'http://localhost:3001'}/leads/${lead.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Lead Details</a></p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'high'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: agent.email });
          await notification.updateDeliveryStatus('email', 'sent');
          notifications.push({
            channel: 'email',
            recipient: agent.email,
            success: true
          });
        } catch (error) {
          await notification.updateDeliveryStatus('email', 'failed', error.message);
          errors.push({
            channel: 'email',
            error: error.message
          });
        }
      }

      // Send SMS notification
      if (agent.phone) {
        try {
          const smsContent = {
            smsText: `New lead: ${propertyName} in ${city}. Contact ${ownerName} at ${ownerPhone} within 4hrs. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: agent.phone });
          await notification.updateDeliveryStatus('sms', 'sent');
          notifications.push({
            channel: 'sms',
            recipient: agent.phone,
            success: true
          });
        } catch (error) {
          await notification.updateDeliveryStatus('sms', 'failed', error.message);
          errors.push({
            channel: 'sms',
            error: error.message
          });
        }
      }

      // In-app notification is already created, mark as sent
      try {
        await notification.updateDeliveryStatus('in_app', 'sent');
        notifications.push({
          channel: 'in_app',
          recipient: agent.id,
          success: true
        });
      } catch (error) {
        await notification.updateDeliveryStatus('in_app', 'failed', error.message);
        errors.push({
          channel: 'in_app',
          error: error.message
        });
      }

      // Update notification status
      const anySuccess = notifications.some(n => n.success);
      notification.status = anySuccess ? 'sent' : 'failed';
      notification.sentAt = anySuccess ? new Date() : null;
      await notification.save();

      return {
        success: anySuccess,
        notifications,
        errors,
        notificationId: notification.id
      };
    } catch (error) {
      console.error('Error sending lead assigned notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a lead requires approval
   * Sends in-app notification to users with approval authority
   * Requirements: 5.2
   * @param {Object} lead - Lead object requiring approval
   * @param {string} approvalType - Type of approval needed
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendApprovalRequiredNotification(lead, approvalType = 'property_onboarding') {
    const notifications = [];
    const errors = [];

    try {
      // Find users with approval authority
      const approvers = await User.findAll({
        where: {
          role: ['superuser', 'platform_head', 'operation_head', 'admin']
        }
      });

      if (approvers.length === 0) {
        return {
          success: false,
          notifications: [],
          errors: [{ error: 'No approvers found' }],
          approverCount: 0
        };
      }

      const propertyName = lead.propertyName || 'Property';
      const ownerName = lead.propertyOwnerName || 'Property Owner';
      const city = lead.city || 'N/A';

      // Create notification for each approver
      for (const approver of approvers) {
        try {
          const notification = await this.baseService.createNotification({
            userId: approver.id,
            type: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
            title: 'Approval Required',
            message: `Lead "${propertyName}" in ${city} requires your approval. Owner: ${ownerName}`,
            priority: 'high',
            channels: ['in_app'],
            metadata: {
              leadId: lead.id,
              propertyName,
              ownerName,
              city,
              approvalType,
              requestedAt: new Date().toISOString(),
              approverId: approver.id,
              approverRole: approver.role
            }
          });

          // Mark in-app notification as sent
          await notification.updateDeliveryStatus('in_app', 'sent');
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          notifications.push({
            channel: 'in_app',
            recipient: approver.id,
            recipientRole: approver.role,
            success: true,
            notificationId: notification.id
          });
        } catch (error) {
          errors.push({
            channel: 'in_app',
            recipient: approver.id,
            error: error.message
          });
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        approverCount: approvers.length
      };
    } catch (error) {
      console.error('Error sending approval required notification:', error);
      throw error;
    }
  }


  /**
   * Send notification when a support ticket is created or escalated
   * Sends in-app notification to operations managers
   * Requirements: 5.3
   * @param {Object} ticket - Ticket object with details
   * @param {string} action - 'created' or 'escalated'
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendTicketNotification(ticket, action = 'created') {
    const notifications = [];
    const errors = [];

    try {
      // Find operations managers
      const operationsManagers = await User.findAll({
        where: {
          role: ['operation_head', 'operation_manager', 'superuser', 'admin']
        }
      });

      if (operationsManagers.length === 0) {
        return {
          success: false,
          notifications: [],
          errors: [{ error: 'No operations managers found' }],
          managerCount: 0
        };
      }

      const ticketTitle = ticket.title || ticket.subject || 'Support Ticket';
      const ticketPriority = ticket.priority || 'medium';
      const ticketCategory = ticket.category || 'general';
      const isEscalated = action === 'escalated';

      // Create notification for each operations manager
      for (const manager of operationsManagers) {
        try {
          const notification = await this.baseService.createNotification({
            userId: manager.id,
            type: NOTIFICATION_TYPES.TICKET_CREATED,
            title: isEscalated ? 'Ticket Escalated' : 'New Support Ticket',
            message: isEscalated 
              ? `Ticket "${ticketTitle}" has been escalated. Priority: ${ticketPriority}`
              : `New support ticket: "${ticketTitle}". Category: ${ticketCategory}, Priority: ${ticketPriority}`,
            priority: isEscalated ? 'high' : 'medium',
            channels: ['in_app'],
            metadata: {
              ticketId: ticket.id,
              ticketTitle,
              ticketPriority,
              ticketCategory,
              action,
              isEscalated,
              createdAt: ticket.createdAt || new Date().toISOString(),
              escalatedAt: isEscalated ? new Date().toISOString() : null,
              managerId: manager.id,
              managerRole: manager.role
            }
          });

          // Mark in-app notification as sent
          await notification.updateDeliveryStatus('in_app', 'sent');
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          notifications.push({
            channel: 'in_app',
            recipient: manager.id,
            recipientRole: manager.role,
            success: true,
            notificationId: notification.id
          });
        } catch (error) {
          errors.push({
            channel: 'in_app',
            recipient: manager.id,
            error: error.message
          });
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        managerCount: operationsManagers.length,
        action
      };
    } catch (error) {
      console.error('Error sending ticket notification:', error);
      throw error;
    }
  }

  /**
   * Send alert when a property has zero occupancy for 3 consecutive days
   * Sends alert to the regional manager
   * Requirements: 5.4
   * @param {Object} property - Property object with occupancy data
   * @param {number} daysWithZeroOccupancy - Number of consecutive days with zero occupancy
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendZeroOccupancyAlert(property, daysWithZeroOccupancy = 3) {
    const notifications = [];
    const errors = [];

    try {
      // Only send alert if zero occupancy for 3+ days
      if (daysWithZeroOccupancy < 3) {
        return {
          success: false,
          notifications: [],
          errors: [{ error: 'Zero occupancy threshold not met (requires 3+ days)' }],
          daysWithZeroOccupancy
        };
      }

      // Get property details
      let propertyData = property;
      if (typeof property === 'string' || typeof property === 'number') {
        const { Property } = require('../../models');
        propertyData = await Property.findByPk(property);
      }

      if (!propertyData) {
        throw new Error('Property not found');
      }

      const propertyName = propertyData.name || 'Property';
      const propertyCity = propertyData.city || 'N/A';
      const propertyState = propertyData.state || 'N/A';

      // Find regional manager for this property's territory
      let regionalManager = null;
      if (propertyData.territoryId) {
        const territory = await Territory.findByPk(propertyData.territoryId, {
          include: [{ model: User, as: 'territoryHead' }]
        });
        regionalManager = territory?.territoryHead;
      }

      // If no regional manager, notify all operation heads
      const recipients = regionalManager 
        ? [regionalManager]
        : await User.findAll({
            where: {
              role: ['operation_head', 'regional_manager', 'superuser']
            }
          });

      if (recipients.length === 0) {
        return {
          success: false,
          notifications: [],
          errors: [{ error: 'No regional managers or operation heads found' }],
          daysWithZeroOccupancy
        };
      }

      // Create notification for each recipient
      for (const recipient of recipients) {
        try {
          const notification = await this.baseService.createNotification({
            userId: recipient.id,
            type: NOTIFICATION_TYPES.ZERO_OCCUPANCY_ALERT,
            title: 'Zero Occupancy Alert',
            message: `Property "${propertyName}" in ${propertyCity} has had zero occupancy for ${daysWithZeroOccupancy} consecutive days. Immediate attention required.`,
            priority: 'high',
            channels: ['email', 'in_app'],
            metadata: {
              propertyId: propertyData.id,
              propertyName,
              propertyCity,
              propertyState,
              territoryId: propertyData.territoryId,
              daysWithZeroOccupancy,
              alertedAt: new Date().toISOString(),
              recipientId: recipient.id,
              recipientRole: recipient.role
            }
          });

          // Send email notification
          if (recipient.email) {
            try {
              const emailContent = {
                subject: `Zero Occupancy Alert - ${propertyName}`,
                body: `
                  <h2>Zero Occupancy Alert</h2>
                  <p>Dear ${recipient.name || 'Manager'},</p>
                  
                  <p style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                    <strong>Alert:</strong> Property "${propertyName}" has had <strong>zero occupancy for ${daysWithZeroOccupancy} consecutive days</strong>.
                  </p>
                  
                  <h3>Property Details:</h3>
                  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Property Name</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${propertyName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Location</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${propertyCity}, ${propertyState}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Days with Zero Occupancy</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545;"><strong>${daysWithZeroOccupancy} days</strong></td>
                    </tr>
                  </table>
                  
                  <h3>Recommended Actions:</h3>
                  <ul>
                    <li>Review property pricing and availability</li>
                    <li>Check for any maintenance issues</li>
                    <li>Contact property owner to discuss marketing strategies</li>
                    <li>Consider promotional offers or discounts</li>
                  </ul>
                  
                  <p><a href="${process.env.INTERNAL_DASHBOARD_URL || 'http://localhost:3001'}/properties/${propertyData.id}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Property Details</a></p>
                  
                  <p>Best regards,<br>GoRoomz System</p>
                `,
                priority: 'high'
              };

              await this.baseService.sendEmailNotification(emailContent, { email: recipient.email });
              await notification.updateDeliveryStatus('email', 'sent');
              notifications.push({
                channel: 'email',
                recipient: recipient.email,
                success: true
              });
            } catch (error) {
              await notification.updateDeliveryStatus('email', 'failed', error.message);
              errors.push({
                channel: 'email',
                recipient: recipient.email,
                error: error.message
              });
            }
          }

          // Mark in-app notification as sent
          try {
            await notification.updateDeliveryStatus('in_app', 'sent');
            notifications.push({
              channel: 'in_app',
              recipient: recipient.id,
              success: true
            });
          } catch (error) {
            await notification.updateDeliveryStatus('in_app', 'failed', error.message);
            errors.push({
              channel: 'in_app',
              recipient: recipient.id,
              error: error.message
            });
          }

          // Update notification status
          const anySuccess = notifications.filter(n => n.recipient === recipient.id || n.recipient === recipient.email).some(n => n.success);
          notification.status = anySuccess ? 'sent' : 'failed';
          notification.sentAt = anySuccess ? new Date() : null;
          await notification.save();

        } catch (error) {
          errors.push({
            recipient: recipient.id,
            error: error.message
          });
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        recipientCount: recipients.length,
        daysWithZeroOccupancy,
        propertyId: propertyData.id,
        propertyName
      };
    } catch (error) {
      console.error('Error sending zero occupancy alert:', error);
      throw error;
    }
  }


  /**
   * Send alert when a payment failure occurs
   * Sends alert to operations managers
   * Requirements: 5.5
   * @param {Object} payment - Payment object with failure details
   * @param {Object} booking - Associated booking object
   * @param {string} failureReason - Reason for payment failure
   * @returns {Promise<Object>} Result with notifications sent
   */
  async sendPaymentFailureAlert(payment, booking, failureReason = 'Unknown error') {
    const notifications = [];
    const errors = [];

    try {
      // Find operations managers
      const operationsManagers = await User.findAll({
        where: {
          role: ['operation_head', 'operation_manager', 'superuser', 'admin']
        }
      });

      if (operationsManagers.length === 0) {
        return {
          success: false,
          notifications: [],
          errors: [{ error: 'No operations managers found' }],
          managerCount: 0
        };
      }

      // Get booking details if not provided
      if (!booking && payment.bookingId) {
        const { Booking } = require('../../models');
        booking = await Booking.findByPk(payment.bookingId, {
          include: [
            { association: 'property' },
            { association: 'room' }
          ]
        });
      }

      const paymentAmount = parseFloat(payment.amount) || 0;
      const paymentMethod = payment.paymentMethod || 'Unknown';
      const propertyName = booking?.property?.name || 'Property';
      const guestName = booking?.contactInfo?.name || booking?.guestName || 'Guest';
      const bookingNumber = booking?.bookingNumber || 'N/A';

      // Create notification for each operations manager
      for (const manager of operationsManagers) {
        try {
          const notification = await this.baseService.createNotification({
            userId: manager.id,
            type: NOTIFICATION_TYPES.PAYMENT_FAILURE_ALERT,
            title: 'Payment Failure Alert',
            message: `Payment of Rs.${paymentAmount} failed for booking ${bookingNumber} at ${propertyName}. Reason: ${failureReason}`,
            priority: 'urgent',
            channels: ['email', 'in_app'],
            metadata: {
              paymentId: payment.id,
              bookingId: booking?.id,
              bookingNumber,
              propertyId: booking?.propertyId,
              propertyName,
              guestName,
              paymentAmount,
              paymentMethod,
              failureReason,
              failedAt: new Date().toISOString(),
              managerId: manager.id,
              managerRole: manager.role
            }
          });

          // Send email notification
          if (manager.email) {
            try {
              const emailContent = {
                subject: `Payment Failure Alert - ${propertyName}`,
                body: `
                  <h2>Payment Failure Alert</h2>
                  <p>Dear ${manager.name || 'Manager'},</p>
                  
                  <p style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                    <strong>Alert:</strong> A payment has failed and requires immediate attention.
                  </p>
                  
                  <h3>Payment Details:</h3>
                  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Amount</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545;"><strong>Rs.${paymentAmount}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Payment Method</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${paymentMethod}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Failure Reason</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545;">${failureReason}</td>
                    </tr>
                  </table>
                  
                  <h3>Booking Details:</h3>
                  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Booking Number</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${bookingNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Property</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${propertyName}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Guest</strong></td>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">${guestName}</td>
                    </tr>
                  </table>
                  
                  <h3>Recommended Actions:</h3>
                  <ul>
                    <li>Contact the guest to resolve payment issues</li>
                    <li>Verify payment gateway status</li>
                    <li>Check for any system errors</li>
                    <li>Update booking status if necessary</li>
                  </ul>
                  
                  ${booking?.id ? `<p><a href="${process.env.INTERNAL_DASHBOARD_URL || 'http://localhost:3001'}/bookings/${booking.id}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking Details</a></p>` : ''}
                  
                  <p>Best regards,<br>GoRoomz System</p>
                `,
                priority: 'urgent'
              };

              await this.baseService.sendEmailNotification(emailContent, { email: manager.email });
              await notification.updateDeliveryStatus('email', 'sent');
              notifications.push({
                channel: 'email',
                recipient: manager.email,
                success: true
              });
            } catch (error) {
              await notification.updateDeliveryStatus('email', 'failed', error.message);
              errors.push({
                channel: 'email',
                recipient: manager.email,
                error: error.message
              });
            }
          }

          // Mark in-app notification as sent
          try {
            await notification.updateDeliveryStatus('in_app', 'sent');
            notifications.push({
              channel: 'in_app',
              recipient: manager.id,
              success: true,
              notificationId: notification.id
            });
          } catch (error) {
            await notification.updateDeliveryStatus('in_app', 'failed', error.message);
            errors.push({
              channel: 'in_app',
              recipient: manager.id,
              error: error.message
            });
          }

          // Update notification status
          const anySuccess = notifications.filter(n => n.recipient === manager.id || n.recipient === manager.email).some(n => n.success);
          notification.status = anySuccess ? 'sent' : 'failed';
          notification.sentAt = anySuccess ? new Date() : null;
          await notification.save();

        } catch (error) {
          errors.push({
            recipient: manager.id,
            error: error.message
          });
        }
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        managerCount: operationsManagers.length,
        paymentId: payment.id,
        failureReason
      };
    } catch (error) {
      console.error('Error sending payment failure alert:', error);
      throw error;
    }
  }
}

module.exports = InternalStaffNotifications;
