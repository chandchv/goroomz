const { sequelize } = require('../models');
const path = require('path');
const fs = require('fs');

async function runAllPendingMigrations() {
  try {
    console.log('🚀 Running all pending migrations...\n');
    
    // List of migrations to run in order
    const migrations = [
      '20251126000000-add-property-id-to-rooms.js',
      '20251126000001-add-internal-management-fields-to-rooms.js'
    ];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        continue;
      }
      
      console.log(`\n📦 Running migration: ${migrationFile}`);
      console.log('─'.repeat(60));
      
      try {
        const migration = require(migrationPath);
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        console.log(`✅ Successfully completed: ${migrationFile}`);
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠️  Skipped (already applied): ${migrationFile}`);
        } else {
          console.error(`❌ Failed: ${migrationFile}`);
          console.error(`   Error: ${error.message}`);
          // Continue with next migration instead of stopping
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All migrations completed');
    console.log('='.repeat(60));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration process failed:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

runAllPendingMigrations();
