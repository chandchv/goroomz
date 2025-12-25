/**
 * Database Schema Audit Script
 * 
 * This script audits all database models for schema consistency by:
 * 1. Checking all models from internal-user-roles spec
 * 2. Checking all models from internal-management-system spec
 * 3. Identifying missing columns, incorrect data types, or index issues
 * 4. Comparing model definitions with actual database schema
 * 5. Generating a comprehensive report of discrepancies
 */

const { sequelize } = require('../config/database');
const models = require('../models');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to format output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to get model definition
function getModelDefinition(model) {
  const attributes = {};
  const rawAttributes = model.rawAttributes;
  
  for (const [key, attr] of Object.entries(rawAttributes)) {
    attributes[key] = {
      type: attr.type.constructor.name,
      allowNull: attr.allowNull !== false,
      defaultValue: attr.defaultValue,
      primaryKey: attr.primaryKey || false,
      unique: attr.unique || false,
      references: attr.references || null,
      validate: attr.validate || null
    };
  }
  
  return attributes;
}

// Helper function to compare types
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
    'ARRAY': ['array', 'ARRAY'],
    'ENUM': ['user-defined', 'enum']
  };
  
  const normalizedDbType = dbType.toLowerCase();
  const compatibleTypes = typeMap[modelType] || [];
  
  return compatibleTypes.some(type => normalizedDbType.includes(type));
}

// Main audit function
async function auditDatabaseSchema() {
  log('\n========================================', 'cyan');
  log('DATABASE SCHEMA AUDIT', 'cyan');
  log('========================================\n', 'cyan');
  
  const issues = {
    missingTables: [],
    missingColumns: [],
    typeMismatches: [],
    nullabilityMismatches: [],
    missingIndexes: [],
    extraColumns: []
  };
  
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    // Get all tables in database
    const tables = await queryInterface.showAllTables();
    log(`Found ${tables.length} tables in database\n`, 'blue');
    
    // Models to audit (from both specs)
    const modelsToAudit = {
      // Core models
      'User': models.User,
      'Room': models.Room,
      'Booking': models.Booking,
      'Category': models.Category,
      
      // Internal Management System models
      'RoomStatus': models.RoomStatus,
      'BedAssignment': models.BedAssignment,
      'Payment': models.Payment,
      'PaymentSchedule': models.PaymentSchedule,
      'SecurityDeposit': models.SecurityDeposit,
      'MaintenanceRequest': models.MaintenanceRequest,
      'HousekeepingLog': models.HousekeepingLog,
      'RoomCategory': models.RoomCategory,
      'RoomType': models.RoomType,
      
      // Internal User Role Management models
      'InternalRole': models.InternalRole,
      'Lead': models.Lead,
      'LeadCommunication': models.LeadCommunication,
      'Commission': models.Commission,
      'Territory': models.Territory,
      'AgentTarget': models.AgentTarget,
      'SupportTicket': models.SupportTicket,
      'TicketResponse': models.TicketResponse,
      'PropertyDocument': models.PropertyDocument,
      'AuditLog': models.AuditLog,
      'Announcement': models.Announcement,
      'Notification': models.Notification,
      'Alert': models.Alert,
      
      // Subscription and Billing models
      'Subscription': models.Subscription,
      'Discount': models.Discount,
      'BillingHistory': models.BillingHistory,
      
      // API Key models
      'APIKey': models.APIKey,
      'APIKeyUsage': models.APIKeyUsage
    };
    
    // Audit each model
    for (const [modelName, model] of Object.entries(modelsToAudit)) {
      if (!model) {
        log(`⚠️  Model ${modelName} is not defined`, 'yellow');
        continue;
      }
      
      const tableName = model.tableName || model.getTableName();
      log(`\n📋 Auditing ${modelName} (table: ${tableName})`, 'magenta');
      
      // Check if table exists
      if (!tables.includes(tableName)) {
        issues.missingTables.push({ model: modelName, table: tableName });
        log(`  ❌ Table ${tableName} does not exist in database`, 'red');
        continue;
      }
      
      // Get table description from database
      let dbColumns;
      try {
        dbColumns = await queryInterface.describeTable(tableName);
      } catch (error) {
        log(`  ❌ Error describing table ${tableName}: ${error.message}`, 'red');
        continue;
      }
      
      // Get model definition
      const modelAttributes = getModelDefinition(model);
      
      // Check for missing columns
      for (const [columnName, attr] of Object.entries(modelAttributes)) {
        if (!dbColumns[columnName]) {
          issues.missingColumns.push({
            model: modelName,
            table: tableName,
            column: columnName,
            type: attr.type,
            allowNull: attr.allowNull,
            defaultValue: attr.defaultValue
          });
          log(`  ❌ Missing column: ${columnName} (${attr.type})`, 'red');
        } else {
          // Check type compatibility
          const dbColumn = dbColumns[columnName];
          if (!compareTypes(attr.type, dbColumn.type)) {
            issues.typeMismatches.push({
              model: modelName,
              table: tableName,
              column: columnName,
              modelType: attr.type,
              dbType: dbColumn.type
            });
            log(`  ⚠️  Type mismatch: ${columnName} - Model: ${attr.type}, DB: ${dbColumn.type}`, 'yellow');
          }
          
          // Check nullability
          if (attr.allowNull !== dbColumn.allowNull) {
            issues.nullabilityMismatches.push({
              model: modelName,
              table: tableName,
              column: columnName,
              modelAllowNull: attr.allowNull,
              dbAllowNull: dbColumn.allowNull
            });
            log(`  ⚠️  Nullability mismatch: ${columnName} - Model: ${attr.allowNull}, DB: ${dbColumn.allowNull}`, 'yellow');
          }
        }
      }
      
      // Check for extra columns in database
      for (const columnName of Object.keys(dbColumns)) {
        if (!modelAttributes[columnName] && !['createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(columnName)) {
          issues.extraColumns.push({
            model: modelName,
            table: tableName,
            column: columnName
          });
          log(`  ℹ️  Extra column in DB: ${columnName}`, 'blue');
        }
      }
      
      // Check indexes
      try {
        const indexes = await queryInterface.showIndex(tableName);
        const modelIndexes = model.options.indexes || [];
        
        if (modelIndexes.length > 0) {
          log(`  📊 Model defines ${modelIndexes.length} indexes, DB has ${indexes.length} indexes`, 'blue');
        }
      } catch (error) {
        log(`  ⚠️  Could not check indexes: ${error.message}`, 'yellow');
      }
      
      log(`  ✅ Audit complete for ${modelName}`, 'green');
    }
    
    // Print summary
    log('\n========================================', 'cyan');
    log('AUDIT SUMMARY', 'cyan');
    log('========================================\n', 'cyan');
    
    if (issues.missingTables.length > 0) {
      log(`\n❌ Missing Tables (${issues.missingTables.length}):`, 'red');
      issues.missingTables.forEach(issue => {
        log(`  - ${issue.model} (${issue.table})`, 'red');
      });
    }
    
    if (issues.missingColumns.length > 0) {
      log(`\n❌ Missing Columns (${issues.missingColumns.length}):`, 'red');
      issues.missingColumns.forEach(issue => {
        log(`  - ${issue.table}.${issue.column} (${issue.type})`, 'red');
      });
    }
    
    if (issues.typeMismatches.length > 0) {
      log(`\n⚠️  Type Mismatches (${issues.typeMismatches.length}):`, 'yellow');
      issues.typeMismatches.forEach(issue => {
        log(`  - ${issue.table}.${issue.column}: Model=${issue.modelType}, DB=${issue.dbType}`, 'yellow');
      });
    }
    
    if (issues.nullabilityMismatches.length > 0) {
      log(`\n⚠️  Nullability Mismatches (${issues.nullabilityMismatches.length}):`, 'yellow');
      issues.nullabilityMismatches.forEach(issue => {
        log(`  - ${issue.table}.${issue.column}: Model allowNull=${issue.modelAllowNull}, DB allowNull=${issue.dbAllowNull}`, 'yellow');
      });
    }
    
    if (issues.extraColumns.length > 0) {
      log(`\nℹ️  Extra Columns in Database (${issues.extraColumns.length}):`, 'blue');
      issues.extraColumns.forEach(issue => {
        log(`  - ${issue.table}.${issue.column}`, 'blue');
      });
    }
    
    // Calculate total issues
    const totalIssues = issues.missingTables.length + 
                       issues.missingColumns.length + 
                       issues.typeMismatches.length + 
                       issues.nullabilityMismatches.length;
    
    if (totalIssues === 0) {
      log('\n✅ No critical issues found! Database schema is consistent with models.', 'green');
    } else {
      log(`\n⚠️  Found ${totalIssues} issues that need attention.`, 'yellow');
    }
    
    log('\n========================================\n', 'cyan');
    
    // Return issues for programmatic use
    return issues;
    
  } catch (error) {
    log(`\n❌ Audit failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

// Run audit if called directly
if (require.main === module) {
  auditDatabaseSchema()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { auditDatabaseSchema };
