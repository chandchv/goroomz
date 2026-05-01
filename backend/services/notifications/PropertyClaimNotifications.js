/**
 * Property Claim Notifications Service
 * 
 * Handles notifications for property claims including:
 * - Claim submission notifications to admins
 * - Claim approval notifications to claimants
 * - Claim rejection notifications to claimants
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

const { User } = require('../../models');
const { NOTIFICATION_TYPES } = require('./constants');

class PropertyClaimNotifications {
  constructor(baseService) {
    this.baseService = baseService;
  }

  /**
   * Send notification when a property claim is submitted
   * Sends in-app notification to all admins and email to operations team
   * Requirements: 1.1, 1.2
   */
  async sendPropertyClaimSubmittedNotification(claim) {
    const notifications = [];
    const errors = [];

    try {
      // Get property details
      let property = claim.property;
      if (!property && claim.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(claim.propertyId);
      }

      const propertyName = property?.name || 'Property';

      // Find all admin/superuser users
      const admins = await User.findAll({
        where: {
          role: ['admin', 'superuser', 'operation_head']
        }
      });

      // Create in-app notification for each admin
      for (const admin of admins) {
        try {
          const notification = await this.baseService.createNotification({
            userId: admin.id,
            type: NOTIFICATION_TYPES.PROPERTY_CLAIM_SUBMITTED,
            title: 'New Property Claim',
            message: `New property claim submitted for "${propertyName}" by ${claim.claimantName}`,
            priority: 'high',
            channels: ['in_app'],
            metadata: {
              claimId: claim.id,
              propertyId: claim.propertyId,
              propertyName,
              claimantName: claim.claimantName,
              claimantEmail: claim.claimantEmail,
              submittedAt: new Date().toISOString()
            }
          });

          await notification.updateDeliveryStatus('in_app', 'sent');
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          notifications.push({
            channel: 'in_app',
            recipient: admin.id,
            success: true,
            notificationId: notification.id
          });
        } catch (error) {
          errors.push({
            channel: 'in_app',
            recipient: admin.id,
            error: error.message
          });
        }
      }

      // Send email to operations team
      const operationsEmail = process.env.OPERATIONS_EMAIL || 'operations@goroomz.com';
      try {
        const emailContent = {
          subject: `New Property Claim - ${propertyName}`,
          body: `
            <h2>New Property Claim Submitted</h2>
            <p>A new property claim has been submitted and requires review.</p>
            
            <h3>Claim Details:</h3>
            <ul>
              <li><strong>Property:</strong> ${propertyName}</li>
              <li><strong>Claimant:</strong> ${claim.claimantName}</li>
              <li><strong>Email:</strong> ${claim.claimantEmail}</li>
              <li><strong>Phone:</strong> ${claim.claimantPhone || 'N/A'}</li>
            </ul>
            
            <p><a href="${process.env.INTERNAL_DASHBOARD_URL || 'http://localhost:3001'}/property-claims/${claim.id}">Review Claim</a></p>
          `,
          priority: 'high'
        };

        await this.baseService.sendEmailNotification(emailContent, { email: operationsEmail });
        notifications.push({
          channel: 'email',
          recipient: operationsEmail,
          success: true
        });
      } catch (error) {
        errors.push({
          channel: 'email',
          recipient: operationsEmail,
          error: error.message
        });
      }

      return {
        success: notifications.some(n => n.success),
        notifications,
        errors,
        adminCount: admins.length
      };
    } catch (error) {
      console.error('Error sending property claim submitted notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a property claim is approved
   * Sends email and SMS to claimant
   * Requirements: 1.3
   */
  async sendPropertyClaimApprovedNotification(claim) {
    const notifications = [];
    const errors = [];

    try {
      let property = claim.property;
      if (!property && claim.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(claim.propertyId);
      }

      const propertyName = property?.name || 'the property';

      // Create notification record if claimant has user account
      let notification;
      if (claim.claimantUserId) {
        notification = await this.baseService.createNotification({
          userId: claim.claimantUserId,
          type: NOTIFICATION_TYPES.PROPERTY_CLAIM_APPROVED,
          title: 'Property Claim Approved',
          message: `Your claim for "${propertyName}" has been approved! You can now manage your property.`,
          priority: 'medium',
          channels: ['email', 'sms'],
          metadata: {
            claimId: claim.id,
            propertyId: claim.propertyId,
            propertyName,
            approvedAt: new Date().toISOString()
          }
        });
      }

      // Send email
      if (claim.claimantEmail) {
        try {
          const emailContent = {
            subject: `Property Claim Approved - ${propertyName}`,
            body: `
              <h2>Congratulations! Your Property Claim is Approved</h2>
              <p>Dear ${claim.claimantName},</p>
              
              <p>We're pleased to inform you that your claim for <strong>${propertyName}</strong> has been approved.</p>
              
              <h3>Next Steps:</h3>
              <ol>
                <li>Log in to your dashboard to manage your property</li>
                <li>Complete your property profile</li>
                <li>Set up room types and pricing</li>
                <li>Start accepting bookings</li>
              </ol>
              
              <p><a href="${process.env.INTERNAL_DASHBOARD_URL || 'http://localhost:3001'}/properties/${claim.propertyId}">Manage Your Property</a></p>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: claim.claimantEmail });
          notifications.push({ channel: 'email', recipient: claim.claimantEmail, success: true });
          if (notification) await notification.updateDeliveryStatus('email', 'sent');
        } catch (error) {
          errors.push({ channel: 'email', error: error.message });
          if (notification) await notification.updateDeliveryStatus('email', 'failed', error.message);
        }
      }

      // Send SMS
      if (claim.claimantPhone) {
        try {
          const smsContent = {
            smsText: `Your property claim for ${propertyName} is approved! Log in to manage your property. -GoRoomz`
          };

          await this.baseService.sendSMSNotification(smsContent, { phone: claim.claimantPhone });
          notifications.push({ channel: 'sms', recipient: claim.claimantPhone, success: true });
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
        notificationId: notification?.id
      };
    } catch (error) {
      console.error('Error sending property claim approved notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a property claim is rejected
   * Sends email to claimant with rejection reason
   * Requirements: 1.4
   */
  async sendPropertyClaimRejectedNotification(claim, reason) {
    const notifications = [];
    const errors = [];

    try {
      let property = claim.property;
      if (!property && claim.propertyId) {
        const { Property } = require('../../models');
        property = await Property.findByPk(claim.propertyId);
      }

      const propertyName = property?.name || 'the property';
      const rejectionReason = reason || claim.rejectionReason || 'No specific reason provided';

      let notification;
      if (claim.claimantUserId) {
        notification = await this.baseService.createNotification({
          userId: claim.claimantUserId,
          type: NOTIFICATION_TYPES.PROPERTY_CLAIM_REJECTED,
          title: 'Property Claim Update',
          message: `Your claim for "${propertyName}" could not be approved. Reason: ${rejectionReason}`,
          priority: 'medium',
          channels: ['email'],
          metadata: {
            claimId: claim.id,
            propertyId: claim.propertyId,
            propertyName,
            rejectionReason,
            rejectedAt: new Date().toISOString()
          }
        });
      }

      if (claim.claimantEmail) {
        try {
          const emailContent = {
            subject: `Property Claim Update - ${propertyName}`,
            body: `
              <h2>Property Claim Update</h2>
              <p>Dear ${claim.claimantName},</p>
              
              <p>After careful review, we were unable to approve your claim for <strong>${propertyName}</strong>.</p>
              
              <h3>Reason:</h3>
              <p style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #e74c3c;">
                ${rejectionReason}
              </p>
              
              <h3>What You Can Do:</h3>
              <ul>
                <li>Provide additional documentation and submit a new claim</li>
                <li>Contact support if you believe this was an error</li>
              </ul>
              
              <p>Best regards,<br>GoRoomz Team</p>
            `,
            priority: 'medium'
          };

          await this.baseService.sendEmailNotification(emailContent, { email: claim.claimantEmail });
          notifications.push({ channel: 'email', recipient: claim.claimantEmail, success: true });
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
        rejectionReason
      };
    } catch (error) {
      console.error('Error sending property claim rejected notification:', error);
      throw error;
    }
  }
}

module.exports = PropertyClaimNotifications;
