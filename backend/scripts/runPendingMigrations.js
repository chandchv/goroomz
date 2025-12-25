const { sequelize } = require('../config/database');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');

async function runPendingMigrations() {
  try {
    console.log('🔄 Checking for pending migrations...');

    const umzug = new Umzug({
      migrations: {
        glob: path.join(__dirname, '../migrations/*.js'),
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console,
    });

    // Get pending migrations
    const pending = await umzug.pending();
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pending.length} pending migrations:`);
    pending.forEach(m => console.log(`  - ${m.name}`));

    // Run migrations
    console.log('\n🚀 Running migrations...');
    await umzug.up();

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runPendingMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runPendingMigrations;
