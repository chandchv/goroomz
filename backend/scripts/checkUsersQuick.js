const { User } = require('../models');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const users = await User.findAll({
      where: {
        role: 'owner'
      },
      attributes: ['id', 'name', 'email', 'role'],
      limit: 5
    });
    
    console.log('👥 Found users:', users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    })));
    
    // Check specifically for amit.patel
    const amitUser = await User.findOne({
      where: {
        email: 'amit.patel@example.com'
      },
      attributes: ['id', 'name', 'email', 'role']
    });
    
    if (amitUser) {
      console.log('✅ Found Amit Patel:', {
        id: amitUser.id,
        name: amitUser.name,
        email: amitUser.email,
        role: amitUser.role
      });
    } else {
      console.log('❌ Amit Patel user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkUsers();