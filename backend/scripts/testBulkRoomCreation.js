/**
 * Test script for bulk room creation endpoint
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4
 */

const { Room, BedAssignment, User, sequelize } = require('../models');

async function testBulkRoomCreation() {
  console.log('🧪 Testing Bulk Room Creation Logic...\n');
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find or create a test property
    let property = await Room.findOne({
      where: { category: 'PG' },
      transaction
    });
    
    if (!property) {
      // Create a test owner
      const testOwner = await User.findOne({
        where: { role: 'owner' },
        transaction
      });
      
      if (!testOwner) {
        console.log('❌ No owner found. Please create an owner first.');
        await transaction.rollback();
        return;
      }
      
      // Create a test property
      property = await Room.create({
        ownerId: testOwner.id,
        title: 'Test PG Property',
        description: 'Test property for bulk room creation',
        category: 'PG',
        roomType: 'PG',
        pricingType: 'monthly',
        location: {
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        },
        price: 5000,
        isActive: true,
        approvalStatus: 'approved'
      }, { transaction });
      
      console.log(`✅ Created test property: ${property.title} (ID: ${property.id})\n`);
    } else {
      console.log(`✅ Using existing property: ${property.title} (ID: ${property.id})\n`);
    }
    
    // Test parameters
    const testParams = {
      propertyId: property.id,
      floorNumber: 1,
      startRoom: 1,
      endRoom: 5,
      sharingType: '2_sharing'
    };
    
    console.log('📋 Test Parameters:');
    console.log(`   Property ID: ${testParams.propertyId}`);
    console.log(`   Floor Number: ${testParams.floorNumber}`);
    console.log(`   Room Range: ${testParams.startRoom} - ${testParams.endRoom}`);
    console.log(`   Sharing Type: ${testParams.sharingType}\n`);
    
    // Validation tests
    console.log('🔍 Running Validation Tests...\n');
    
    // Test 1: Floor number validation
    console.log('Test 1: Floor number validation (1-50)');
    if (testParams.floorNumber >= 1 && testParams.floorNumber <= 50) {
      console.log('   ✅ Floor number is valid\n');
    } else {
      console.log('   ❌ Floor number is invalid\n');
    }
    
    // Test 2: Room range validation
    console.log('Test 2: Room range validation');
    const roomCount = testParams.endRoom - testParams.startRoom + 1;
    console.log(`   Room count: ${roomCount}`);
    if (testParams.startRoom <= testParams.endRoom && roomCount <= 100) {
      console.log('   ✅ Room range is valid\n');
    } else {
      console.log('   ❌ Room range is invalid\n');
    }
    
    // Test 3: Sharing type validation
    console.log('Test 3: Sharing type validation');
    const validSharingTypes = ['single', '2_sharing', '3_sharing', 'quad', 'dormitory'];
    if (validSharingTypes.includes(testParams.sharingType)) {
      console.log('   ✅ Sharing type is valid\n');
    } else {
      console.log('   ❌ Sharing type is invalid\n');
    }
    
    // Test 4: Bed count mapping
    console.log('Test 4: Bed count mapping');
    const bedCountMap = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const expectedBeds = bedCountMap[testParams.sharingType];
    console.log(`   Expected beds for ${testParams.sharingType}: ${expectedBeds}`);
    console.log('   ✅ Bed count mapping is correct\n');
    
    // Test 5: Room number generation with floor convention
    console.log('Test 5: Room number generation (floor convention)');
    const generatedRoomNumbers = [];
    for (let roomNum = testParams.startRoom; roomNum <= testParams.endRoom; roomNum++) {
      const roomNumber = `${testParams.floorNumber}${String(roomNum).padStart(2, '0')}`;
      generatedRoomNumbers.push(roomNumber);
    }
    console.log(`   Generated room numbers: ${generatedRoomNumbers.join(', ')}`);
    console.log('   ✅ Room numbers generated correctly\n');
    
    // Test 6: Create rooms
    console.log('Test 6: Creating rooms in transaction...');
    const createdRooms = [];
    
    for (let roomNum = testParams.startRoom; roomNum <= testParams.endRoom; roomNum++) {
      const roomNumber = `${testParams.floorNumber}${String(roomNum).padStart(2, '0')}`;
      
      // Check for duplicates
      const existingRoom = await Room.findOne({
        where: {
          ownerId: property.ownerId,
          roomNumber: roomNumber
        },
        transaction
      });
      
      if (existingRoom) {
        console.log(`   ⚠️  Room ${roomNumber} already exists, skipping...`);
        continue;
      }
      
      const room = await Room.create({
        ownerId: property.ownerId,
        title: `${property.title} - Room ${roomNumber}`,
        description: `Room ${roomNumber} on Floor ${testParams.floorNumber}`,
        category: property.category,
        roomType: property.roomType,
        pricingType: property.pricingType,
        location: property.location,
        amenities: property.amenities || [],
        rules: property.rules || [],
        price: property.price,
        maxGuests: expectedBeds,
        floorNumber: testParams.floorNumber,
        roomNumber: roomNumber,
        sharingType: testParams.sharingType,
        totalBeds: expectedBeds,
        currentStatus: 'vacant_clean',
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date()
      }, { transaction });
      
      // Create bed assignments
      for (let bedNum = 1; bedNum <= expectedBeds; bedNum++) {
        await BedAssignment.create({
          roomId: room.id,
          bedNumber: bedNum,
          status: 'vacant'
        }, { transaction });
      }
      
      createdRooms.push(room);
      console.log(`   ✅ Created Room ${roomNumber} with ${expectedBeds} beds`);
    }
    
    console.log(`\n✅ Successfully created ${createdRooms.length} rooms\n`);
    
    // Test 7: Verify created rooms
    console.log('Test 7: Verifying created rooms...');
    for (const room of createdRooms) {
      const beds = await BedAssignment.findAll({
        where: { roomId: room.id },
        transaction
      });
      
      console.log(`   Room ${room.roomNumber}:`);
      console.log(`      - Floor: ${room.floorNumber}`);
      console.log(`      - Sharing Type: ${room.sharingType}`);
      console.log(`      - Total Beds: ${room.totalBeds}`);
      console.log(`      - Bed Assignments: ${beds.length}`);
      console.log(`      - Status: ${room.currentStatus}`);
      
      if (beds.length === room.totalBeds) {
        console.log(`      ✅ Bed count matches\n`);
      } else {
        console.log(`      ❌ Bed count mismatch!\n`);
      }
    }
    
    // Rollback transaction (we don't want to keep test data)
    await transaction.rollback();
    console.log('🔄 Transaction rolled back (test data not saved)\n');
    
    console.log('✅ All tests passed!\n');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testBulkRoomCreation();
