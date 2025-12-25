/**
 * Script to fix payment_schedules table status column issue
 */

const { sequelize } = require('../config/database');
const migration = require('../migrations/fix-payment-schedule-status');

async function fixPaymentScheduleStatus() {
  try {
    console.log('🔧 Starting payment_schedules status column fix...\n');
    
    // Run the migration
    await migration.up(sequelize.getQueryInterface());
    
    console.log('\n✅ Payment schedule status column fixed successfully!');
    console.log('You can now restart the server.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to fix payment schedule status column:', error);
    process.exit(1);
  }
}

fixPaymentScheduleStatus();
