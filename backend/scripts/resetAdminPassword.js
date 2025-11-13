
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    console.log('🔍 Looking for admin user...');
    
    const admin = await User.findOne({ where: { email: 'admin@goroomz.com' } });
    
    if (!admin) {
      console.log('❌ Admin user not found. Creating new admin user...');
      
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      console.log(hashedPassword);
      
      const newAdmin = await User.create({
        name: 'Admin User',
        email: 'admin@goroomz.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
      
      console.log('✅ New admin user created successfully!');
      console.log('📧 Email: admin@goroomz.com');
      console.log('🔑 Password: admin@123');
      console.log(hashedPassword);
      
    } else {
      console.log('✅ Admin user found. Resetting password...');
      
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await admin.update({ 
        password: hashedPassword,
        isVerified: true 
      });
      
      console.log('✅ Admin password reset successfully!');
      console.log('📧 Email: admin@goroomz.com');
      console.log('🔑 Password: admin@123');
      console.log(hashedPassword);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

resetAdminPassword();