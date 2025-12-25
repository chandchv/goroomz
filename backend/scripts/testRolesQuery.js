const { sequelize } = require('../config/database');
const InternalRole = require('../models/InternalRole');

async function testQuery() {
  try {
    console.log('Testing InternalRole query...');
    
    const roles = await InternalRole.findAll({
      attributes: [
        'id',
        'name',
        'displayName',
        'description',
        'defaultPermissions',
        'isCustom',
        'createdBy'
      ],
      order: [
        ['isCustom', 'ASC'],
        ['name', 'ASC']
      ]
    });
    
    console.log(`Found ${roles.length} roles`);
    roles.forEach(role => {
      console.log(`- ${role.name} (${role.displayName})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testQuery();
