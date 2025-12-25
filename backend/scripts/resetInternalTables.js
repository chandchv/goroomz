require('dotenv').config();
const { sequelize } = require('../config/database');

async function resetInternalTables() {
  try {
    console.log('🔄 Dropping internal management tables...');
    
    const tables = [
      'api_key_usages',
      'api_keys',
      'billing_histories',
      'discounts',
      'subscriptions',
      'alerts',
      'notifications',
      'announcements',
      'audit_logs',
      'property_documents',
      'ticket_responses',
      'support_tickets',
      'agent_targets',
      'territories',
      'commissions',
      'lead_communications',
      'leads',
      'internal_roles'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Table ${table} might not exist`);
      }
    }
    
    console.log('\n✅ All internal management tables dropped successfully!');
    console.log('💡 Now restart your server to recreate them with proper schema.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetInternalTables();
