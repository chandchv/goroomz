/**
 * Test script to verify checkDatabaseHealth.js structure
 * This tests the script without requiring a database connection
 */

const fs = require('fs');
const path = require('path');

console.log('Testing checkDatabaseHealth.js structure...\n');

// Read the script file
const scriptPath = path.join(__dirname, 'checkDatabaseHealth.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Test 1: Check if all required functions are defined
console.log('✓ Test 1: Checking function definitions...');
const requiredFunctions = [
  'getAllModels',
  'checkTablesExist',
  'compareTypes',
  'verifyColumns',
  'validateForeignKeys',
  'checkOrphanedRecords',
  'checkDatabaseHealth'
];

let allFunctionsFound = true;
requiredFunctions.forEach(funcName => {
  const pattern = new RegExp(`(async\\s+)?function\\s+${funcName}|const\\s+${funcName}\\s*=`);
  if (pattern.test(scriptContent)) {
    console.log(`  ✅ ${funcName} - Found`);
  } else {
    console.log(`  ❌ ${funcName} - Missing`);
    allFunctionsFound = false;
  }
});

// Test 2: Check if all model types are included
console.log('\n✓ Test 2: Checking model coverage...');
const requiredModels = [
  'User', 'Room', 'Booking', 'Category',
  'RoomStatus', 'BedAssignment', 'Payment', 'PaymentSchedule',
  'InternalRole', 'Lead', 'Commission', 'Territory',
  'SupportTicket', 'PropertyDocument', 'AuditLog',
  'Announcement', 'Notification', 'Alert',
  'Subscription', 'APIKey'
];

let allModelsFound = true;
requiredModels.forEach(modelName => {
  if (scriptContent.includes(`models.${modelName}`)) {
    console.log(`  ✅ ${modelName} - Referenced`);
  } else {
    console.log(`  ❌ ${modelName} - Not referenced`);
    allModelsFound = false;
  }
});

// Test 3: Check if foreign key relationships are defined
console.log('\n✓ Test 3: Checking foreign key relationship definitions...');
const criticalFKs = [
  'bookings.user_id',
  'bookings.room_id',
  'leads.agent_id',
  'commissions.agent_id',
  'support_tickets.property_owner_id',
  'territories.regional_manager_id'
];

let allFKsFound = true;
criticalFKs.forEach(fk => {
  const [table, column] = fk.split('.');
  const pattern = new RegExp(`table:\\s*['"]${table}['"].*column:\\s*['"]${column}['"]`, 's');
  if (pattern.test(scriptContent)) {
    console.log(`  ✅ ${fk} - Defined`);
  } else {
    console.log(`  ❌ ${fk} - Not defined`);
    allFKsFound = false;
  }
});

// Test 4: Check if orphan checks are defined
console.log('\n✓ Test 4: Checking orphaned record checks...');
const orphanChecks = [
  'Bookings with invalid user',
  'Leads with invalid agent',
  'Commissions with invalid agent',
  'Tickets with invalid owner'
];

let allOrphanChecksFound = true;
orphanChecks.forEach(check => {
  if (scriptContent.includes(check)) {
    console.log(`  ✅ ${check} - Defined`);
  } else {
    console.log(`  ❌ ${check} - Not defined`);
    allOrphanChecksFound = false;
  }
});

// Test 5: Check if the script exports the main function
console.log('\n✓ Test 5: Checking module exports...');
if (scriptContent.includes('module.exports') && scriptContent.includes('checkDatabaseHealth')) {
  console.log('  ✅ Module exports checkDatabaseHealth function');
} else {
  console.log('  ❌ Module does not export checkDatabaseHealth function');
}

// Test 6: Check if the script can be run directly
console.log('\n✓ Test 6: Checking direct execution support...');
if (scriptContent.includes('require.main === module')) {
  console.log('  ✅ Script supports direct execution');
} else {
  console.log('  ❌ Script does not support direct execution');
}

// Final summary
console.log('\n' + '='.repeat(80));
console.log('STRUCTURE TEST SUMMARY');
console.log('='.repeat(80));

const allTestsPassed = allFunctionsFound && allModelsFound && allFKsFound && allOrphanChecksFound;

if (allTestsPassed) {
  console.log('\n✅ All structure tests passed!');
  console.log('The checkDatabaseHealth.js script is properly structured.');
  console.log('\nTo run the actual health check (requires database):');
  console.log('  node backend/scripts/checkDatabaseHealth.js');
  process.exit(0);
} else {
  console.log('\n❌ Some structure tests failed.');
  console.log('Please review the script and fix the issues above.');
  process.exit(1);
}
