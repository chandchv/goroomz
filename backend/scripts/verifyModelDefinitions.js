/**
 * Verify Model Definitions and Associations
 * 
 * This script verifies that all models are properly defined and
 * associations are correctly configured WITHOUT requiring a database connection.
 */

const fs = require('fs');
const path = require('path');

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

function verifyModelDefinitions() {
  const results = {
    modelsFound: [],
    associationsFound: [],
    issues: [],
    warnings: []
  };

  log.section('Verifying Model Definitions');

  // Check models directory
  const modelsDir = path.join(__dirname, '..', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    log.error('Models directory not found!');
    return results;
  }

  // Get all model files
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.js') && file !== 'index.js');

  log.info(`Found ${modelFiles.length} model files`);

  // Expected models based on the spec
  const expectedModels = [
    'User.js',
    'Room.js',
    'RoomType.js',
    'Booking.js',
    'Category.js',
    'RoomStatus.js',
    'BedAssignment.js',
    'Payment.js',
    'PaymentSchedule.js',
    'SecurityDeposit.js',
    'MaintenanceRequest.js',
    'HousekeepingLog.js',
    'RoomCategory.js',
    // Internal User Role Management models
    'InternalRole.js',
    'Lead.js',
    'LeadCommunication.js',
    'Commission.js',
    'Territory.js',
    'AgentTarget.js',
    'SupportTicket.js',
    'TicketResponse.js',
    'PropertyDocument.js',
    'AuditLog.js',
    'Announcement.js',
    'Notification.js',
    'Alert.js',
    'Subscription.js',
    'Discount.js',
    'BillingHistory.js',
    'APIKey.js',
    'APIKeyUsage.js'
  ];

  // Check for missing models
  log.section('Checking for Missing Models');
  for (const expectedModel of expectedModels) {
    if (modelFiles.includes(expectedModel)) {
      results.modelsFound.push(expectedModel);
      log.success(`Model found: ${expectedModel}`);
    } else {
      results.issues.push(`Missing model: ${expectedModel}`);
      log.error(`Missing model: ${expectedModel}`);
    }
  }

  // Check for unexpected models
  for (const modelFile of modelFiles) {
    if (!expectedModels.includes(modelFile)) {
      results.warnings.push(`Unexpected model file: ${modelFile}`);
      log.warning(`Unexpected model file: ${modelFile}`);
    }
  }

  // Read and analyze index.js
  log.section('Analyzing models/index.js');
  const indexPath = path.join(modelsDir, 'index.js');
  
  if (!fs.existsSync(indexPath)) {
    results.issues.push('models/index.js not found!');
    log.error('models/index.js not found!');
    return results;
  }

  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Check for model imports
  log.info('Checking model imports...');
  for (const model of expectedModels) {
    const modelName = model.replace('.js', '');
    const importPattern = new RegExp(`require\\(['"]\\.\/${modelName}['"]\\)`, 'i');
    
    if (importPattern.test(indexContent)) {
      log.success(`Import found: ${modelName}`);
    } else {
      results.issues.push(`Missing import for ${modelName} in index.js`);
      log.error(`Missing import for ${modelName} in index.js`);
    }
  }

  // Check for syncDatabase function
  log.section('Checking Sync Configuration');
  if (indexContent.includes('syncDatabase')) {
    log.success('syncDatabase function found');
    
    if (indexContent.includes('force, alter: false')) {
      log.success('Sync configured with alter: false (safe for production)');
    } else {
      results.warnings.push('Sync configuration may not be production-safe');
      log.warning('Check sync configuration - should use alter: false');
    }
    
    if (indexContent.includes('ensureSchema')) {
      log.success('ensureSchema function found (handles missing columns)');
    } else {
      results.warnings.push('No ensureSchema function found');
      log.warning('Consider adding ensureSchema to handle missing columns');
    }
  } else {
    results.issues.push('syncDatabase function not found in index.js');
    log.error('syncDatabase function not found in index.js');
  }

  // Check for key associations
  log.section('Checking Key Associations');
  
  const keyAssociations = [
    { from: 'User', to: 'Room', type: 'hasMany', as: 'ownedRooms' },
    { from: 'Room', to: 'User', type: 'belongsTo', as: 'owner' },
    { from: 'User', to: 'Booking', type: 'hasMany', as: 'bookings' },
    { from: 'Booking', to: 'User', type: 'belongsTo', as: 'user' },
    { from: 'Lead', to: 'User', type: 'belongsTo', as: 'agent' },
    { from: 'User', to: 'Lead', type: 'hasMany', as: 'leads' },
    { from: 'Lead', to: 'Territory', type: 'belongsTo', as: 'territory' },
    { from: 'Territory', to: 'Lead', type: 'hasMany', as: 'leads' },
    { from: 'Commission', to: 'User', type: 'belongsTo', as: 'agent' },
    { from: 'Commission', to: 'Lead', type: 'belongsTo', as: 'lead' },
    { from: 'Territory', to: 'User', type: 'belongsTo', as: 'regionalManager' },
    { from: 'User', to: 'Territory', type: 'hasMany', as: 'managedTerritories' },
    { from: 'SupportTicket', to: 'User', type: 'belongsTo', as: 'propertyOwner' },
    { from: 'SupportTicket', to: 'TicketResponse', type: 'hasMany', as: 'responses' },
    { from: 'PropertyDocument', to: 'Lead', type: 'belongsTo', as: 'lead' },
    { from: 'User', to: 'InternalRole', type: 'belongsTo', as: 'roleDetails' },
    { from: 'Subscription', to: 'User', type: 'belongsTo', as: 'propertyOwner' },
    { from: 'APIKey', to: 'User', type: 'belongsTo', as: 'creator' }
  ];

  for (const assoc of keyAssociations) {
    // More flexible pattern that handles multiline and various formatting
    const pattern1 = new RegExp(
      `${assoc.from}\\.${assoc.type}\\([^)]*${assoc.to}[^)]*as:\\s*['"]${assoc.as}['"]`,
      'is'
    );
    const pattern2 = new RegExp(
      `${assoc.from}\\.${assoc.type}\\([^)]*as:\\s*['"]${assoc.as}['"][^)]*\\)`,
      'is'
    );
    
    if (pattern1.test(indexContent) || pattern2.test(indexContent)) {
      results.associationsFound.push(`${assoc.from} -> ${assoc.to} (${assoc.as})`);
      log.success(`Association found: ${assoc.from} -> ${assoc.to} (${assoc.as})`);
    } else {
      results.issues.push(`Missing association: ${assoc.from} -> ${assoc.to} (${assoc.as})`);
      log.error(`Missing association: ${assoc.from} -> ${assoc.to} (${assoc.as})`);
    }
  }

  // Check User model for internal role fields
  log.section('Checking User Model for Internal Role Fields');
  const userModelPath = path.join(modelsDir, 'User.js');
  
  if (fs.existsSync(userModelPath)) {
    const userContent = fs.readFileSync(userModelPath, 'utf8');
    
    const requiredFields = [
      'internalRole',
      'internalPermissions',
      'territoryId',
      'managerId',
      'commissionRate',
      'isActive',
      'lastLoginAt'
    ];

    for (const field of requiredFields) {
      if (userContent.includes(field)) {
        log.success(`User field defined: ${field}`);
      } else {
        results.issues.push(`User model missing field: ${field}`);
        log.error(`User model missing field: ${field}`);
      }
    }
  } else {
    results.issues.push('User.js model file not found');
    log.error('User.js model file not found');
  }

  // Print summary
  log.section('Verification Summary');
  
  console.log(`\n${colors.cyan}Models Found: ${results.modelsFound.length}/${expectedModels.length}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Associations Verified: ${results.associationsFound.length}/${keyAssociations.length}${colors.reset}`);

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);
    results.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }

  if (results.issues.length > 0) {
    console.log(`\n${colors.red}Issues Found: ${results.issues.length}${colors.reset}`);
    results.issues.forEach(issue => console.log(`  ❌ ${issue}`));
    
    console.log(`\n${colors.red}${'='.repeat(60)}`);
    console.log('Model verification failed! Please fix the issues above.');
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
    return false;
  } else {
    console.log(`\n${colors.green}${'='.repeat(60)}`);
    console.log('All model definitions verified successfully!');
    console.log('Models are properly configured for sync with force:false.');
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
    return true;
  }
}

// Run verification
const success = verifyModelDefinitions();
process.exit(success ? 0 : 1);
