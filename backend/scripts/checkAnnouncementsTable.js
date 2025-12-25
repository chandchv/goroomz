require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: console.log
  }
);

async function checkTable() {
  try {
    // Check if announcements table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'announcements';
    `);
    
    console.log('Announcements table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Check the column type
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'announcements'
        AND column_name = 'delivery_method';
      `);
      
      console.log('delivery_method column:', columns);
    }
    
    // Check for ENUM types
    const [enums] = await sequelize.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typname LIKE '%announcement%';
    `);
    
    console.log('Announcement-related ENUM types:', enums);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTable();
