require('dotenv').config();
const { sequelize } = require('../config/database');

async function findPropertyByOwner() {
  try {
    console.log('🔍 Searching for properties by owner "chandra" or email "chandchv"...\n');

    const properties = await sequelize.query(`
      SELECT 
        p.id, 
        p.name, 
        p.approval_status, 
        p.is_active,
        p.created_at,
        u.name as owner_name, 
        u.email as owner_email
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE u.name ILIKE '%chandra%' OR u.email ILIKE '%sekhar.iw123%'
      ORDER BY p.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${properties.length} properties:\n`);
    properties.forEach(p => {
      console.log(`📍 ${p.name}`);
      console.log(`   - Owner: ${p.owner_name}`);
      console.log(`   - Email: ${p.owner_email}`);
      console.log(`   - Status: ${p.approval_status}`);
      console.log(`   - Active: ${p.is_active}`);
      console.log(`   - Created: ${p.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

findPropertyByOwner();
