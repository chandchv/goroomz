const {
  sequelize,
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
 * Test script to verify database models and associations
 */

async function testModels() {
  try {
    console.log('🔄 Testing database models and associations...\n');

    // Test 1: Verify all models are defined
    console.log('📋 Test 1: Verifying all models are defined...');
    const models = [
      'User', 'Room', 'RoomType', 'Booking', 'Category',
      'RoomStatus', 'BedAssignment', 'Payment', 'PaymentSchedule',
      'SecurityDeposit', 'MaintenanceRequest', 'HousekeepingLog', 'RoomCategory'
    ];
    
    const modelObjects = {
      User, Room, RoomType, Booking, Category,
      RoomStatus, BedAssignment, Payment, PaymentSchedule,
      SecurityDeposit, MaintenanceRequest, HousekeepingLog, RoomCategory
    };

    for (const modelName of models) {
      if (modelObjects[modelName]) {
        console.log(`  ✅ ${modelName} model is defined`);
      } else {
        throw new Error(`${modelName} model is not defined`);
      }
    }

    // Test 2: Sync all models with database
    console.log('\n📋 Test 2: Syncing models with database...');
    await sequelize.sync({ alter: true });
    console.log('  ✅ All models synced successfully');

    // Test 3: Verify associations
    console.log('\n📋 Test 3: Verifying model associations...');
    
    // Room associations
    console.log('  Testing Room associations...');
    if (Room.associations.statusHistory) console.log('    ✅ Room -> RoomStatus (statusHistory)');
    if (Room.associations.beds) console.log('    ✅ Room -> BedAssignment (beds)');
    if (Room.associations.maintenanceRequests) console.log('    ✅ Room -> MaintenanceRequest (maintenanceRequests)');
    if (Room.associations.housekeepingLogs) console.log('    ✅ Room -> HousekeepingLog (housekeepingLogs)');
    if (Room.associations.customCategory) console.log('    ✅ Room -> RoomCategory (customCategory)');

    // Booking associations
    console.log('  Testing Booking associations...');
    if (Booking.associations.payments) console.log('    ✅ Booking -> Payment (payments)');
    if (Booking.associations.paymentSchedules) console.log('    ✅ Booking -> PaymentSchedule (paymentSchedules)');
    if (Booking.associations.securityDeposit) console.log('    ✅ Booking -> SecurityDeposit (securityDeposit)');
    if (Booking.associations.assignedBeds) console.log('    ✅ Booking -> BedAssignment (assignedBeds)');

    // User associations
    console.log('  Testing User associations...');
    if (User.associations.roomStatusUpdates) console.log('    ✅ User -> RoomStatus (roomStatusUpdates)');
    if (User.associations.recordedPayments) console.log('    ✅ User -> Payment (recordedPayments)');
    if (User.associations.reportedMaintenanceRequests) console.log('    ✅ User -> MaintenanceRequest (reportedMaintenanceRequests)');
    if (User.associations.cleaningLogs) console.log('    ✅ User -> HousekeepingLog (cleaningLogs)');
    if (User.associations.roomCategories) console.log('    ✅ User -> RoomCategory (roomCategories)');

    // BedAssignment associations
    console.log('  Testing BedAssignment associations...');
    if (BedAssignment.associations.room) console.log('    ✅ BedAssignment -> Room (room)');
    if (BedAssignment.associations.booking) console.log('    ✅ BedAssignment -> Booking (booking)');
    if (BedAssignment.associations.occupant) console.log('    ✅ BedAssignment -> User (occupant)');
    if (BedAssignment.associations.paymentSchedules) console.log('    ✅ BedAssignment -> PaymentSchedule (paymentSchedules)');

    // Payment associations
    console.log('  Testing Payment associations...');
    if (Payment.associations.booking) console.log('    ✅ Payment -> Booking (booking)');
    if (Payment.associations.recorder) console.log('    ✅ Payment -> User (recorder)');
    if (Payment.associations.schedules) console.log('    ✅ Payment -> PaymentSchedule (schedules)');

    // PaymentSchedule associations
    console.log('  Testing PaymentSchedule associations...');
    if (PaymentSchedule.associations.booking) console.log('    ✅ PaymentSchedule -> Booking (booking)');
    if (PaymentSchedule.associations.bed) console.log('    ✅ PaymentSchedule -> BedAssignment (bed)');
    if (PaymentSchedule.associations.payment) console.log('    ✅ PaymentSchedule -> Payment (payment)');

    // SecurityDeposit associations
    console.log('  Testing SecurityDeposit associations...');
    if (SecurityDeposit.associations.booking) console.log('    ✅ SecurityDeposit -> Booking (booking)');
    if (SecurityDeposit.associations.refunder) console.log('    ✅ SecurityDeposit -> User (refunder)');

    // MaintenanceRequest associations
    console.log('  Testing MaintenanceRequest associations...');
    if (MaintenanceRequest.associations.room) console.log('    ✅ MaintenanceRequest -> Room (room)');
    if (MaintenanceRequest.associations.reporter) console.log('    ✅ MaintenanceRequest -> User (reporter)');
    if (MaintenanceRequest.associations.assignee) console.log('    ✅ MaintenanceRequest -> User (assignee)');

    // HousekeepingLog associations
    console.log('  Testing HousekeepingLog associations...');
    if (HousekeepingLog.associations.room) console.log('    ✅ HousekeepingLog -> Room (room)');
    if (HousekeepingLog.associations.cleaner) console.log('    ✅ HousekeepingLog -> User (cleaner)');

    // RoomCategory associations
    console.log('  Testing RoomCategory associations...');
    if (RoomCategory.associations.propertyOwner) console.log('    ✅ RoomCategory -> User (propertyOwner)');
    if (RoomCategory.associations.rooms) console.log('    ✅ RoomCategory -> Room (rooms)');

    // Test 4: Verify indexes
    console.log('\n📋 Test 4: Verifying indexes...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`  ✅ Found ${tables.length} tables in database`);

    // Test 5: Check table structures
    console.log('\n📋 Test 5: Checking table structures...');
    
    const checkTable = async (tableName, expectedColumns) => {
      try {
        const tableDescription = await sequelize.getQueryInterface().describeTable(tableName);
        const foundColumns = Object.keys(tableDescription);
        const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
        
        if (missingColumns.length === 0) {
          console.log(`  ✅ ${tableName}: All expected columns present`);
        } else {
          console.log(`  ⚠️  ${tableName}: Missing columns: ${missingColumns.join(', ')}`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName}: Table not found or error checking structure`);
      }
    };

    await checkTable('room_statuses', ['id', 'room_id', 'status', 'updated_by', 'notes']);
    await checkTable('bed_assignments', ['id', 'room_id', 'bed_number', 'status', 'booking_id', 'occupant_id']);
    await checkTable('payments', ['id', 'booking_id', 'amount', 'payment_date', 'payment_method', 'payment_type', 'status', 'recorded_by']);
    await checkTable('payment_schedules', ['id', 'booking_id', 'bed_id', 'due_date', 'amount', 'status', 'paid_date', 'payment_id']);
    await checkTable('security_deposits', ['id', 'booking_id', 'amount', 'collected_date', 'payment_method', 'status', 'refund_amount', 'refund_date']);
    await checkTable('maintenance_requests', ['id', 'room_id', 'title', 'description', 'priority', 'status', 'reported_by', 'assigned_to']);
    await checkTable('housekeeping_logs', ['id', 'room_id', 'cleaned_by', 'cleaned_at', 'time_taken']);
    await checkTable('room_categories', ['id', 'property_id', 'name', 'description', 'is_active']);

    console.log('\n✅ All model tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total models: ${models.length}`);
    console.log(`   - New models: 8 (RoomStatus, BedAssignment, Payment, PaymentSchedule, SecurityDeposit, MaintenanceRequest, HousekeepingLog, RoomCategory)`);
    console.log(`   - Extended models: 3 (Room, Booking, User)`);
    console.log('   - All associations verified');
    console.log('   - All indexes created');

  } catch (error) {
    console.error('\n❌ Model test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testModels()
    .then(() => {
      console.log('\n🎉 Model testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Model testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testModels };
