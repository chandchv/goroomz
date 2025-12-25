const { sequelize } = require('../config/database');

/**
 * Test the new simplified bulk room creation directly
 */
async function testNewBulkRoomCreation() {
  const { v4: uuidv4 } = require('uuid');
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Testing new bulk room creation logic...');
    
    const propertyId = '4c9b4a2b-67e2-47f9-9eb9-3028245a768f';
    const floorNumber = 2;
    const startRoom = 1;
    const endRoom = 3;
    const sharingType = 'single';
    const price = 6000;
    
    // Map sharing types
    const sharingTypeMap = {
      'single': 'single',
      '2_sharing': 'double', 
      '3_sharing': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory'
    };
    
    const mappedSharingType = sharingTypeMap[sharingType];
    
    // Bed count mapping
    const bedCounts = {
      'single': 1,
      'double': 2,
      'triple': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[mappedSharingType];
    
    console.log(`Creating rooms ${startRoom}-${endRoom} on floor ${floorNumber}`);
    console.log(`Sharing type: ${sharingType} -> ${mappedSharingType} (${totalBeds} beds)`);
    
    const createdRooms = [];
    
    for (let roomNum = startRoom; roomNum <= endRoom; roomNum++) {
      const roomNumber = `${floorNumber}${String(roomNum).padStart(2, '0')}`;
      const roomId = uuidv4();
      
      // Check if room already exists
      const [existingRooms] = await sequelize.query(
        'SELECT id FROM rooms WHERE property_id = :propertyId AND room_number = :roomNumber',
        {
          replacements: { propertyId, roomNumber },
          transaction
        }
      );
      
      if (existingRooms.length > 0) {
        console.log(`Room ${roomNumber} already exists, skipping`);
        continue;
      }
      
      // Insert room directly with raw SQL
      await sequelize.query(`
        INSERT INTO rooms (
          id, property_id, room_number, floor_number, 
          title, description, room_type, sharing_type, 
          total_beds, price, pricing_type, 
          current_status, is_active, 
          amenities, images, 
          created_at, updated_at
        ) VALUES (
          :id, :propertyId, :roomNumber, :floorNumber,
          :title, :description, :roomType, :sharingType,
          :totalBeds, :price, :pricingType,
          :currentStatus, :isActive,
          :amenities, :images,
          NOW(), NOW()
        )
      `, {
        replacements: {
          id: roomId,
          propertyId: propertyId,
          roomNumber: roomNumber,
          floorNumber: floorNumber,
          title: `Room ${roomNumber}`,
          description: `${mappedSharingType} room ${roomNumber} on floor ${floorNumber}`,
          roomType: 'shared',
          sharingType: mappedSharingType,
          totalBeds: totalBeds,
          price: price,
          pricingType: 'per_month',
          currentStatus: 'vacant_clean',
          isActive: true,
          amenities: '{}',
          images: '{}'
        },
        transaction
      });
      
      console.log(`✓ Created room ${roomNumber} (${roomId})`);
      createdRooms.push({
        id: roomId,
        roomNumber: roomNumber,
        floorNumber: floorNumber,
        sharingType: mappedSharingType,
        totalBeds: totalBeds,
        price: price
      });
    }
    
    await transaction.commit();
    
    console.log(`\n✅ SUCCESS: Created ${createdRooms.length} rooms`);
    console.log('Created rooms:', createdRooms);
    
    return {
      success: true,
      message: `Successfully created ${createdRooms.length} room(s)`,
      data: {
        created: createdRooms.length,
        rooms: createdRooms
      }
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ FAILED:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

testNewBulkRoomCreation();