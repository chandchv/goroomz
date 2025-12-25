const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const Property = require('../models/Property');
const BedAssignment = require('../models/BedAssignment');

async function testBookingCreation() {
  try {
    console.log('🧪 Testing Booking Creation...');
    
    // Find the room
    const room = await Room.findOne({
      where: { roomNumber: '301' }
    });
    
    if (!room) {
      console.log('❌ Room not found');
      return;
    }
    
    console.log(`✅ Found room: ${room.roomNumber} (ID: ${room.id})`);
    
    // Find the property
    const property = await Property.findByPk(room.propertyId);
    if (!property) {
      console.log('❌ Property not found');
      return;
    }
    
    console.log(`✅ Found property: ${property.name} (Owner: ${property.ownerId})`);
    
    // Find a bed
    const bed = await BedAssignment.findOne({
      where: { roomId: room.id, status: 'vacant' }
    });
    
    if (!bed) {
      console.log('❌ No vacant bed found');
      return;
    }
    
    console.log(`✅ Found bed: ${bed.bedNumber} (ID: ${bed.id})`);
    
    // Find or create a test user
    let user = await User.findOne({ where: { email: 'test@example.com' } });
    
    if (!user) {
      user = await User.create({
        name: 'Test Guest',
        email: 'test@example.com',
        phone: '9876543210',
        password: 'testpassword',
        role: 'user',
        isVerified: false
      });
    }
    
    console.log(`✅ Found/created user: ${user.email} (ID: ${user.id})`);
    
    // Try to create booking
    const bookingData = {
      roomId: room.id,
      bedId: bed.id,
      userId: user.id,
      ownerId: property.ownerId,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      guests: 1,
      totalAmount: 1500,
      contactInfo: {
        phone: '9876543210',
        email: 'test@example.com'
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      bookingSource: 'offline'
    };
    
    console.log('\n🔧 Creating booking with data:');
    console.log(JSON.stringify(bookingData, null, 2));
    
    const booking = await Booking.create(bookingData);
    
    console.log(`\n✅ Booking created successfully!`);
    console.log(`   Booking ID: ${booking.id}`);
    console.log(`   User ID: ${booking.userId}`);
    console.log(`   Owner ID: ${booking.ownerId}`);
    
  } catch (error) {
    console.error('\n❌ Error creating booking:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    if (error.parameters) {
      console.error('Parameters:', error.parameters);
    }
    if (error.original) {
      console.error('Original error:', error.original);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the test
testBookingCreation();