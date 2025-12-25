const { User, Room } = require('../models');

async function getTestCredentials() {
  try {
    console.log('🔍 Finding test credentials and room IDs...\n');
    
    // Find property owners
    console.log('👥 PROPERTY OWNERS:');
    const owners = await User.findAll({
      where: {
        role: 'owner'
      },
      attributes: ['id', 'name', 'email', 'role'],
      limit: 5
    });
    
    if (owners.length > 0) {
      owners.forEach(owner => {
        console.log(`  📧 ${owner.email}`);
        console.log(`     Name: ${owner.name}`);
        console.log(`     ID: ${owner.id}`);
        console.log(`     Password: password123 (default)\n`);
      });
    } else {
      console.log('  ❌ No property owners found\n');
    }
    
    // Find double sharing rooms (301-310)
    console.log('🏠 DOUBLE SHARING ROOMS (301-310):');
    const doubleRooms = await Room.findAll({
      where: {
        sharingType: 'double',
        roomNumber: {
          [require('sequelize').Op.between]: ['301', '310']
        }
      },
      attributes: ['id', 'roomNumber', 'sharingType', 'totalBeds', 'propertyId'],
      order: [['roomNumber', 'ASC']]
    });
    
    if (doubleRooms.length > 0) {
      doubleRooms.forEach(room => {
        console.log(`  🛏️  Room ${room.roomNumber}:`);
        console.log(`     ID: ${room.id}`);
        console.log(`     Sharing: ${room.sharingType}`);
        console.log(`     Beds: ${room.totalBeds}`);
        console.log(`     Property: ${room.propertyId}\n`);
      });
    } else {
      console.log('  ❌ No double sharing rooms found\n');
    }
    
    // Find any rooms for testing
    console.log('🏠 ALL AVAILABLE ROOMS (First 10):');
    const allRooms = await Room.findAll({
      attributes: ['id', 'roomNumber', 'sharingType', 'totalBeds'],
      limit: 10,
      order: [['roomNumber', 'ASC']]
    });
    
    if (allRooms.length > 0) {
      allRooms.forEach(room => {
        console.log(`  Room ${room.roomNumber}: ${room.id} (${room.sharingType || 'single'})`);
      });
    } else {
      console.log('  ❌ No rooms found');
    }
    
    console.log('\n📋 POSTMAN TESTING INSTRUCTIONS:');
    console.log('1. Import the Bed_API_Testing.postman_collection.json file');
    console.log('2. Use one of the owner emails above for login');
    console.log('3. Use password: password123');
    console.log('4. Use room IDs from the double sharing rooms list');
    console.log('5. Run the collection in order (1-7)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Database connection issue. Try these alternatives:');
      console.log('1. Check if PostgreSQL is running');
      console.log('2. Verify database credentials in backend/.env');
      console.log('3. Use these default test credentials:');
      console.log('   Email: amit.patel@example.com');
      console.log('   Password: password123');
      console.log('   Room 309 ID: 610ba499-1376-4473-a476-e885d139c74d');
    }
  }
  
  process.exit(0);
}

getTestCredentials();