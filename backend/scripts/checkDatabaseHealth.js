/**
 * Database Health Check Script
 * 
 * This comprehensive script checks the health of the database by:
 * 1. Verifying all tables exist
 * 2. Checking all columns match model definitions
 * 3. Validating all foreign key constraints
 * 4. Detecting orphaned records (records with invalid foreign keys)
 * 5. Checking for data integrity issues
 * 
 * This script provides a complete health report of the database state.
 * 
 * USAGE:
 *   node backend/scripts/checkDatabaseHealth.js
 * 
 * PREREQUISITES:
 *   - PostgreSQL database must be running
 *   - Database credentials must be configured in backend/.env
 *   - All models must be properly defined in backend/models/
 * 
 * EXIT CODES:
 *   0 - Database is healthy (all checks passed)
 *   1 - Database has issues (one or more checks failed)
 * 
 * REQUIREMENTS:
 *   Validates: All data model requirements from internal-user-roles and internal-management-system specs
 */

const { sequelize } = require('../config/database');
const models = require('../models');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper functions for formatted output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(80));
  log(title, 'blue');
  console.log('-'.repeat(80));
}

/**
 * Get all model definitions
 */
function getAllModels() {
  return {
    // Core models
    User: models.User,
    Room: models.Room,
    RoomType: models.RoomType,
    Booking: models.Booking,
    Category: models.Category,
    
    // Internal Management System models
    RoomStatus: models.RoomStatus,
    BedAssignment: models.BedAssignment,
    Payment: models.Payment,
    PaymentSchedule: models.PaymentSchedule,
    SecurityDeposit: models.SecurityDeposit,
    MaintenanceRequest: models.MaintenanceRequest,
    HousekeepingLog: models.HousekeepingLog,
    RoomCategory: models.RoomCategory,
    
    // Internal User Role Management models
    InternalRole: models.InternalRole,
    Lead: models.Lead,
    LeadCommunication: models.LeadCommunication,
    Commission: models.Commission,
    Territory: models.Territory,
    AgentTarget: models.AgentTarget,
    SupportTicket: models.SupportTicket,
    TicketResponse: models.TicketResponse,
    PropertyDocument: models.PropertyDocument,
    AuditLog: models.AuditLog,
    Announcement: models.Announcement,
    Notification: models.Notification,
    Alert: models.Alert,
    
    // Subscription and Billing models
    Subscription: models.Subscription,
    Discount: models.Discount,
    BillingHistory: models.BillingHistory,
    
    // API Key models
    APIKey: models.APIKey,
    APIKeyUsage: models.APIKeyUsage
  };
}

/**
 * Check if all tables exist in the database
 */
async function checkTablesExist() {
  logSection('1. CHECKING TABLE EXISTENCE');
  
  const results = {
    totalModels: 0,
    existingTables: [],
    missingTables: [],
    success: true
  };
  
  const queryInterface = sequelize.getQueryInterface();
  const allModels = getAllModels();
  
  try {
    // Get all tables from database
    const dbTables = await queryInterface.showAllTables();
    log(`\nFound ${dbTables.length} tables in database`, 'blue');
    
    // Check each model
    for (const [modelName, model] of Object.entries(allModels)) {
      if (!model) {
        log(`⚠️  Model ${modelName} is not defined`, 'yellow');
        continue;
      }
      
      results.totalModels++;
      const tableName = model.tableName || model.getTableName();
      
      if (dbTables.includes(tableName)) {
        results.existingTables.push({ model: modelName, table: tableName });
        log(`✅ ${modelName} → ${tableName}`, 'green');
      } else {
        results.missingTables.push({ model: modelName, table: tableName });
        log(`❌ ${modelName} → ${tableName} (MISSING)`, 'red');
        results.success = false;
      }
    }
    
    // Summary
    logSubSection('Table Existence Summary');
    log(`Total models: ${results.totalModels}`, 'bright');
    log(`Existing tables: ${results.existingTables.length}`, 'green');
    log(`Missing tables: ${results.missingTables.length}`, results.missingTables.length > 0 ? 'red' : 'green');
    
    return results;
    
  } catch (error) {
    log(`\n❌ Error checking tables: ${error.message}`, 'red');
    results.success = false;
    return results;
  }
}

/**
 * Compare types between model and database
 */
function compareTypes(modelType, dbType) {
  const typeMap = {
    'STRING': ['character varying', 'varchar', 'text'],
    'TEXT': ['text'],
    'INTEGER': ['integer', 'int4'],
    'BIGINT': ['bigint', 'int8'],
    'FLOAT': ['real', 'float4'],
    'DOUBLE': ['double precision', 'float8'],
    'DECIMAL': ['numeric', 'decimal'],
    'DATE': ['timestamp with time zone', 'timestamptz', 'timestamp without time zone'],
    'DATEONLY': ['date'],
    'BOOLEAN': ['boolean', 'bool'],
    'UUID': ['uuid'],
    'JSONB': ['jsonb'],
    'JSON': ['json', 'jsonb'],
    'ARRAY': ['array', 'ARRAY'],
    'ENUM': ['user-defined', 'enum']
  };
  
  const normalizedDbType = dbType.toLowerCase();
  const compatibleTypes = typeMap[modelType] || [];
  
  return compatibleTypes.some(type => normalizedDbType.includes(type));
}

/**
 * Verify all columns match model definitions
 */
async function verifyColumns() {
  logSection('2. VERIFYING COLUMN DEFINITIONS');
  
  const results = {
    totalColumns: 0,
    matchingColumns: 0,
    missingColumns: [],
    typeMismatches: [],
    nullabilityMismatches: [],
    extraColumns: [],
    success: true
  };
  
  const queryInterface = sequelize.getQueryInterface();
  const allModels = getAllModels();
  
  try {
    for (const [modelName, model] of Object.entries(allModels)) {
      if (!model) continue;
      
      const tableName = model.tableName || model.getTableName();
      
      // Check if table exists first
      const tables = await queryInterface.showAllTables();
      if (!tables.includes(tableName)) {
        log(`\n⚠️  Skipping ${modelName} - table does not exist`, 'yellow');
        continue;
      }
      
      log(`\n📋 Checking ${modelName} (${tableName})`, 'magenta');
      
      // Get database columns
      const dbColumns = await queryInterface.describeTable(tableName);
      const modelAttributes = model.rawAttributes;
      
      // Check each model attribute
      for (const [columnName, attr] of Object.entries(modelAttributes)) {
        results.totalColumns++;
        
        if (!dbColumns[columnName]) {
          results.missingColumns.push({
            model: modelName,
            table: tableName,
            column: columnName,
            type: attr.type.constructor.name
          });
          log(`  ❌ Missing column: ${columnName} (${attr.type.constructor.name})`, 'red');
          results.success = false;
        } else {
          const dbColumn = dbColumns[columnName];
          const modelType = attr.type.constructor.name;
          
          // Check type compatibility
          if (!compareTypes(modelType, dbColumn.type)) {
            results.typeMismatches.push({
              model: modelName,
              table: tableName,
              column: columnName,
              modelType: modelType,
              dbType: dbColumn.type
            });
            log(`  ⚠️  Type mismatch: ${columnName} - Model: ${modelType}, DB: ${dbColumn.type}`, 'yellow');
          }
          
          // Check nullability
          const modelAllowNull = attr.allowNull !== false;
          if (modelAllowNull !== dbColumn.allowNull) {
            results.nullabilityMismatches.push({
              model: modelName,
              table: tableName,
              column: columnName,
              modelAllowNull: modelAllowNull,
              dbAllowNull: dbColumn.allowNull
            });
            log(`  ⚠️  Nullability: ${columnName} - Model: ${modelAllowNull}, DB: ${dbColumn.allowNull}`, 'yellow');
          }
          
          results.matchingColumns++;
          log(`  ✅ ${columnName}`, 'dim');
        }
      }
      
      // Check for extra columns in database
      for (const columnName of Object.keys(dbColumns)) {
        if (!modelAttributes[columnName]) {
          results.extraColumns.push({
            model: modelName,
            table: tableName,
            column: columnName
          });
          log(`  ℹ️  Extra column in DB: ${columnName}`, 'blue');
        }
      }
    }
    
    // Summary
    logSubSection('Column Verification Summary');
    log(`Total columns checked: ${results.totalColumns}`, 'bright');
    log(`Matching columns: ${results.matchingColumns}`, 'green');
    log(`Missing columns: ${results.missingColumns.length}`, results.missingColumns.length > 0 ? 'red' : 'green');
    log(`Type mismatches: ${results.typeMismatches.length}`, results.typeMismatches.length > 0 ? 'yellow' : 'green');
    log(`Nullability mismatches: ${results.nullabilityMismatches.length}`, results.nullabilityMismatches.length > 0 ? 'yellow' : 'green');
    log(`Extra columns: ${results.extraColumns.length}`, 'blue');
    
    return results;
    
  } catch (error) {
    log(`\n❌ Error verifying columns: ${error.message}`, 'red');
    console.error(error);
    results.success = false;
    return results;
  }
}

/**
 * Validate foreign key constraints
 */
async function validateForeignKeys() {
  logSection('3. VALIDATING FOREIGN KEY CONSTRAINTS');
  
  const results = {
    totalConstraints: 0,
    validConstraints: [],
    invalidConstraints: [],
    missingConstraints: [],
    success: true
  };
  
  try {
    // Define expected foreign key relationships
    const foreignKeyRelationships = [
      { table: 'rooms', column: 'owner_id', references: 'users', refColumn: 'id' },
      { table: 'rooms', column: 'category_owner_id', references: 'users', refColumn: 'id' },
      { table: 'rooms', column: 'approved_by', references: 'users', refColumn: 'id' },
      { table: 'bookings', column: 'user_id', references: 'users', refColumn: 'id' },
      { table: 'bookings', column: 'owner_id', references: 'users', refColumn: 'id' },
      { table: 'bookings', column: 'room_id', references: 'rooms', refColumn: 'id' },
      { table: 'bookings', column: 'checked_in_by', references: 'users', refColumn: 'id' },
      { table: 'bookings', column: 'checked_out_by', references: 'users', refColumn: 'id' },
      { table: 'payments', column: 'booking_id', references: 'bookings', refColumn: 'id' },
      { table: 'payment_schedules', column: 'booking_id', references: 'bookings', refColumn: 'id' },
      { table: 'security_deposits', column: 'booking_id', references: 'bookings', refColumn: 'id' },
      { table: 'bed_assignments', column: 'room_id', references: 'rooms', refColumn: 'id' },
      { table: 'bed_assignments', column: 'booking_id', references: 'bookings', refColumn: 'id' },
      { table: 'maintenance_requests', column: 'room_id', references: 'rooms', refColumn: 'id' },
      { table: 'maintenance_requests', column: 'reported_by', references: 'users', refColumn: 'id' },
      { table: 'maintenance_requests', column: 'assigned_to', references: 'users', refColumn: 'id' },
      { table: 'housekeeping_logs', column: 'room_id', references: 'rooms', refColumn: 'id' },
      { table: 'housekeeping_logs', column: 'staff_id', references: 'users', refColumn: 'id' },
      
      // Internal User Role Management foreign keys
      { table: 'users', column: 'territory_id', references: 'territories', refColumn: 'id' },
      { table: 'users', column: 'manager_id', references: 'users', refColumn: 'id' },
      { table: 'leads', column: 'agent_id', references: 'users', refColumn: 'id' },
      { table: 'leads', column: 'territory_id', references: 'territories', refColumn: 'id' },
      { table: 'leads', column: 'approved_by', references: 'users', refColumn: 'id' },
      { table: 'lead_communications', column: 'lead_id', references: 'leads', refColumn: 'id' },
      { table: 'lead_communications', column: 'user_id', references: 'users', refColumn: 'id' },
      { table: 'commissions', column: 'agent_id', references: 'users', refColumn: 'id' },
      { table: 'commissions', column: 'lead_id', references: 'leads', refColumn: 'id' },
      { table: 'territories', column: 'regional_manager_id', references: 'users', refColumn: 'id' },
      { table: 'agent_targets', column: 'agent_id', references: 'users', refColumn: 'id' },
      { table: 'agent_targets', column: 'territory_id', references: 'territories', refColumn: 'id' },
      { table: 'agent_targets', column: 'set_by', references: 'users', refColumn: 'id' },
      { table: 'support_tickets', column: 'property_owner_id', references: 'users', refColumn: 'id' },
      { table: 'support_tickets', column: 'assigned_to', references: 'users', refColumn: 'id' },
      { table: 'support_tickets', column: 'created_by', references: 'users', refColumn: 'id' },
      { table: 'support_tickets', column: 'resolved_by', references: 'users', refColumn: 'id' },
      { table: 'ticket_responses', column: 'ticket_id', references: 'support_tickets', refColumn: 'id' },
      { table: 'ticket_responses', column: 'user_id', references: 'users', refColumn: 'id' },
      { table: 'property_documents', column: 'lead_id', references: 'leads', refColumn: 'id' },
      { table: 'property_documents', column: 'property_owner_id', references: 'users', refColumn: 'id' },
      { table: 'property_documents', column: 'uploaded_by', references: 'users', refColumn: 'id' },
      { table: 'property_documents', column: 'reviewed_by', references: 'users', refColumn: 'id' },
      { table: 'audit_logs', column: 'user_id', references: 'users', refColumn: 'id' },
      { table: 'announcements', column: 'created_by', references: 'users', refColumn: 'id' },
      { table: 'notifications', column: 'user_id', references: 'users', refColumn: 'id' },
      { table: 'alerts', column: 'created_for', references: 'users', refColumn: 'id' },
      { table: 'subscriptions', column: 'property_owner_id', references: 'users', refColumn: 'id' },
      { table: 'discounts', column: 'property_owner_id', references: 'users', refColumn: 'id' },
      { table: 'billing_histories', column: 'subscription_id', references: 'subscriptions', refColumn: 'id' },
      { table: 'api_keys', column: 'created_by', references: 'users', refColumn: 'id' },
      { table: 'api_key_usages', column: 'api_key_id', references: 'api_keys', refColumn: 'id' }
    ];
    
    log(`\nChecking ${foreignKeyRelationships.length} foreign key relationships...`, 'blue');
    
    // Query to get all foreign key constraints from database
    const [constraints] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    
    log(`Found ${constraints.length} foreign key constraints in database\n`, 'blue');
    
    // Check each expected relationship
    for (const fk of foreignKeyRelationships) {
      results.totalConstraints++;
      
      const exists = constraints.some(c => 
        c.table_name === fk.table &&
        c.column_name === fk.column &&
        c.foreign_table_name === fk.references &&
        c.foreign_column_name === fk.refColumn
      );
      
      if (exists) {
        results.validConstraints.push(fk);
        log(`✅ ${fk.table}.${fk.column} → ${fk.references}.${fk.refColumn}`, 'green');
      } else {
        results.missingConstraints.push(fk);
        log(`❌ ${fk.table}.${fk.column} → ${fk.references}.${fk.refColumn} (MISSING)`, 'red');
        results.success = false;
      }
    }
    
    // Summary
    logSubSection('Foreign Key Validation Summary');
    log(`Total constraints checked: ${results.totalConstraints}`, 'bright');
    log(`Valid constraints: ${results.validConstraints.length}`, 'green');
    log(`Missing constraints: ${results.missingConstraints.length}`, results.missingConstraints.length > 0 ? 'red' : 'green');
    
    return results;
    
  } catch (error) {
    log(`\n❌ Error validating foreign keys: ${error.message}`, 'red');
    console.error(error);
    results.success = false;
    return results;
  }
}

/**
 * Check for orphaned records
 */
async function checkOrphanedRecords() {
  logSection('4. CHECKING FOR ORPHANED RECORDS');
  
  const results = {
    totalChecks: 0,
    orphanedRecords: [],
    success: true
  };
  
  try {
    // Define critical foreign key relationships to check for orphans
    const orphanChecks = [
      { table: 'bookings', column: 'user_id', refTable: 'users', description: 'Bookings with invalid user' },
      { table: 'bookings', column: 'room_id', refTable: 'rooms', description: 'Bookings with invalid room' },
      { table: 'payments', column: 'booking_id', refTable: 'bookings', description: 'Payments with invalid booking' },
      { table: 'bed_assignments', column: 'booking_id', refTable: 'bookings', description: 'Bed assignments with invalid booking' },
      { table: 'leads', column: 'agent_id', refTable: 'users', description: 'Leads with invalid agent' },
      { table: 'commissions', column: 'agent_id', refTable: 'users', description: 'Commissions with invalid agent' },
      { table: 'commissions', column: 'lead_id', refTable: 'leads', description: 'Commissions with invalid lead' },
      { table: 'support_tickets', column: 'property_owner_id', refTable: 'users', description: 'Tickets with invalid owner' },
      { table: 'ticket_responses', column: 'ticket_id', refTable: 'support_tickets', description: 'Responses with invalid ticket' }
    ];
    
    log(`\nChecking ${orphanChecks.length} relationships for orphaned records...`, 'blue');
    
    for (const check of orphanChecks) {
      results.totalChecks++;
      
      try {
        // Check if tables exist
        const tables = await sequelize.getQueryInterface().showAllTables();
        if (!tables.includes(check.table) || !tables.includes(check.refTable)) {
          log(`⚠️  Skipping ${check.description} - table(s) do not exist`, 'yellow');
          continue;
        }
        
        // Query for orphaned records
        const [orphans] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM ${check.table}
          WHERE ${check.column} IS NOT NULL
            AND ${check.column} NOT IN (SELECT id FROM ${check.refTable})
        `);
        
        const orphanCount = parseInt(orphans[0].count);
        
        if (orphanCount > 0) {
          results.orphanedRecords.push({
            table: check.table,
            column: check.column,
            refTable: check.refTable,
            count: orphanCount,
            description: check.description
          });
          log(`❌ ${check.description}: ${orphanCount} orphaned record(s)`, 'red');
          results.success = false;
        } else {
          log(`✅ ${check.description}: No orphaned records`, 'green');
        }
      } catch (error) {
        log(`⚠️  Error checking ${check.description}: ${error.message}`, 'yellow');
      }
    }
    
    // Summary
    logSubSection('Orphaned Records Summary');
    log(`Total checks performed: ${results.totalChecks}`, 'bright');
    log(`Orphaned record issues: ${results.orphanedRecords.length}`, results.orphanedRecords.length > 0 ? 'red' : 'green');
    
    if (results.orphanedRecords.length > 0) {
      log('\nOrphaned records found:', 'red');
      results.orphanedRecords.forEach(orphan => {
        log(`  - ${orphan.table}.${orphan.column}: ${orphan.count} records`, 'red');
      });
    }
    
    return results;
    
  } catch (error) {
    log(`\n❌ Error checking orphaned records: ${error.message}`, 'red');
    console.error(error);
    results.success = false;
    return results;
  }
}

/**
 * Main health check function
 */
async function checkDatabaseHealth() {
  log('\n' + '█'.repeat(80), 'cyan');
  log('DATABASE HEALTH CHECK', 'bright');
  log('Comprehensive database validation and integrity check', 'cyan');
  log('█'.repeat(80) + '\n', 'cyan');
  
  const startTime = Date.now();
  const healthReport = {
    timestamp: new Date().toISOString(),
    tables: null,
    columns: null,
    foreignKeys: null,
    orphanedRecords: null,
    overallHealth: 'UNKNOWN'
  };
  
  try {
    // Test database connection
    log('Testing database connection...', 'blue');
    await sequelize.authenticate();
    log('✅ Database connection successful\n', 'green');
    
    // Run all health checks
    healthReport.tables = await checkTablesExist();
    healthReport.columns = await verifyColumns();
    healthReport.foreignKeys = await validateForeignKeys();
    healthReport.orphanedRecords = await checkOrphanedRecords();
    
    // Determine overall health
    const allChecksPass = 
      healthReport.tables.success &&
      healthReport.columns.success &&
      healthReport.foreignKeys.success &&
      healthReport.orphanedRecords.success;
    
    healthReport.overallHealth = allChecksPass ? 'HEALTHY' : 'ISSUES_FOUND';
    
    // Print final summary
    logSection('FINAL HEALTH REPORT');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\nHealth check completed in ${duration} seconds`, 'blue');
    log(`Timestamp: ${healthReport.timestamp}`, 'blue');
    
    console.log('\n' + '─'.repeat(80));
    log('Component Status:', 'bright');
    console.log('─'.repeat(80));
    
    log(`Tables:          ${healthReport.tables.success ? '✅ PASS' : '❌ FAIL'}`, healthReport.tables.success ? 'green' : 'red');
    log(`Columns:         ${healthReport.columns.success ? '✅ PASS' : '❌ FAIL'}`, healthReport.columns.success ? 'green' : 'red');
    log(`Foreign Keys:    ${healthReport.foreignKeys.success ? '✅ PASS' : '❌ FAIL'}`, healthReport.foreignKeys.success ? 'green' : 'red');
    log(`Orphaned Records: ${healthReport.orphanedRecords.success ? '✅ PASS' : '❌ FAIL'}`, healthReport.orphanedRecords.success ? 'green' : 'red');
    
    console.log('─'.repeat(80));
    
    if (allChecksPass) {
      log('\n🎉 DATABASE IS HEALTHY! 🎉', 'green');
      log('All checks passed. Database is in good condition.', 'green');
    } else {
      log('\n⚠️  DATABASE HAS ISSUES ⚠️', 'yellow');
      log('Some checks failed. Please review the details above.', 'yellow');
      
      // Provide actionable recommendations
      console.log('\n' + '─'.repeat(80));
      log('Recommendations:', 'bright');
      console.log('─'.repeat(80));
      
      if (!healthReport.tables.success) {
        log('\n📋 Missing Tables:', 'yellow');
        log('  Run migrations to create missing tables:', 'white');
        log('  npm run migrate', 'cyan');
      }
      
      if (!healthReport.columns.success) {
        log('\n📊 Column Issues:', 'yellow');
        log('  Run the fix-all-missing-columns migration:', 'white');
        log('  npx sequelize-cli db:migrate', 'cyan');
      }
      
      if (!healthReport.foreignKeys.success) {
        log('\n🔗 Foreign Key Issues:', 'yellow');
        log('  Review and add missing foreign key constraints', 'white');
        log('  Consider creating a migration to add constraints', 'white');
      }
      
      if (!healthReport.orphanedRecords.success) {
        log('\n🗑️  Orphaned Records:', 'yellow');
        log('  Clean up orphaned records before adding constraints:', 'white');
        log('  Review the orphaned records and delete or fix them', 'white');
      }
    }
    
    log('\n' + '█'.repeat(80) + '\n', 'cyan');
    
    return healthReport;
    
  } catch (error) {
    log(`\n❌ Health check failed: ${error.message}`, 'red');
    console.error(error);
    healthReport.overallHealth = 'ERROR';
    return healthReport;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run health check if called directly
if (require.main === module) {
  checkDatabaseHealth()
    .then((report) => {
      const exitCode = report.overallHealth === 'HEALTHY' ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseHealth };
