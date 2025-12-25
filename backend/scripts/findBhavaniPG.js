require('dotenv').config();
const { sequelize } = require('../config/database');
const { Property, Room } = require('../models');

async function findBhavaniPG() {
  try {
    console.log('🔍 Searching for "Bhavani PG"...\n');

    // Search in properties table
    const properties = await sequelize.query(`
      SELECT id, name, type, approval_status, is_active, location, created_at
      FROM properties
      WHERE name ILIKE '%Bhavani%'
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${properties.length} properties with "Bhavani" in name:\n`);
    properties.forEach(prop => {
      console.log(`📍 ${prop.name}`);
      console.log(`   - ID: ${prop.id}`);
      console.log(`   - Type: ${prop.type}`);
      console.log(`   - Status: ${prop.approval_status}`);
      console.log(`   - Active: ${prop.is_active}`);
      console.log(`   - Location: ${prop.location?.city || 'N/A'}`);
      console.log(`   - Created: ${prop.created_at}`);
      console.log('');
    });

    // Search in rooms table
    const rooms = await sequelize.query(`
      SELECT id, title, category, approval_status, is_active, property_id, created_at
      FROM rooms
      WHERE title ILIKE '%Bhavani%'
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${rooms.length} rooms with "Bhavani" in title:\n`);
    rooms.forEach(room => {
      console.log(`🏠 ${room.title}`);
      console.log(`   - ID: ${room.id}`);
      console.log(`   - Category: ${room.category}`);
      console.log(`   - Status: ${room.approval_status}`);
      console.log(`   - Active: ${room.is_active}`);
      console.log(`   - Property ID: ${room.property_id || 'NULL (standalone)'}`);
      console.log(`   - Created: ${room.created_at}`);
      console.log('');
    });

    if (properties.length === 0 && rooms.length === 0) {
      console.log('❌ "Bhavani PG" not found in either properties or rooms table');
      console.log('\n💡 Possible reasons:');
      console.log('   1. The property name might be slightly different');
      console.log('   2. It might have been deleted');
      console.log('   3. It might be in a different table');
      console.log('\nLet me search for similar names...\n');

      const similarProperties = await sequelize.query(`
        SELECT id, name, approval_status, is_active
        FROM properties
        WHERE name ILIKE '%PG%'
        AND (name ILIKE '%Bhav%' OR name ILIKE '%Bha%')
        ORDER BY created_at DESC
        LIMIT 10
      `, { type: sequelize.QueryTypes.SELECT });

      console.log(`Found ${similarProperties.length} properties with similar names:`);
      similarProperties.forEach(prop => {
        console.log(`   - ${prop.name} (${prop.approval_status}, active: ${prop.is_active})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

findBhavaniPG();
