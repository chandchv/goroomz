const { sequelize } = require('../config/database');

async function checkPropertyIdColumn() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        column_name,
        is_nullable,
        column_default,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name = 'property_id'
    `);
    
    console.log('property_id column info:', results[0]);
    
    // Also check if there are any constraints
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'rooms' 
      AND kcu.column_name = 'property_id'
    `);
    
    console.log('property_id constraints:', constraints);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkPropertyIdColumn();