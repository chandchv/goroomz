/**
 * Alert Scheduler Job
 * 
 * This job runs periodically to generate alerts for:
 * - Properties with zero occupancy for 7+ days
 * - Payment failures exceeding threshold
 * - High-priority support tickets
 * - System errors affecting multiple properties
 * 
 * Alerts are sent to Operations Managers
 */

const cron = require('node-cron');
const { Alert, Room, Booking, Payment, SupportTicket, User, Notification } = require('../models');
const { Op } = require('sequelize');

// Run every hour
const SCHEDULE = '0 * * * *';

async function checkZeroOccupancy() {
  console.log('Checking for zero occupancy properties...');
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find properties with no bookings in the last 7 days
    const rooms = await Room.findAll({
      include: [{
        model: Booking,
        as: 'bookings',
        where: {
          checkInDate: {
            [Op.gte]: sevenDaysAgo
          }
        },
        required: false
      }],
      group: ['Room.id', 'Room.ownerId']
    });
    
    const propertiesWithZeroOccupancy = rooms.filter(room => 
      !room.bookings || room.bookings.length === 0
    );
    
    for (const room of propertiesWithZeroOccupancy) {
      // Check if alert already exists
      const existingAlert = await Alert.findOne({
        where: {
          type: 'zero_occupancy',
          resourceType: 'property',
          resourceId: room.ownerId,
          status: 'active'
        }
      });
      
      if (!existingAlert) {
        await Alert.create({
          type: 'zero_occupancy',
          severity: 'medium',
          title: 'Zero Occupancy Alert',
          message: `Property has had zero occupancy for more than 7 days`,
          resourceType: 'property',
          resourceId: room.ownerId,
          status: 'active',
          metadata: {
            propertyId: room.ownerId,
            daysSinceLastBooking: 7
          }
        });
        
        // Notify operations managers
        await notifyOperationsManagers('zero_occupancy', room.ownerId);
      }
    }
    
    console.log(`Found ${propertiesWithZeroOccupancy.length} properties with zero occupancy`);
  } catch (error) {
    console.error('Error checking zero occupancy:', error);
  }
}

async function checkPaymentFailures() {
  console.log('Checking for payment failures...');
  
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find properties with multiple failed payments in last 24 hours
    const failedPayments = await Payment.findAll({
      where: {
        status: 'failed',
        createdAt: {
          [Op.gte]: oneDayAgo
        }
      },
      attributes: ['ownerId'],
      group: ['ownerId'],
      having: sequelize.literal('COUNT(*) >= 3')
    });
    
    for (const payment of failedPayments) {
      const existingAlert = await Alert.findOne({
        where: {
          type: 'payment_failure',
          resourceType: 'property',
          resourceId: payment.ownerId,
          status: 'active'
        }
      });
      
      if (!existingAlert) {
        await Alert.create({
          type: 'payment_failure',
          severity: 'high',
          title: 'Payment Failure Alert',
          message: `Multiple payment failures detected in the last 24 hours`,
          resourceType: 'property',
          resourceId: payment.ownerId,
          status: 'active',
          metadata: {
            propertyId: payment.ownerId
          }
        });
        
        await notifyOperationsManagers('payment_failure', payment.ownerId);
      }
    }
    
    console.log(`Found ${failedPayments.length} properties with payment failures`);
  } catch (error) {
    console.error('Error checking payment failures:', error);
  }
}

async function checkHighPriorityTickets() {
  console.log('Checking for high-priority tickets...');
  
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find urgent tickets created in last hour that are still new
    const urgentTickets = await SupportTicket.findAll({
      where: {
        priority: 'urgent',
        status: 'new',
        createdAt: {
          [Op.gte]: oneHourAgo
        }
      }
    });
    
    for (const ticket of urgentTickets) {
      const existingAlert = await Alert.findOne({
        where: {
          type: 'urgent_ticket',
          resourceType: 'ticket',
          resourceId: ticket.id,
          status: 'active'
        }
      });
      
      if (!existingAlert) {
        await Alert.create({
          type: 'urgent_ticket',
          severity: 'urgent',
          title: 'Urgent Support Ticket',
          message: `Urgent ticket #${ticket.ticketNumber} requires immediate attention`,
          resourceType: 'ticket',
          resourceId: ticket.id,
          status: 'active',
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            propertyOwnerId: ticket.propertyOwnerId
          }
        });
        
        await notifyOperationsManagers('urgent_ticket', ticket.id);
      }
    }
    
    console.log(`Found ${urgentTickets.length} urgent tickets`);
  } catch (error) {
    console.error('Error checking high-priority tickets:', error);
  }
}

async function notifyOperationsManagers(alertType, resourceId) {
  try {
    // Find all operations managers
    const operationsManagers = await User.findAll({
      where: {
        internalRole: 'operations_manager',
        isActive: true
      }
    });
    
    for (const manager of operationsManagers) {
      await Notification.create({
        userId: manager.id,
        type: 'alert',
        title: `New ${alertType.replace('_', ' ')} alert`,
        message: `A new alert has been generated that requires your attention`,
        data: {
          alertType,
          resourceId
        },
        isRead: false
      });
    }
  } catch (error) {
    console.error('Error notifying operations managers:', error);
  }
}

async function runAlertChecks() {
  console.log('Starting alert checks...');
  
  await checkZeroOccupancy();
  await checkPaymentFailures();
  await checkHighPriorityTickets();
  
  console.log('Alert checks completed');
}

// Schedule the job
cron.schedule(SCHEDULE, runAlertChecks);

console.log(`Alert scheduler started. Running every hour.`);

// Run immediately on startup
runAlertChecks();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Alert scheduler shutting down...');
  process.exit(0);
});
