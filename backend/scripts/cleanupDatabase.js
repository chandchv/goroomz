require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: console.log
  }
);

async function cleanupDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Drop all internal management tables
    const tablesToDrop = [
      'announcements',
      'alerts',
      'notifications',
      'notification_rules',
      'audit_logs',
      'support_tickets',
      'ticket_responses',
      'property_documents',
      'leads',
      'lead_communications',
      'commissions',
      'commission_payments',
      'performance_targets',
      'territories',
      'territory_agents',
      'subscriptions',
      'billing_histories',
      'discounts',
      'platform_configs',
      'api_keys',
      'api_key_usages',
      'internal_roles',
      'internal_role_permissions'
    ];

    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (err) {
        console.log(`  Skipped ${table}: ${err.message}`);
      }
    }

    // Drop all ENUM types related to internal management
    const enumsToDrop = [
      'enum_announcements_delivery_method',
      'enum_announcements_target_audience',
      'enum_announcements_status',
      'enum_alerts_severity',
      'enum_alerts_status',
      'enum_notifications_type',
      'enum_notifications_status',
      'enum_audit_logs_action',
      'enum_audit_logs_severity',
      'enum_support_tickets_status',
      'enum_support_tickets_priority',
      'enum_support_tickets_category',
      'enum_ticket_responses_sender_type',
      'enum_property_documents_document_type',
      'enum_property_documents_status',
      'enum_leads_status',
      'enum_leads_source',
      'enum_leads_priority',
      'enum_lead_communications_type',
      'enum_commissions_status',
      'enum_commission_payments_payment_method',
      'enum_performance_targets_metric_type',
      'enum_subscriptions_plan_type',
      'enum_subscriptions_status',
      'enum_subscriptions_billing_cycle',
      'enum_billing_histories_status',
      'enum_platform_configs_config_type',
      'enum_api_keys_status'
    ];

    for (const enumType of enumsToDrop) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
        console.log(`✓ Dropped ENUM: ${enumType}`);
      } catch (err) {
        console.log(`  Skipped ${enumType}: ${err.message}`);
      }
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('You can now restart the server to recreate tables.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupDatabase();
