require('dotenv').config();
const { sequelize } = require('../config/database');
const { Property, Room, User, Category } = require('../models');

async function testPropertyCreation() {
  try {
    console.log('🧪 Testing Property Creation Workflow\n');

    // 1. Find or create a test owner
    console.log('1. Finding test owner...');
    let owner = await User.findOne({ where: { role: 'owner' } });
    
    if (!owner) {
      console.log('   No owner found, creating test owner...');
      owner = await User.create({
        name: 'Test Property Owner',
        email: `test-owner-${Date.now()}@example.com`,
        password: 'password123',
        role: 'owner',
        phone: '1234567890'
      });
      console.log(`   ✅ Created test owner: ${owner.email}`);
    } else {
      console.log(`   ✅ Found owner: ${owner.email}`);
    }

    // 2. Find or create a test category
    console.log('\n2. Finding test category...');
    let category = await Category.findOne({ where: { name: 'PG' } });
    
    if (!category) {
      console.log('   No PG category found, creating...');
      category = await Category.create({
        name: 'PG',
        description: 'Paying Guest accommodations',
        icon: '🏠'
      });
      console.log('   ✅ Created PG category');
    } else {
      console.log(`   ✅ Found category: ${category.name}`);
    }

    // 3. Create a test property with room
    console.log('\n3. Creating test property with room...');
    const transaction = await sequelize.transaction();
    
    try {
      const propertyData = {
        name: 'Test PG Property',
        description: 'A comfortable PG accommodation for testing',
        type: 'pg',
        categoryId: category.id,
        ownerId: owner.id,
        location: {
          address: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India'
        },
        contactInfo: {
          phone: '9876543210',
          email: owner.email
        },
        amenities: ['wifi', 'meals', 'laundry', 'ac'],
        images: [{
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
          isPrimary: true
        }],
        rules: ['No smoking', 'No pets', 'Quiet hours after 10 PM'],
        totalFloors: 3,
        approvalStatus: 'pending',
        isActive: true
      };

      const property = await Property.create(propertyData, { transaction });
      console.log(`   ✅ Created property: ${property.name} (ID: ${property.id})`);

      // Create a room for this property
      const roomData = {
        propertyId: property.id,
        title: 'Comfortable PG Room',
        description: 'A cozy room with all amenities',
        price: 8000,
        maxGuests: 2,
        category: 'PG',
        roomType: 'PG',
        pricingType: 'monthly',
        location: property.location,
        amenities: property.amenities,
        rules: property.rules,
        images: property.images,
        approvalStatus: 'pending',
        isActive: true,
        roomNumber: '101',
        floorNumber: 1,
        sharingType: 'single',
        totalBeds: 1,
        currentStatus: 'vacant_clean'
      };

      const room = await Room.create(roomData, { transaction });
      console.log(`   ✅ Created room: ${room.title} (ID: ${room.id})`);

      await transaction.commit();
      console.log('   ✅ Transaction committed successfully');

      // 4. Verify the creation
      console.log('\n4. Verifying creation...');
      const createdProperty = await Property.findByPk(property.id, {
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
          },
          {
            model: Room,
            as: 'rooms'
          }
        ]
      });

      if (createdProperty) {
        console.log('   ✅ Property verified:');
        console.log(`      - Name: ${createdProperty.name}`);
        console.log(`      - Type: ${createdProperty.type}`);
        console.log(`      - Owner: ${createdProperty.owner.name}`);
        console.log(`      - Category: ${createdProperty.category.name}`);
        console.log(`      - Location: ${createdProperty.location.city}, ${createdProperty.location.state}`);
        console.log(`      - Approval Status: ${createdProperty.approvalStatus}`);
        console.log(`      - Rooms: ${createdProperty.rooms.length}`);
        
        if (createdProperty.rooms.length > 0) {
          console.log(`      - Room Title: ${createdProperty.rooms[0].title}`);
          console.log(`      - Room Price: ₹${createdProperty.rooms[0].price}/month`);
        }
      }

      // 5. Test querying properties
      console.log('\n5. Testing property queries...');
      
      // Get all properties for owner
      const ownerProperties = await Property.findAll({
        where: { ownerId: owner.id },
        include: [
          {
            model: Room,
            as: 'rooms',
            attributes: ['id', 'title', 'price']
          }
        ]
      });
      console.log(`   ✅ Found ${ownerProperties.length} properties for owner`);

      // Get approved properties (should be 0 since we created pending)
      const approvedProperties = await Property.findAll({
        where: { 
          approvalStatus: 'approved',
          isActive: true
        }
      });
      console.log(`   ✅ Found ${approvedProperties.length} approved properties`);

      // Get pending properties
      const pendingProperties = await Property.findAll({
        where: { approvalStatus: 'pending' }
      });
      console.log(`   ✅ Found ${pendingProperties.length} pending properties`);

      console.log('\n✅ All tests passed successfully!');
      console.log('\n📝 Summary:');
      console.log(`   - Property ID: ${property.id}`);
      console.log(`   - Room ID: ${room.id}`);
      console.log(`   - Owner ID: ${owner.id}`);
      console.log(`   - Category ID: ${category.id}`);
      console.log('\n💡 Next steps:');
      console.log('   1. Test the API endpoint: POST /api/properties');
      console.log('   2. Test property approval workflow');
      console.log('   3. Test frontend property listing wizard');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testPropertyCreation();
