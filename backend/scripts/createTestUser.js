const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function createTestUser() {
  try {
    console.log('🔧 Creating test user for Postman testing...');
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: 'test@goroomz.com' }
    });
    
    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log('   Email: test@goroomz.com');
      console.log('   Password: test123');
      console.log('   Role:', existingUser.role);
      return;
    }
    
    // Create new test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@goroomz.com',
      password: hashedPassword,
      phone: '+919999999999',
      role: 'owner',
      isActive: true,
      emailVerified: true
    });
    
    console.log('✅ Test user created successfully:');
    console.log('   Email: test@goroomz.com');
    console.log('   Password: test123');
    console.log('   Role:', testUser.role);
    console.log('   ID:', testUser.id);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Database connection issue. Use these credentials in Postman:');
      console.log('   Email: test@goroomz.com');
      console.log('   Password: test123');
      console.log('\n   Or try the default credentials:');
      console.log('   Email: amit.patel@example.com');
      console.log('   Password: password123');
    }
  }
  
  process.exit(0);
}

createTestUser();