const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');

async function checkExistingBookings() {
  try {
    console.log('🔍 Checking Existing Bookings...');
    
    const bookings = await Booking.findAll({
      attributes: ['id', 'roomId', 'bedId', 'status', 'checkIn', 'checkOut'],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    console.log(`\n📋 Found ${bookings.length} bookings:`);
    bookings.forEach(booking => {
      console.log(`   ID: ${booking.id}`);
      console.log(`   Room ID: ${booking.roomId}`);
      console.log(`   Bed ID: ${booking.bedId}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Check-in: ${booking.checkIn}`);
      console.log(`   Check-out: ${booking.checkOut}`);
      console.log('');
    });
    
    // Check for specific bed
    const bedBookings = await Booking.findAll({
      where: {
        bedId: '177f5d30-2e4f-4b72-90a2-769437b90e5b'
      }
    });
    
    console.log(`📋 Bookings for bed 177f5d30-2e4f-4b72-90a2-769437b90e5b: ${bedBookings.length}`);
    
  } catch (error) {
    console.error('❌ Error checking bookings:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkExistingBookings();