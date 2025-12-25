const { sequelize } = require('../config/database');
const Booking = require('../models/Booking');

async function deleteTestBookings() {
  try {
    console.log('🗑️ Deleting Test Bookings...');
    
    // Delete bookings for test user
    const deletedCount = await Booking.destroy({
      where: {
        userId: '1d3d78f2-d8e9-47de-a24f-106fda49de03' // test@example.com user ID
      }
    });
    
    console.log(`✅ Deleted ${deletedCount} test bookings`);
    
  } catch (error) {
    console.error('❌ Error deleting test bookings:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the deletion
deleteTestBookings();