const { sequelize } = require('../config/database');

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'internal_roles' 
      ORDER BY ordinal_position
    `);
    
    console.log('Internal Roles Table Columns:');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();
