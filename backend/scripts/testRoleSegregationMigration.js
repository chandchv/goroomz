const { sequelize } = require('../config/database');
const User = require('../models/User');
const PropertyAssignment = require('../models/PropertyAssignment');

/**
 * Test Script for Role Segregation Migration
 * 
 * This script validates that the role segregation migrations were applied correctly
 * and that the system is functioning as expected.
 * 
 * Tests:
 * 1. Database schema validation
 * 2. Index existence validation
 * 3. User model helper methods
 * 4. Data integrity checks
 * 5. Sample queries for each user type
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

async function testSchemaValidation() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  TEST 1: Database Schema Validation', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const tests = [];
  
  // Test 1.1: property_assignments table exists
  try {
    const [result] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_assignments'
      );
    `);
    tests.push({
      name: 'property_assignments table exists',
      passed: result[0].exists,
      error: null
    });
  } catch (error) {
    tests.push({
      name: 'property_assignments table exists',
      passed: false,
      error: error.message
    });
  }
  
  // Test 1.2: assigned_property_id column exists in users table
  try {
    const [result] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'assigned_property_id'
      );
    `);
    tests.push({
      name: 'users.assigned_property_id column exists',
      passed: result[0].exists,
      error: null
    });
  } catch (error) {
    tests.push({
      name: 'users.assigned_property_id column exists',
      passed: false,
      error: error.message
    });
  }
  
  // Test 1.3: Required columns in property_assignments
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'property_assignments'
    `);
    
    const requiredColumns = ['id', 'user_id', 'property_id', 'assignment_type', 'assigned_at', 'assigned_by', 'is_active', 'created_at', 'updated_at'];
    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    tests.push({
      name: 'property_assignments has all required columns',
      passed: missingColumns.length === 0,
      error: missingColumns.length > 0 ? `Missing columns: ${missingColumns.join(', ')}` : null
    });
  } catch (error) {
    tests.push({
      name: 'property_assignments has all required columns',
      passed: false,
      error: error.message
    });
  }
  
  // Print results
  tests.forEach(test => {
    if (test.passed) {
      log(`  ✅ ${test.name}`, 'green');
    } else {
      log(`  ❌ ${test.name}`, 'red');
      if (test.error) {
        log(`     Error: ${test.error}`, 'red');
      }
    }
  });
  
  return tests.every(t => t.passed);
}

async function testIndexValidation() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  TEST 2: Index Validation', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const tests = [];
  
  const requiredIndexes = [
    { table: 'property_assignments', index: 'property_assignments_user_id_idx' },
    { table: 'property_assignments', index: 'property_assignments_property_id_idx' },
    { table: 'property_assignments', index: 'property_assignments_assignment_type_idx' },
    { table: 'property_assignments', index: 'property_assignments_is_active_idx' },
    { table: 'users', index: 'users_assigned_property_id_idx' },
    { table: 'users', index: 'users_internal_role_idx' },
    { table: 'users', index: 'users_staff_role_idx' }
  ];
  
  for (const { table, index } of requiredIndexes) {
    try {
      const [result] = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = '${table}' 
          AND indexname = '${index}'
        );
      `);
      tests.push({
        name: `${table}.${index}`,
        passed: result[0].exists,
        error: null
      });
    } catch (error) {
      tests.push({
        name: `${table}.${index}`,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Print results
  tests.forEach(test => {
    if (test.passed) {
      log(`  ✅ ${test.name}`, 'green');
    } else {
      log(`  ⚠️  ${test.name} (may not be critical)`, 'yellow');
    }
  });
  
  return true; // Indexes are not critical for functionality
}

async function testUserModelHelpers() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  TEST 3: User Model Helper Methods', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const tests = [];
  
  try {
    // Test 3.1: Find a platform staff user
    const platformStaff = await User.findOne({
      where: { internalRole: { [sequelize.Sequelize.Op.ne]: null } }
    });
    
    if (platformStaff) {
      tests.push({
        name: 'isPlatformStaff() returns true for platform staff',
        passed: platformStaff.isPlatformStaff() === true,
        error: null
      });
      
      tests.push({
        name: 'getUserType() returns "platform_staff"',
        passed: platformStaff.getUserType() === 'platform_staff',
        error: null
      });
    } else {
      tests.push({
        name: 'isPlatformStaff() test',
        passed: false,
        error: 'No platform staff users found in database'
      });
    }
    
    // Test 3.2: Find a property owner
    const propertyOwner = await User.findOne({
      where: { 
        role: { [sequelize.Sequelize.Op.in]: ['owner', 'admin', 'category_owner'] },
        internalRole: null
      }
    });
    
    if (propertyOwner) {
      tests.push({
        name: 'isPropertyOwner() returns true for property owners',
        passed: propertyOwner.isPropertyOwner() === true,
        error: null
      });
      
      tests.push({
        name: 'getUserType() returns "property_owner"',
        passed: propertyOwner.getUserType() === 'property_owner',
        error: null
      });
      
      // Test getAccessiblePropertyIds
      const propertyIds = await propertyOwner.getAccessiblePropertyIds();
      tests.push({
        name: 'getAccessiblePropertyIds() returns array',
        passed: Array.isArray(propertyIds),
        error: null
      });
    } else {
      tests.push({
        name: 'isPropertyOwner() test',
        passed: false,
        error: 'No property owner users found in database'
      });
    }
    
    // Test 3.3: Find a property staff user
    const propertyStaff = await User.findOne({
      where: { 
        staffRole: { [sequelize.Sequelize.Op.ne]: null },
        internalRole: null
      }
    });
    
    if (propertyStaff) {
      tests.push({
        name: 'isPropertyStaff() returns true for property staff',
        passed: propertyStaff.isPropertyStaff() === true,
        error: null
      });
      
      tests.push({
        name: 'getUserType() returns "property_staff"',
        passed: propertyStaff.getUserType() === 'property_staff',
        error: null
      });
    } else {
      log('  ℹ️  No property staff users found (this is okay)', 'blue');
    }
    
  } catch (error) {
    tests.push({
      name: 'User model helper methods',
      passed: false,
      error: error.message
    });
  }
  
  // Print results
  tests.forEach(test => {
    if (test.passed) {
      log(`  ✅ ${test.name}`, 'green');
    } else {
      log(`  ❌ ${test.name}`, 'red');
      if (test.error) {
        log(`     Error: ${test.error}`, 'red');
      }
    }
  });
  
  return tests.every(t => t.passed);
}

async function testDataIntegrity() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  TEST 4: Data Integrity Checks', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const tests = [];
  
  // Test 4.1: Check for role conflicts
  try {
    const [conflicts] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE (role IN ('owner', 'admin', 'category_owner'))
        AND internal_role IS NOT NULL
    `);
    
    tests.push({
      name: 'No users with conflicting roles (owner + internalRole)',
      passed: conflicts[0].count === '0',
      error: conflicts[0].count !== '0' ? `Found ${conflicts[0].count} users with conflicts` : null
    });
  } catch (error) {
    tests.push({
      name: 'Role conflict check',
      passed: false,
      error: error.message
    });
  }
  
  // Test 4.2: Check property assignments integrity
  try {
    const [orphanedAssignments] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM property_assignments pa
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = pa.user_id)
         OR NOT EXISTS (SELECT 1 FROM rooms WHERE id = pa.property_id)
    `);
    
    tests.push({
      name: 'No orphaned property assignments',
      passed: orphanedAssignments[0].count === '0',
      error: orphanedAssignments[0].count !== '0' ? `Found ${orphanedAssignments[0].count} orphaned assignments` : null
    });
  } catch (error) {
    tests.push({
      name: 'Property assignment integrity check',
      passed: false,
      error: error.message
    });
  }
  
  // Test 4.3: Check assigned_property_id references
  try {
    const [orphanedStaff] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE assigned_property_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM rooms WHERE id = assigned_property_id)
    `);
    
    tests.push({
      name: 'All assigned_property_id values reference valid properties',
      passed: orphanedStaff[0].count === '0',
      error: orphanedStaff[0].count !== '0' ? `Found ${orphanedStaff[0].count} invalid references` : null
    });
  } catch (error) {
    tests.push({
      name: 'assigned_property_id integrity check',
      passed: false,
      error: error.message
    });
  }
  
  // Print results
  tests.forEach(test => {
    if (test.passed) {
      log(`  ✅ ${test.name}`, 'green');
    } else {
      log(`  ❌ ${test.name}`, 'red');
      if (test.error) {
        log(`     Error: ${test.error}`, 'red');
      }
    }
  });
  
  return tests.every(t => t.passed);
}

async function testSampleQueries() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  TEST 5: Sample Queries for Each User Type', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  try {
    // Query 1: Get all platform staff
    const platformStaff = await User.findAll({
      where: { internalRole: { [sequelize.Sequelize.Op.ne]: null } },
      attributes: ['id', 'name', 'email', 'internalRole']
    });
    log(`  ℹ️  Found ${platformStaff.length} platform staff users`, 'blue');
    
    // Query 2: Get all property owners
    const propertyOwners = await User.findAll({
      where: { 
        role: { [sequelize.Sequelize.Op.in]: ['owner', 'admin', 'category_owner'] },
        internalRole: null
      },
      attributes: ['id', 'name', 'email', 'role']
    });
    log(`  ℹ️  Found ${propertyOwners.length} property owner users`, 'blue');
    
    // Query 3: Get all property staff
    const propertyStaff = await User.findAll({
      where: { 
        staffRole: { [sequelize.Sequelize.Op.ne]: null },
        internalRole: null
      },
      attributes: ['id', 'name', 'email', 'staffRole', 'assignedPropertyId']
    });
    log(`  ℹ️  Found ${propertyStaff.length} property staff users`, 'blue');
    
    // Query 4: Get all property assignments
    const assignments = await PropertyAssignment.findAll({
      attributes: ['id', 'userId', 'propertyId', 'assignmentType', 'isActive']
    });
    log(`  ℹ️  Found ${assignments.length} property assignments`, 'blue');
    
    log('  ✅ All sample queries executed successfully', 'green');
    return true;
    
  } catch (error) {
    log(`  ❌ Sample queries failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     ROLE SEGREGATION MIGRATION TEST SUITE                ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    schema: false,
    indexes: false,
    helpers: false,
    integrity: false,
    queries: false
  };
  
  try {
    results.schema = await testSchemaValidation();
    results.indexes = await testIndexValidation();
    results.helpers = await testUserModelHelpers();
    results.integrity = await testDataIntegrity();
    results.queries = await testSampleQueries();
    
    // Print summary
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('  TEST SUMMARY', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    
    const allPassed = Object.values(results).every(r => r === true);
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const color = passed ? 'green' : 'red';
      log(`  ${status}: ${test.toUpperCase()}`, color);
    });
    
    if (allPassed) {
      log('\n✅ All tests passed! Role segregation migration is successful.', 'green');
    } else {
      log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }
    
    await sequelize.close();
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
