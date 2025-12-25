const { Room, RoomStatus, User } = require('../models');

async function testRoomStatusUpdate() {
  try {
    console.log('🧪 Testing room status update...');
    
    // Find a room to test with
    const room = await Room.findOne({
      where: { isActive: true },
      limit: 1
    });
    
    if (!room) {
      console.log('❌ No active rooms found for testing');
      return;
    }
    
    console.log(`✅ Found test room: ${room.roomNumber || room.id}`);
    
    // Find a user to use as updatedBy
    const user = await User.findOne({ limit: 1 });
    
    if (!user) {
      console.log('❌ No users found for testing');
      return;
    }
    
    console.log(`✅ Found test user: ${user.email || user.id}`);
    
    // Test creating a room status record
    const roomStatus = await RoomStatus.create({
      roomId: room.id,
      status: 'vacant_clean',
      updatedBy: user.id,
      notes: 'Test status update from script'
    });
    
    console.log('✅ Successfully created room status record:');
    console.log(`   - Room ID: ${roomStatus.roomId}`);
    console.log(`   - Status: ${roomStatus.status}`);
    console.log(`   - Updated By: ${roomStatus.updatedBy}`);
    console.log(`   - Notes: ${roomStatus.notes}`);
    console.log(`   - Created At: ${roomStatus.createdAt}`);
    
    // Update the room's current status
    await room.update({ currentStatus: roomStatus.status });
    console.log(`✅ Updated room current status to: ${roomStatus.status}`);
    
    console.log('🎉 Room status update test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing room status update:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
  } finally {
    process.exit(0);
  }
}

testRoomStatusUpdate();