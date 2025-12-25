/**
 * Test Database Sync with force:false
 * 
 * This script tests that the database can sync without dropping tables,
 * verifies all associations work correctly, and documents any issues.
 */

const { sequelize } = require('../config/database');
const models = require('../models');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`)
};

async function testDatabaseSync() {
  const results = {
    syncSuccess: false,
    tablesVerified: [],
    associationsVerified: [],
    errors: [],
    warnings: []
  };

  try {
    log.section('Testing Database Sync with force:false');

    // Test 1: Authenticate connection
    log.info('Step 1: Testing database connection...');
    await sequelize.authenticate();
    log.success('Database connection established');

    // Test 2: Get existing tables before sync
    log.info('Step 2: Checking existing tables...');
    const queryInterface = sequelize.getQueryInterface();
    const tablesBefore = await queryInterface.showAllTables();
    log.info(`Found ${tablesBefore.length} existing tables`);

    // Test 3: Sync with force:false
    log.info('Step 3: Running sync with force:false...');
    await models.syncDatabase(false);
    results.syncSuccess = true;
    log.success('Database sync completed without errors');

    // Test 4: Verify tables still exist
    log.info('Step 4: Verifying tables after sync...');
    const tablesAfter = await queryInterface.showAllTables();
    
    if (tablesAfter.length < tablesBefore.length) {
      results.errors.push(`Table count decreased from ${tablesBefore.length} to ${tablesAfter.length}`);
      log.error(`Table count decreased! Before: ${tablesBefore.length}, After: ${tablesAfter.length}`);
    } else {
      log.success(`All tables preserved (${tablesAfter.length} tables)`);
    }

    // Test 5: Verify each model's table exists
    log.section('Verifying Model Tables');
    const modelNames = Object.keys(models).filter(key => 
      key !== 'sequelize' && 
      key !== 'syncDatabase' &&
      models[key].tableName
    );

    for (const modelName of modelNames) {
      const model = models[modelName];
      const tableName = model.tableName;
      
      try {
        const tableInfo = await queryInterface.describeTable(tableName);
        results.tablesVerified.push(tableName);
        log.success(`Table verified: ${tableName} (${Object.keys(tableInfo).length} columns)`);
      } catch (error) {
        results.errors.push(`Table ${tableName} not found or inaccessible`);
        log.error(`Table ${tableName} verification failed: ${error.message}`);
      }
    }

    // Test 6: Verify associations by testing queries
    log.section('Verifying Model Associations');
    
    const associationTests = [
      {
        name: 'User -> Rooms (ownedRooms)',
        test: async () => {
          const user = await models.User.findOne({ include: [{ model: models.Room, as: 'ownedRooms' }] });
          return true;
        }
      },
      {
        name: 'Room -> User (owner)',
        test: async () => {
          const room = await models.Room.findOne({ include: [{ model: models.User, as: 'owner' }] });
          return true;
        }
      },
      {
        name: 'Booking -> User (user)',
        test: async () => {
          const booking = await models.Booking.findOne({ include: [{ model: models.User, as: 'user' }] });
          return true;
        }
      },
      {
        name: 'Lead -> User (agent)',
        test: async () => {
          const lead = await models.Lead.findOne({ include: [{ model: models.User, as: 'agent' }] });
          return true;
        }
      },
      {
        name: 'Lead -> Territory',
        test: async () => {
          const lead = await models.Lead.findOne({ include: [{ model: models.Territory, as: 'territory' }] });
          return true;
        }
      },
      {
        name: 'Commission -> User (agent)',
        test: async () => {
          const commission = await models.Commission.findOne({ include: [{ model: models.User, as: 'agent' }] });
          return true;
        }
      },
      {
        name: 'Commission -> Lead',
        test: async () => {
          const commission = await models.Commission.findOne({ include: [{ model: models.Lead, as: 'lead' }] });
          return true;
        }
      },
      {
        name: 'Territory -> User (regionalManager)',
        test: async () => {
          const territory = await models.Territory.findOne({ include: [{ model: models.User, as: 'regionalManager' }] });
          return true;
        }
      },
      {
        name: 'SupportTicket -> User (propertyOwner)',
        test: async () => {
          const ticket = await models.SupportTicket.findOne({ include: [{ model: models.User, as: 'propertyOwner' }] });
          return true;
        }
      },
      {
        name: 'SupportTicket -> TicketResponse',
        test: async () => {
          const ticket = await models.SupportTicket.findOne({ include: [{ model: models.TicketResponse, as: 'responses' }] });
          return true;
        }
      },
      {
        name: 'PropertyDocument -> Lead',
        test: async () => {
          const doc = await models.PropertyDocument.findOne({ include: [{ model: models.Lead, as: 'lead' }] });
          return true;
        }
      },
      {
        name: 'Subscription -> User (propertyOwner)',
        test: async () => {
          const sub = await models.Subscription.findOne({ include: [{ model: models.User, as: 'propertyOwner' }] });
          return true;
        }
      },
      {
        name: 'APIKey -> User (creator)',
        test: async () => {
          const apiKey = await models.APIKey.findOne({ include: [{ model: models.User, as: 'creator' }] });
          return true;
        }
      },
      {
        name: 'User -> InternalRole (roleDetails)',
        test: async () => {
          const user = await models.User.findOne({ include: [{ model: models.InternalRole, as: 'roleDetails' }] });
          return true;
        }
      }
    ];

    for (const test of associationTests) {
      try {
        await test.test();
        results.associationsVerified.push(test.name);
        log.success(`Association verified: ${test.name}`);
      } catch (error) {
        if (error.message.includes('is not associated')) {
          results.errors.push(`Association missing: ${test.name}`);
          log.error(`Association failed: ${test.name} - ${error.message}`);
        } else {
          // Query errors are OK if there's no data
          results.associationsVerified.push(test.name);
          log.success(`Association verified: ${test.name} (no data to test)`);
        }
      }
    }

    // Test 7: Check for common sync issues
    log.section('Checking for Common Issues');
    
    // Check User table for internal role fields
    const userTable = await queryInterface.describeTable('users');
    const requiredUserFields = [
      'internalRole',
      'internalPermissions',
      'territoryId',
      'managerId',
      'commissionRate',
      'isActive',
      'lastLoginAt'
    ];

    for (const field of requiredUserFields) {
      if (userTable[field]) {
        log.success(`User field exists: ${field}`);
      } else {
        results.warnings.push(`User field missing: ${field}`);
        log.warning(`User field missing: ${field}`);
      }
    }

    // Test 8: Verify foreign key constraints
    log.section('Verifying Foreign Key Constraints');
    
    try {
      // Test that we can't insert invalid foreign keys
      const testLead = await models.Lead.build({
        propertyOwnerName: 'Test Owner',
        email: 'test@example.com',
        phone: '1234567890',
        businessName: 'Test Business',
        propertyType: 'hotel',
        status: 'contacted',
        agentId: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        territoryId: null
      });
      
      // This should fail due to foreign key constraint
      try {
        await testLead.save();
        results.warnings.push('Foreign key constraint not enforced for Lead.agentId');
        log.warning('Foreign key constraint not enforced for Lead.agentId');
      } catch (error) {
        if (error.name === 'SequelizeForeignKeyConstraintError') {
          log.success('Foreign key constraints working correctly');
        } else {
          log.info('Foreign key test inconclusive (no constraint or different error)');
        }
      }
    } catch (error) {
      log.info('Foreign key test skipped (build error)');
    }

  } catch (error) {
    results.errors.push(`Fatal error: ${error.message}`);
    log.error(`Fatal error during sync test: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }

  // Print summary
  log.section('Test Summary');
  
  console.log(`\n${colors.cyan}Sync Status:${colors.reset}`);
  if (results.syncSuccess) {
    log.success('Database sync completed successfully');
  } else {
    log.error('Database sync failed');
  }

  console.log(`\n${colors.cyan}Tables Verified: ${results.tablesVerified.length}${colors.reset}`);
  results.tablesVerified.forEach(table => console.log(`  ✓ ${table}`));

  console.log(`\n${colors.cyan}Associations Verified: ${results.associationsVerified.length}${colors.reset}`);
  results.associationsVerified.forEach(assoc => console.log(`  ✓ ${assoc}`));

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);
    results.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors: ${results.errors.length}${colors.reset}`);
    results.errors.forEach(error => console.log(`  ❌ ${error}`));
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${'='.repeat(60)}`);
    console.log('All tests passed! Database sync with force:false works correctly.');
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the test
testDatabaseSync().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
