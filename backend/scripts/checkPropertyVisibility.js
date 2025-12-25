require('dotenv').config();
const { sequelize } = require('../config/database');
const { Property, Room, User, Category } = require('../models');

async function checkPropertyVisibility() {
  try {
    console.log('🔍 Checking Property Visibility\n');

    // 1. Check properties table
    console.log('1. Checking properties table...');
    const properties = await Property.findAll({
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [[sequelize.col('created_at'), 'DESC']]
    });

    console.log(`   Found ${properties.length} properties in database:\n`);
    properties.forEach(prop => {
      console.log(`   📍 ${prop.name}`);
      console.log(`      - ID: ${prop.id}`);
      console.log(`      - Type: ${prop.type}`);
      console.log(`      - Owner: ${prop.owner?.name} (${prop.owner?.email})`);
      console.log(`      - Category: ${prop.category?.name}`);
      console.log(`      - Status: ${prop.approvalStatus}`);
      console.log(`      - Active: ${prop.isActive}`);
      console.log(`      - Location: ${prop.location?.city}, ${prop.location?.state}`);
      console.log('');
    });

    // 2. Check approved properties (what public should see)
    console.log('2. Checking approved properties (public view)...');
    const approvedProperties = await Property.findAll({
      where: {
        approvalStatus: 'approved',
        isActive: true
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log(`   Found ${approvedProperties.length} approved & active properties:\n`);
    approvedProperties.forEach(prop => {
      console.log(`   ✅ ${prop.name} - ${prop.owner?.name}`);
    });

    // 3. Check rooms table (old structure)
    console.log('\n3. Checking rooms table (old structure)...');
    const rooms = await Room.findAll({
      where: {
        propertyId: null // Standalone rooms (old structure)
      },
      attributes: ['id', 'title', 'category', 'approvalStatus', 'isActive'],
      limit: 10
    });

    console.log(`   Found ${rooms.length} standalone rooms (old structure):\n`);
    rooms.forEach(room => {
      console.log(`   🏠 ${room.title}`);
      console.log(`      - Status: ${room.approvalStatus}`);
      console.log(`      - Active: ${room.isActive}`);
    });

    // 4. Check rooms linked to properties
    console.log('\n4. Checking rooms linked to properties...');
    const linkedRooms = await Room.findAll({
      where: {
        propertyId: { [sequelize.Op.ne]: null }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'approvalStatus']
        }
      ]
    });

    console.log(`   Found ${linkedRooms.length} rooms linked to properties:\n`);
    linkedRooms.forEach(room => {
      console.log(`   🔗 ${room.title}`);
      console.log(`      - Property: ${room.property?.name}`);
      console.log(`      - Property Status: ${room.property?.approvalStatus}`);
    });

    // 5. Search for "Bhavani PG" specifically
    console.log('\n5. Searching for "Bhavani PG"...');
    
    const bhavaniProperty = await Property.findOne({
      where: {
        name: { [sequelize.Op.iLike]: '%Bhavani%' }
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Room,
          as: 'rooms',
          required: false
        }
      ]
    });

    if (bhavaniProperty) {
      console.log('   ✅ Found "Bhavani PG" in properties table:');
      console.log(`      - ID: ${bhavaniProperty.id}`);
      console.log(`      - Name: ${bhavaniProperty.name}`);
      console.log(`      - Type: ${bhavaniProperty.type}`);
      console.log(`      - Owner: ${bhavaniProperty.owner?.name}`);
      console.log(`      - Email: ${bhavaniProperty.owner?.email}`);
      console.log(`      - Phone: ${bhavaniProperty.owner?.phone}`);
      console.log(`      - Approval Status: ${bhavaniProperty.approvalStatus}`);
      console.log(`      - Is Active: ${bhavaniProperty.isActive}`);
      console.log(`      - Rooms: ${bhavaniProperty.rooms?.length || 0}`);
      console.log(`      - Location: ${JSON.stringify(bhavaniProperty.location, null, 2)}`);
    } else {
      console.log('   ❌ "Bhavani PG" NOT found in properties table');
      
      // Check if it's in rooms table instead
      const bhavaniRoom = await Room.findOne({
        where: {
          title: { [sequelize.Op.iLike]: '%Bhavani%' }
        }
      });

      if (bhavaniRoom) {
        console.log('   ⚠️  Found "Bhavani" in rooms table (old structure):');
        console.log(`      - ID: ${bhavaniRoom.id}`);
        console.log(`      - Title: ${bhavaniRoom.title}`);
        console.log(`      - Property ID: ${bhavaniRoom.propertyId || 'NULL (standalone)'}`);
        console.log(`      - Approval Status: ${bhavaniRoom.approvalStatus}`);
        console.log(`      - Is Active: ${bhavaniRoom.isActive}`);
      }
    }

    // 6. Check what the API would return
    console.log('\n6. Simulating API call GET /api/properties...');
    const apiResponse = await Property.findAll({
      where: {
        isActive: true,
        approvalStatus: 'approved'
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [[sequelize.col('created_at'), 'DESC']],
      limit: 10
    });

    console.log(`   API would return ${apiResponse.length} properties:\n`);
    apiResponse.forEach(prop => {
      console.log(`   📦 ${prop.name}`);
      console.log(`      - Owner: ${prop.owner?.name}`);
      console.log(`      - Type: ${prop.type}`);
      console.log(`      - Category: ${prop.category?.name}`);
    });

    console.log('\n✅ Check complete!');
    console.log('\n💡 Recommendations:');
    console.log('   1. If "Bhavani PG" is in properties table but not showing:');
    console.log('      - Check if frontend is calling /api/properties or /api/rooms');
    console.log('      - Verify approval_status = "approved" and is_active = true');
    console.log('   2. If "Bhavani PG" is in rooms table (old structure):');
    console.log('      - Need to migrate it to properties table');
    console.log('      - Or update frontend to query both tables');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkPropertyVisibility();
