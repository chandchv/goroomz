require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false
  }
);

async function nuclearCleanup() {
  try {
    console.log('🔥 Starting nuclear cleanup of internal management schema...\n');
    
    // First, drop all internal management tables
    const tablesToDrop = [
      'announcements', 'alerts', 'notifications', 'notification_rules',
      'audit_logs', 'support_tickets', 'ticket_responses', 'property_documents',
      'leads', 'lead_communications', 'commissions', 'commission_payments',
      'performance_targets', 'territories', 'territory_agents',
      'subscriptions', 'billing_histories', 'discounts', 'platform_configs',
      'api_keys', 'api_key_usages', 'internal_roles', 'internal_role_permissions'
    ];

    console.log('Dropping tables...');
    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`  ✓ ${table}`);
      } catch (err) {
        console.log(`  ✗ ${table}: ${err.message}`);
      }
    }

    // Get all ENUM types from the database
    console.log('\nFinding all ENUM types...');
    const [enums] = await sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typtype = 'e';
    `);

    console.log(`Found ${enums.length} ENUM types\n`);
    console.log('Dropping ENUM types...');
    for (const { typname } of enums) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${typname}" CASCADE;`);
        console.log(`  ✓ ${typname}`);
      } catch (err) {
        console.log(`  ✗ ${typname}: ${err.message}`);
      }
    }

    // Also drop composite types related to announcements
    console.log('\nDropping composite types...');
    const [compositeTypes] = await sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typtype = 'c'
      AND t.typname LIKE '%announcement%';
    `);

    for (const { typname } of compositeTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${typname}" CASCADE;`);
        console.log(`  ✓ ${typname}`);
      } catch (err) {
        console.log(`  ✗ ${typname}: ${err.message}`);
      }
    }

    console.log('\n✅ Nuclear cleanup completed successfully!');
    console.log('You can now restart the server to recreate all tables fresh.\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

nuclearCleanup();
