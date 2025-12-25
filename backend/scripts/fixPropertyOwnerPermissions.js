const { sequelize } = require('../config/database');
const User = require('../models/User');

async function fixPropertyOwnerPermissions() {
  try {
    console.log('🔧 Fixing Property Owner Permissions...');
    
    // Find the user
    const user = await User.findOne({
      where: { email: 'amit.patel@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Current Role: ${user.role}`);
    
    // Property owners should have these permissions
    const propertyOwnerPermissions = {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: true,
      canManageStaff: true,
      canViewReports: true,
      canRecordPayments: true,
      canUpdateRoomStatus: true,
      canManageMaintenance: true,
      canManageBookings: true // Add this if it doesn't exist
    };
    
    console.log('\n🔧 Updating permissions...');
    await user.update({
      permissions: propertyOwnerPermissions
    });
    
    console.log('✅ Permissions updated successfully!');
    
    // Verify the update
    const updatedUser = await User.findByPk(user.id);
    console.log('\n📋 Updated Permissions:');
    console.log(JSON.stringify(updatedUser.permissions, null, 2));
    
    console.log('\n🔑 Key permissions for booking management:');
    console.log(`   - canCheckIn: ${updatedUser.permissions.canCheckIn}`);
    console.log(`   - canCheckOut: ${updatedUser.permissions.canCheckOut}`);
    console.log(`   - canManageBookings: ${updatedUser.permissions.canManageBookings}`);
    console.log(`   - canManageRooms: ${updatedUser.permissions.canManageRooms}`);
    
  } catch (error) {
    console.error('❌ Error fixing property owner permissions:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixPropertyOwnerPermissions();