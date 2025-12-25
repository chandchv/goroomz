/**
 * Reminder Scheduler Job
 * 
 * This job runs periodically to send reminders for:
 * - Leads not contacted within 24 hours of assignment
 * - Pending approvals older than 48 hours
 * - Upcoming target deadlines
 * - Expiring subscriptions
 * 
 * Reminders are sent via notifications
 */

const cron = require('node-cron');
const { Lead, User, Notification, AgentTarget, Subscription } = require('../models');
const { Op } = require('sequelize');

// Run every 30 minutes
const SCHEDULE = '*/30 * * * *';

async function checkUncontactedLeads() {
  console.log('Checking for uncontacted leads...');
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find leads created more than 24 hours ago with no communications
    const uncontactedLeads = await Lead.findAll({
      where: {
        status: 'contacted',
        createdAt: {
          [Op.lte]: twentyFourHoursAgo
        }
      },
      include: [{
        model: require('../models').LeadCommunication,
        as: 'communications',
        required: false
      }]
    });
    
    const leadsNeedingReminder = uncontactedLeads.filter(lead => 
      !lead.communications || lead.communications.length === 0
    );
    
    for (const lead of leadsNeedingReminder) {
      // Check if reminder already sent
      const existingReminder = await Notification.findOne({
        where: {
          userId: lead.agentId,
          type: 'reminder',
          'data.leadId': lead.id,
          'data.reminderType': 'uncontacted_lead',
          createdAt: {
            [Op.gte]: twentyFourHoursAgo
          }
        }
      });
      
      if (!existingReminder) {
        await Notification.create({
          userId: lead.agentId,
          type: 'reminder',
          title: 'Lead Follow-up Reminder',
          message: `Lead "${lead.propertyOwnerName}" has not been contacted in 24 hours`,
          data: {
            leadId: lead.id,
            reminderType: 'uncontacted_lead',
            propertyOwnerName: lead.propertyOwnerName
          },
          isRead: false
        });
      }
    }
    
    console.log(`Sent reminders for ${leadsNeedingReminder.length} uncontacted leads`);
  } catch (error) {
    console.error('Error checking uncontacted leads:', error);
  }
}

async function checkPendingApprovals() {
  console.log('Checking for pending approvals...');
  
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // Find leads pending approval for more than 48 hours
    const pendingLeads = await Lead.findAll({
      where: {
        status: 'pending_approval',
        updatedAt: {
          [Op.lte]: fortyEightHoursAgo
        }
      },
      include: [{
        model: User,
        as: 'agent',
        include: [{
          model: User,
          as: 'manager'
        }]
      }]
    });
    
    for (const lead of pendingLeads) {
      if (lead.agent && lead.agent.manager) {
        const existingReminder = await Notification.findOne({
          where: {
            userId: lead.agent.managerId,
            type: 'reminder',
            'data.leadId': lead.id,
            'data.reminderType': 'pending_approval',
            createdAt: {
              [Op.gte]: fortyEightHoursAgo
            }
          }
        });
        
        if (!existingReminder) {
          await Notification.create({
            userId: lead.agent.managerId,
            type: 'reminder',
            title: 'Approval Pending Reminder',
            message: `Lead "${lead.propertyOwnerName}" has been pending approval for 48 hours`,
            data: {
              leadId: lead.id,
              reminderType: 'pending_approval',
              propertyOwnerName: lead.propertyOwnerName,
              agentName: lead.agent.name
            },
            isRead: false
          });
        }
      }
    }
    
    console.log(`Sent reminders for ${pendingLeads.length} pending approvals`);
  } catch (error) {
    console.error('Error checking pending approvals:', error);
  }
}

async function checkTargetDeadlines() {
  console.log('Checking for upcoming target deadlines...');
  
  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Find targets ending in the next 3 days
    const upcomingTargets = await AgentTarget.findAll({
      where: {
        endDate: {
          [Op.between]: [now, threeDaysFromNow]
        }
      },
      include: [{
        model: User,
        as: 'agent'
      }]
    });
    
    for (const target of upcomingTargets) {
      const progressPercentage = (target.actualProperties / target.targetProperties) * 100;
      
      // Only send reminder if target is not met
      if (progressPercentage < 100) {
        const existingReminder = await Notification.findOne({
          where: {
            userId: target.agentId,
            type: 'reminder',
            'data.targetId': target.id,
            'data.reminderType': 'target_deadline',
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });
        
        if (!existingReminder) {
          const daysRemaining = Math.ceil((target.endDate - now) / (24 * 60 * 60 * 1000));
          
          await Notification.create({
            userId: target.agentId,
            type: 'reminder',
            title: 'Target Deadline Approaching',
            message: `Your ${target.period} target ends in ${daysRemaining} days. Current progress: ${progressPercentage.toFixed(1)}%`,
            data: {
              targetId: target.id,
              reminderType: 'target_deadline',
              daysRemaining,
              progressPercentage,
              targetProperties: target.targetProperties,
              actualProperties: target.actualProperties
            },
            isRead: false
          });
        }
      }
    }
    
    console.log(`Sent reminders for ${upcomingTargets.length} upcoming target deadlines`);
  } catch (error) {
    console.error('Error checking target deadlines:', error);
  }
}

async function checkExpiringSubscriptions() {
  console.log('Checking for expiring subscriptions...');
  
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Find subscriptions expiring in the next 7 days
    const expiringSubscriptions = await Subscription.findAll({
      where: {
        endDate: {
          [Op.between]: [now, sevenDaysFromNow]
        },
        status: 'active',
        autoRenew: false
      },
      include: [{
        model: User,
        as: 'propertyOwner'
      }]
    });
    
    for (const subscription of expiringSubscriptions) {
      // Notify property owner
      const existingReminder = await Notification.findOne({
        where: {
          userId: subscription.propertyOwnerId,
          type: 'reminder',
          'data.subscriptionId': subscription.id,
          'data.reminderType': 'subscription_expiring',
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      
      if (!existingReminder) {
        const daysRemaining = Math.ceil((subscription.endDate - now) / (24 * 60 * 60 * 1000));
        
        await Notification.create({
          userId: subscription.propertyOwnerId,
          type: 'reminder',
          title: 'Subscription Expiring Soon',
          message: `Your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`,
          data: {
            subscriptionId: subscription.id,
            reminderType: 'subscription_expiring',
            daysRemaining,
            plan: subscription.plan
          },
          isRead: false
        });
      }
      
      // Also notify platform admins
      const platformAdmins = await User.findAll({
        where: {
          internalRole: 'platform_admin',
          isActive: true
        }
      });
      
      for (const admin of platformAdmins) {
        await Notification.create({
          userId: admin.id,
          type: 'reminder',
          title: 'Subscription Renewal Needed',
          message: `Subscription for ${subscription.propertyOwner.name} expires in ${daysRemaining} days`,
          data: {
            subscriptionId: subscription.id,
            reminderType: 'subscription_expiring_admin',
            propertyOwnerId: subscription.propertyOwnerId,
            propertyOwnerName: subscription.propertyOwner.name
          },
          isRead: false
        });
      }
    }
    
    console.log(`Sent reminders for ${expiringSubscriptions.length} expiring subscriptions`);
  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
  }
}

async function runReminderChecks() {
  console.log('Starting reminder checks...');
  
  await checkUncontactedLeads();
  await checkPendingApprovals();
  await checkTargetDeadlines();
  await checkExpiringSubscriptions();
  
  console.log('Reminder checks completed');
}

// Schedule the job
cron.schedule(SCHEDULE, runReminderChecks);

console.log(`Reminder scheduler started. Running every 30 minutes.`);

// Run immediately on startup
runReminderChecks();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Reminder scheduler shutting down...');
  process.exit(0);
});
