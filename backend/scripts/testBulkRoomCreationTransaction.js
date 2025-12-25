const { Room, Property, User, BedAssignment, sequelize } = require('../models');

async function testBulkRoomCreationTransaction() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🧪 Testing Bulk Room Creation Transaction...');

    // Find a property to test with
    const property = await Property.findOne({
      include: [{
        model: User,
        as: 'owner',
        required: true
      }]
    });

    if (!property) {
      console.log('❌ No property found for testing');
      await transaction.rollback();
      return;
    }

    console.log(`✅ Found property: ${property.name} (Owner: ${property.owner.name})`);

    // Test the Room.findOne query that was failing
    const testRoomNumber = '999'; // Use a room number that likely doesn't exist
    
    console.log('🔍 Testing Room.findOne query with correct column names...');
    const existingRoom = await Room.findOne({
      where: {
        propertyId: property.id,  // JavaScript property name (correct)
        roomNumber: testRoomNumber
      },
      attributes: ['id'],
      transaction
    });

    if (existingRoom) {
      console.log(`⚠️  Room ${testRoomNumber} already exists`);
    } else {
      console.log(`✅ Room ${testRoomNumber} does not exist (as expected)`);
    }

    // Test creating a room
    console.log('🔍 Testing Room.create...');
    const testRoom = await Room.create({
      propertyId: property.id,
      title: `Test Room ${testRoomNumber}`,
      description: `Test room for transaction validation`,
      category: 'PG',
      roomType: 'PG',
      pricingType: 'monthly',
      location: property.location,
      amenities: [],
      rules: [],
      price: 1000,
      maxGuests: 1,
      floorNumber: 9,
      roomNumber: testRoomNumber,
      sharingType: 'single',
      totalBeds: 1,
      currentStatus: 'vacant_clean',
      isActive: true,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: property.ownerId
    }, { transaction });

    console.log(`✅ Successfully created test room: ${testRoom.id}`);

    // Test creating bed assignment
    console.log('🔍 Testing BedAssignment.create...');
    const bedAssignment = await BedAssignment.create({
      roomId: testRoom.id,
      bedNumber: 1,
      status: 'vacant'
    }, { transaction });

    console.log(`✅ Successfully created bed assignment: ${bedAssignment.id}`);

    // Clean up - rollback the transaction to remove test data
    await transaction.rollback();
    console.log('✅ Transaction rolled back (test data cleaned up)');

    console.log('🎉 Bulk room creation transaction test completed successfully!');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Bulk room creation transaction test failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.original?.code,
      sql: error.sql
    });
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBulkRoomCreationTransaction()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testBulkRoomCreationTransaction;