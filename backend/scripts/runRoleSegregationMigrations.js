const { sequelize } = require('../config/database');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Master Script for Running Role Segregation Migrations
 * 
 * This script runs all migrations related to role segregation in the correct order:
 * 1. PropertyAssignment table creation
 * 2. assignedPropertyId column addition
 * 3. Performance indexes
 * 4. Data migration for existing users
 * 
 * Requirements: All (infrastructure)
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkMigrationStatus(migrationName) {
  try {
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM "SequelizeMeta" 
        WHERE name = '${migrationName}'
      );
    `);
    return results[0].exists;
  } catch (error) {
    // SequelizeMeta table might not exist yet
    return false;
  }
}

async function runMigration(migrationFile, description) {
  log(`\n▶️  ${description}...`, 'blue');
  
  const migrationName = path.basename(migrationFile);
  const isApplied = await checkMigrationStatus(migrationName);
  
  if (isApplied) {
    log(`   ✅ Already applied: ${migrationName}`, 'green');
    return true;
  }
  
  try {
    // Run the migration using sequelize-cli
    const { stdout, stderr } = await execAsync(
      `npx sequelize-cli db:migrate --migrations-path backend/migrations --to ${migrationName}`,
      { cwd: path.join(__dirname, '../..') }
    );
    
    if (stderr && !stderr.includes('Sequelize CLI')) {
      log(`   ⚠️  Warning: ${stderr}`, 'yellow');
    }
    
    log(`   ✅ Successfully applied: ${migrationName}`, 'green');
    return true;
  } catch (error) {
    log(`   ❌ Failed to apply: ${migrationName}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function runDataMigration() {
  log(`\n▶️  Running data migration for existing users...`, 'blue');
  
  try {
    const { migrateExistingUsers } = require('./migrateExistingUsersForRoleSegregation');
    await migrateExistingUsers();
    return true;
  } catch (error) {
    log(`   ❌ Data migration failed: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log(`\n▶️  Running validation tests...`, 'blue');
  
  try {
    const { runAllTests } = require('./testRoleSegregationMigration');
    await runAllTests();
    return true;
  } catch (error) {
    log(`   ❌ Tests failed: ${error.message}`, 'red');
    return false;
  }
}

async function createBackup() {
  log(`\n▶️  Creating database backup...`, 'blue');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(__dirname, '../backups', `pre_role_segregation_${timestamp}.sql`);
    
    const dbConfig = require('../config/database.config');
    const config = dbConfig[process.env.NODE_ENV || 'development'];
    
    const { stdout } = await execAsync(
      `pg_dump -h ${config.host} -U ${config.username} -d ${config.database} -f ${backupFile}`,
      { env: { ...process.env, PGPASSWORD: config.password } }
    );
    
    log(`   ✅ Backup created: ${backupFile}`, 'green');
    return true;
  } catch (error) {
    log(`   ⚠️  Backup failed (continuing anyway): ${error.message}`, 'yellow');
    return true; // Don't fail the whole process if backup fails
  }
}

async function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     ROLE SEGREGATION MIGRATION RUNNER                     ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Step 0: Create backup (optional but recommended)
    log('\n📦 Step 0: Database Backup', 'cyan');
    await createBackup();
    
    // Step 1: Run schema migrations
    log('\n📋 Step 1: Schema Migrations', 'cyan');
    
    const migrations = [
      {
        file: '20251123000000-create-property-assignments.js',
        description: 'Creating PropertyAssignment table'
      },
      {
        file: '20251124000000-add-assigned-property-id.js',
        description: 'Adding assignedPropertyId to User table'
      },
      {
        file: '20251125000000-add-performance-indexes.js',
        description: 'Adding performance indexes'
      }
    ];
    
    for (const migration of migrations) {
      const success = await runMigration(migration.file, migration.description);
      if (!success) {
        log('\n❌ Migration failed. Stopping execution.', 'red');
        process.exit(1);
      }
    }
    
    // Step 2: Run data migration
    log('\n📊 Step 2: Data Migration', 'cyan');
    const dataMigrationSuccess = await runDataMigration();
    
    if (!dataMigrationSuccess) {
      log('\n⚠️  Data migration had issues. Please review the output above.', 'yellow');
    }
    
    // Step 3: Run validation tests
    log('\n🧪 Step 3: Validation Tests', 'cyan');
    const testsSuccess = await runTests();
    
    // Final summary
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('  MIGRATION COMPLETE', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    
    if (testsSuccess) {
      log('\n✅ All migrations completed successfully!', 'green');
      log('\nThe role segregation system is now active. You can:', 'green');
      log('  • Use User model helper methods (isPropertyOwner, isPlatformStaff, etc.)', 'green');
      log('  • Apply data scoping middleware to routes', 'green');
      log('  • Create property assignments for agents and staff', 'green');
      log('  • Assign property staff to specific properties', 'green');
    } else {
      log('\n⚠️  Migrations completed with warnings. Please review the test results.', 'yellow');
    }
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ Migration runner failed: ${error.message}`, 'red');
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
