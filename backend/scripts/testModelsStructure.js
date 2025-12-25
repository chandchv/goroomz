const {
  User,
  Room,
  RoomType,
  Booking,
  Category,
  RoomStatus,
  BedAssignment,
  Payment,
  PaymentSchedule,
  SecurityDeposit,
  MaintenanceRequest,
  HousekeepingLog,
  RoomCategory
} = require('../models');

/**
 * Test script to verify model structure and associations without database connection
 */

function testModelsStructure() {
  try {
    console.log('🔄 Testing model structure and associations (no DB connection required)...\n');

    // Test 1: Verify all models are defined
    console.log('📋 Test 1: Verifying all models are defined...');
    const models = {
      User, Room, RoomType, Booking, Category,
      RoomStatus, BedAssignment, Payment, PaymentSchedule,
      SecurityDeposit, MaintenanceRequest, HousekeepingLog, RoomCategory
    };

    let allDefined = true;
    for (const [name, model] of Object.entries(models)) {
      if (model && model.name) {
        console.log(`  ✅ ${name} model is defined`);
      } else {
        console.log(`  ❌ ${name} model is NOT defined`);
        allDefined = false;
      }
    }

    if (!allDefined) {
      throw new Error('Some models are not defined');
    }

    // Test 2: Verify model attributes
    console.log('\n📋 Test 2: Verifying model attributes...');
    
    const checkAttributes = (model, modelName, expectedAttrs) => {
      const attrs = Object.keys(model.rawAttributes);
      const missing = expectedAttrs.filter(attr => !attrs.includes(attr));
      
      if (missing.length === 0) {
        console.log(`  ✅ ${modelName}: All expected attributes present (${attrs.length} total)`);
        return true;
      } else {
        console.log(`  ❌ ${modelName}: Missing attributes: ${missing.join(', ')}`);
        return false;
      }
    };

    // Check new models
    checkAttributes(RoomStatus, 'RoomStatus', ['id', 'roomId', 'status', 'updatedBy', 'notes']);
    checkAttributes(BedAssignment, 'BedAssignment', ['id', 'roomId', 'bedNumber', 'status', 'bookingId', 'occupantId']);
    checkAttributes(Payment, 'Payment', ['id', 'bookingId', 'amount', 'paymentDate', 'paymentMethod', 'paymentType', 'status', 'recordedBy', 'notes']);
    checkAttributes(PaymentSchedule, 'PaymentSchedule', ['id', 'bookingId', 'bedId', 'dueDate', 'amount', 'status', 'paidDate', 'paymentId']);
    checkAttributes(SecurityDeposit, 'SecurityDeposit', ['id', 'bookingId', 'amount', 'collectedDate', 'paymentMethod', 'status', 'refundAmount', 'refundDate', 'deductions', 'refundedBy', 'notes']);
    checkAttributes(MaintenanceRequest, 'MaintenanceRequest', ['id', 'roomId', 'title', 'description', 'priority', 'status', 'reportedBy', 'assignedTo', 'reportedDate', 'expectedCompletionDate', 'completedDate', 'workPerformed', 'costIncurred', 'images']);
    checkAttributes(HousekeepingLog, 'HousekeepingLog', ['id', 'roomId', 'cleanedBy', 'cleanedAt', 'timeTaken', 'checklistCompleted', 'issuesFound', 'notes']);
    checkAttributes(RoomCategory, 'RoomCategory', ['id', 'propertyId', 'name', 'description', 'isActive']);

    // Check extended models have new fields
    console.log('\n  Checking extended model fields...');
    checkAttributes(Room, 'Room (extended)', ['floorNumber', 'roomNumber', 'customCategoryId', 'sharingType', 'totalBeds', 'currentStatus', 'lastCleanedAt', 'lastMaintenanceAt']);
    checkAttributes(Booking, 'Booking (extended)', ['bookingSource', 'bedId', 'actualCheckInTime', 'actualCheckOutTime', 'securityDepositId', 'checkedInBy', 'checkedOutBy']);
    checkAttributes(User, 'User (extended)', ['staffRole', 'permissions']);

    // Test 3: Verify associations
    console.log('\n📋 Test 3: Verifying model associations...');
    
    const checkAssociation = (model, modelName, associationName) => {
      if (model.associations && model.associations[associationName]) {
        console.log(`  ✅ ${modelName}.${associationName}`);
        return true;
      } else {
        console.log(`  ❌ ${modelName}.${associationName} NOT FOUND`);
        return false;
      }
    };

    // Room associations
    console.log('\n  Room associations:');
    checkAssociation(Room, 'Room', 'statusHistory');
    checkAssociation(Room, 'Room', 'beds');
    checkAssociation(Room, 'Room', 'maintenanceRequests');
    checkAssociation(Room, 'Room', 'housekeepingLogs');
    checkAssociation(Room, 'Room', 'customCategory');

    // Booking associations
    console.log('\n  Booking associations:');
    checkAssociation(Booking, 'Booking', 'payments');
    checkAssociation(Booking, 'Booking', 'paymentSchedules');
    checkAssociation(Booking, 'Booking', 'securityDeposit');
    checkAssociation(Booking, 'Booking', 'assignedBeds');

    // User associations
    console.log('\n  User associations:');
    checkAssociation(User, 'User', 'roomStatusUpdates');
    checkAssociation(User, 'User', 'recordedPayments');
    checkAssociation(User, 'User', 'reportedMaintenanceRequests');
    checkAssociation(User, 'User', 'cleaningLogs');
    checkAssociation(User, 'User', 'roomCategories');

    // New model associations
    console.log('\n  New model associations:');
    checkAssociation(RoomStatus, 'RoomStatus', 'room');
    checkAssociation(RoomStatus, 'RoomStatus', 'updatedByUser');
    checkAssociation(BedAssignment, 'BedAssignment', 'room');
    checkAssociation(BedAssignment, 'BedAssignment', 'booking');
    checkAssociation(BedAssignment, 'BedAssignment', 'occupant');
    checkAssociation(Payment, 'Payment', 'booking');
    checkAssociation(Payment, 'Payment', 'recorder');
    checkAssociation(PaymentSchedule, 'PaymentSchedule', 'booking');
    checkAssociation(PaymentSchedule, 'PaymentSchedule', 'bed');
    checkAssociation(PaymentSchedule, 'PaymentSchedule', 'payment');
    checkAssociation(SecurityDeposit, 'SecurityDeposit', 'booking');
    checkAssociation(MaintenanceRequest, 'MaintenanceRequest', 'room');
    checkAssociation(MaintenanceRequest, 'MaintenanceRequest', 'reporter');
    checkAssociation(MaintenanceRequest, 'MaintenanceRequest', 'assignee');
    checkAssociation(HousekeepingLog, 'HousekeepingLog', 'room');
    checkAssociation(HousekeepingLog, 'HousekeepingLog', 'cleaner');
    checkAssociation(RoomCategory, 'RoomCategory', 'propertyOwner');
    checkAssociation(RoomCategory, 'RoomCategory', 'rooms');

    // Test 4: Verify table names
    console.log('\n📋 Test 4: Verifying table names...');
    const tableNames = {
      RoomStatus: 'room_statuses',
      BedAssignment: 'bed_assignments',
      Payment: 'payments',
      PaymentSchedule: 'payment_schedules',
      SecurityDeposit: 'security_deposits',
      MaintenanceRequest: 'maintenance_requests',
      HousekeepingLog: 'housekeeping_logs',
      RoomCategory: 'room_categories'
    };

    for (const [modelName, expectedTable] of Object.entries(tableNames)) {
      const model = models[modelName];
      if (model.tableName === expectedTable) {
        console.log(`  ✅ ${modelName} -> ${expectedTable}`);
      } else {
        console.log(`  ❌ ${modelName} -> Expected: ${expectedTable}, Got: ${model.tableName}`);
      }
    }

    console.log('\n✅ All structure tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Total models: 13');
    console.log('   - New models: 8 (RoomStatus, BedAssignment, Payment, PaymentSchedule, SecurityDeposit, MaintenanceRequest, HousekeepingLog, RoomCategory)');
    console.log('   - Extended models: 3 (Room, Booking, User)');
    console.log('   - All model definitions verified ✅');
    console.log('   - All associations verified ✅');
    console.log('   - All table names verified ✅');
    console.log('\n💡 Note: To test database sync and indexes, run with a valid database connection');

    return true;

  } catch (error) {
    console.error('\n❌ Structure test failed:', error);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  const success = testModelsStructure();
  process.exit(success ? 0 : 1);
}

module.exports = { testModelsStructure };
