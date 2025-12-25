const { User, Room } = require('../models');

async function checkUserProperties(email) {
  try {
    // Find user
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'email', 'role', 'internalRole']
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log('\n✅ User Found:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Internal Role:', user.internalRole || 'None');

    // Find properties owned by this user
    const rooms = await Room.findAll({
      where: { ownerId: user.id },
      attributes: ['id', 'title', 'category', 'roomNumber', 'floorNumber', 'currentStatus', 'isActive'],
      order: [['title', 'ASC'], ['floorNumber', 'ASC'], ['roomNumber', 'ASC']]
    });

    console.log(`\n📊 Properties Owned: ${rooms.length} rooms`);
    
    if (rooms.length === 0) {
      console.log('  No properties assigned to this user');
    } else {
      // Group by property title
      const propertiesByTitle = {};
      rooms.forEach(room => {
        const title = room.title || 'Unnamed';
        if (!propertiesByTitle[title]) {
          propertiesByTitle[title] = [];
        }
        propertiesByTitle[title].push(room);
      });

      console.log('\nProperties:');
      Object.entries(propertiesByTitle).forEach(([title, propertyRooms]) => {
        console.log(`\n  📍 ${title} (${propertyRooms.length} rooms)`);
        propertyRooms.forEach(room => {
          console.log(`     - Room ${room.roomNumber} (Floor ${room.floorNumber}) - ${room.currentStatus} - ${room.isActive ? 'Active' : 'Inactive'}`);
        });
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'meera.iyer@example.com';
checkUserProperties(email);
