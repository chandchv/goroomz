const { sequelize } = require('../config/database');

async function checkSharingTypeEnum() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_rooms_new_sharing_type'
      )
    `);
    
    console.log('Valid sharingType enum values:');
    results.forEach(row => console.log('- ' + row.enumlabel));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSharingTypeEnum();