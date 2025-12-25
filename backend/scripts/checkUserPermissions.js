const { sequelize } = require('../config/database');
const User = require('../models/User');

async function checkUserPermissions() {
  try {
    console.log('🔍 Checking User Permissions...');
    
    // Find the user
    const user = await User.findOne({
      where: { email: 'amit.patel@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Internal Role: ${user.internalRole}`);
    console.log(`   Staff Role: ${user.staffRole}`);
    
    console.log('\n📋 Permissions:');
    if (user.permissions) {
      console.log('   Regular Permissions:', JSON.stringify(user.permissions, null, 2));
    } else {
      console.log('   Regular Permissions: null');
    }
    
    if (user.internalPermissions) {
      console.log('   Internal Permissions:', JSON.stringify(user.internalPermissions, null, 2));
    } else {
      console.log('   Internal Permissions: null');
    }
    
    // Check if user has canCheckIn permission
    const hasCanCheckIn = user.internalPermissions && user.internalPermissions.canCheckIn;
    console.log(`\n🔑 Has canCheckIn permission: ${hasCanCheckIn}`);
    
    // Check what permissions property owners should have
    console.log('\n📋 Expected permissions for property owners:');
    console.log('   - canManageBookings: true');
    console.log('   - canCheckIn: true');
    console.log('   - canCheckOut: true');
    console.log('   - canManageRooms: true');
    console.log('   - canViewReports: true');
    
  } catch (error) {
    console.error('❌ Error checking user permissions:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkUserPermissions();