const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Simple bulk room creation using raw SQL - bypasses all Sequelize model issues
 */
async function createRoomsDirectly(propertyId, floorNumber, startRoom, endRoom, sharingType, price = 5000) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Creating rooms ${startRoom}-${endRoom} on floor ${floorNumber} for property ${propertyId}`);
    
    // Validate inputs
    if (!propertyId || !floorNumber || !startRoom || !endRoom || !sharingType) {
      throw new Error('Missing required parameters');
    }
    
    // Map sharing types to bed counts
    const bedCounts = {
      'single': 1,
      'double': 2,
      'triple': 3,
      'quad': 4,
      'dormitory': 6
    };
    
    const totalBeds = bedCounts[sharingType] || 1;
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
          description: `${sharingType} room ${roomNumber} on floor ${floorNumber}`,
          roomType: 'shared',
          sharingType: sharingType,
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
      createdRooms.push({ id: roomId, roomNumber, floorNumber });
    }
    
    await transaction.commit();
    console.log(`Successfully created ${createdRooms.length} rooms`);
    return { success: true, rooms: createdRooms };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create rooms:', error.message);
    throw error;
  }
}

// Test the function
async function testSimpleBulkCreation() {
  try {
    const result = await createRoomsDirectly(
      '4c9b4a2b-67e2-47f9-9eb9-3028245a768f', // propertyId
      1,      // floorNumber
      101,    // startRoom
      105,    // endRoom
      'single', // sharingType
      5000    // price
    );
    
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Export for use in routes
module.exports = { createRoomsDirectly };

// Run test if called directly
if (require.main === module) {
  testSimpleBulkCreation();
}