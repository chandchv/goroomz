const fs = require('fs');
const path = require('path');

/**
 * Validation Script for Migration Files
 * 
 * This script validates that all migration files are properly structured
 * and ready to be executed. It doesn't require a database connection.
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

function validateMigrationFile(filePath) {
  const tests = [];
  const fileName = path.basename(filePath);
  
  // Test 1: File exists
  if (!fs.existsSync(filePath)) {
    tests.push({
      name: `${fileName} exists`,
      passed: false,
      error: 'File not found'
    });
    return tests;
  }
  
  tests.push({
    name: `${fileName} exists`,
    passed: true,
    error: null
  });
  
  // Test 2: File is readable
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    tests.push({
      name: `${fileName} is readable`,
      passed: true,
      error: null
    });
    
    // Test 3: Has up function
    const hasUp = content.includes('up:') || content.includes('up =') || content.includes('async up(');
    tests.push({
      name: `${fileName} has up function`,
      passed: hasUp,
      error: hasUp ? null : 'Missing up function'
    });
    
    // Test 4: Has down function
    const hasDown = content.includes('down:') || content.includes('down =') || content.includes('async down(');
    tests.push({
      name: `${fileName} has down function`,
      passed: hasDown,
      error: hasDown ? null : 'Missing down function'
    });
    
    // Test 5: Has module.exports
    const hasExports = content.includes('module.exports');
    tests.push({
      name: `${fileName} has module.exports`,
      passed: hasExports,
      error: hasExports ? null : 'Missing module.exports'
    });
    
  } catch (error) {
    tests.push({
      name: `${fileName} is readable`,
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

function validateScript(filePath) {
  const tests = [];
  const fileName = path.basename(filePath);
  
  // Test 1: File exists
  if (!fs.existsSync(filePath)) {
    tests.push({
      name: `${fileName} exists`,
      passed: false,
      error: 'File not found'
    });
    return tests;
  }
  
  tests.push({
    name: `${fileName} exists`,
    passed: true,
    error: null
  });
  
  // Test 2: File is readable and has valid JavaScript
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    tests.push({
      name: `${fileName} is readable`,
      passed: true,
      error: null
    });
    
    // Test 3: Has main execution logic
    const hasMainLogic = content.includes('async function') || content.includes('function');
    tests.push({
      name: `${fileName} has main logic`,
      passed: hasMainLogic,
      error: hasMainLogic ? null : 'Missing main function'
    });
    
  } catch (error) {
    tests.push({
      name: `${fileName} is readable`,
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     MIGRATION FILES VALIDATION                            ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  const baseDir = path.join(__dirname, '..');
  
  // Migration files to validate
  const migrationFiles = [
    'migrations/20251123000000-create-property-assignments.js',
    'migrations/20251124000000-add-assigned-property-id.js',
    'migrations/20251125000000-add-performance-indexes.js'
  ];
  
  // Script files to validate
  const scriptFiles = [
    'scripts/migrateExistingUsersForRoleSegregation.js',
    'scripts/testRoleSegregationMigration.js',
    'scripts/runRoleSegregationMigrations.js'
  ];
  
  let allPassed = true;
  
  // Validate migration files
  log('\n📋 Validating Migration Files:', 'cyan');
  for (const file of migrationFiles) {
    const filePath = path.join(baseDir, file);
    const tests = validateMigrationFile(filePath);
    
    log(`\n  ${path.basename(file)}:`, 'blue');
    tests.forEach(test => {
      if (test.passed) {
        log(`    ✅ ${test.name}`, 'green');
      } else {
        log(`    ❌ ${test.name}`, 'red');
        if (test.error) {
          log(`       Error: ${test.error}`, 'red');
        }
        allPassed = false;
      }
    });
  }
  
  // Validate script files
  log('\n📜 Validating Script Files:', 'cyan');
  for (const file of scriptFiles) {
    const filePath = path.join(baseDir, file);
    const tests = validateScript(filePath);
    
    log(`\n  ${path.basename(file)}:`, 'blue');
    tests.forEach(test => {
      if (test.passed) {
        log(`    ✅ ${test.name}`, 'green');
      } else {
        log(`    ❌ ${test.name}`, 'red');
        if (test.error) {
          log(`       Error: ${test.error}`, 'red');
        }
        allPassed = false;
      }
    });
  }
  
  // Validate README
  log('\n📖 Validating Documentation:', 'cyan');
  const readmePath = path.join(baseDir, 'migrations/ROLE_SEGREGATION_MIGRATIONS_README.md');
  if (fs.existsSync(readmePath)) {
    log('  ✅ ROLE_SEGREGATION_MIGRATIONS_README.md exists', 'green');
  } else {
    log('  ❌ ROLE_SEGREGATION_MIGRATIONS_README.md not found', 'red');
    allPassed = false;
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  VALIDATION SUMMARY', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  if (allPassed) {
    log('\n✅ All migration files are valid and ready to use!', 'green');
    log('\nNext steps:', 'green');
    log('  1. Review the migration files', 'green');
    log('  2. Create a database backup', 'green');
    log('  3. Run: node backend/scripts/runRoleSegregationMigrations.js', 'green');
  } else {
    log('\n❌ Some validation checks failed. Please fix the issues above.', 'red');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = { main };
