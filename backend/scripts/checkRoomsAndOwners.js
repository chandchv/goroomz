require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Room } = require('../models');

async function checkRoomsAndOwners() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all property owners
    const propertyOwners = await User.findAll({
      where: { role: 'property_owner' },
      attributes: ['id', 'name', 'email', 'role', 'internalRole', 'assignedPropertyId']
    });

    console.log(`Found ${propertyOwners.length} property owners:\n`);
    for (const owner of propertyOwners) {
      console.log(`- ${owner.name} (${owner.email})`);
      console.log(`  ID: ${owner.id}`);
      console.log(`  Role: ${owner.role}`);
      console.log(`  Internal Role: ${owner.internalRole || 'none'}`);
      console.log(`  Assigned Property: ${owner.assignedPropertyId || 'none'}`);
      
      // Check rooms owned by this user
      const rooms = await Room.findAll({
        where: { ownerId: owner.id },
        attributes: ['id', 'title', 'category', 'isActive']
      });
      
      console.log(`  Owns ${rooms.length} rooms:`);
      if (rooms.length > 0) {
        rooms.forEach(room => {
          console.log(`    - ${room.title} (${room.category}) - ${room.isActive ? 'Active' : 'Inactive'}`);
        });
      }
      console.log('');
    }

    // Get all rooms
    const allRooms = await Room.findAll({
      attributes: ['id', 'title', 'ownerId', 'category', 'isActive'],
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email', 'role'],
        required: false
      }]
    });

    console.log(`\nTotal rooms in database: ${allRooms.length}\n`);
    
    if (allRooms.length > 0) {
      console.log('All rooms:');
      allRooms.forEach(room => {
        console.log(`- ${room.title} (${room.category})`);
        console.log(`  ID: ${room.id}`);
        console.log(`  Owner ID: ${room.ownerId}`);
        if (room.owner) {
          console.log(`  Owner: ${room.owner.name} (${room.owner.email}) - ${room.owner.role}`);
        } else {
          console.log(`  Owner: NOT FOUND - orphaned room!`);
        }
        console.log(`  Active: ${room.isActive}`);
        console.log('');
      });
    }

    // Check for orphaned rooms (rooms without valid owners)
    const orphanedRooms = allRooms.filter(room => !room.owner);
    if (orphanedRooms.length > 0) {
      console.log(`\n⚠️  Found ${orphanedRooms.length} orphaned rooms (no valid owner):`);
      orphanedRooms.forEach(room => {
        console.log(`- ${room.title} (Owner ID: ${room.ownerId})`);
      });
    }

    await sequelize.close();
    console.log('\n✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkRoomsAndOwners();
