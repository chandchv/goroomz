const { sequelize } = require('../config/database');
const Room = require('../models/Room');

async function debugRoomModel() {
  try {
    console.log('=== Room Model Debug ===');
    
    // Get actual database columns
    const queryInterface = sequelize.getQueryInterface();
    const actualColumns = await queryInterface.describeTable('rooms');
    console.log('\n1. Actual database columns:');
    Object.keys(actualColumns).forEach(col => {
      console.log(`   - ${col} (${actualColumns[col].type}, nullable: ${actualColumns[col].allowNull})`);
    });
    
    // Get Sequelize model attributes
    console.log('\n2. Sequelize model attributes:');
    const modelAttributes = Room.getTableName ? Room.rawAttributes : Room.attributes;
    Object.keys(modelAttributes).forEach(attr => {
      const field = modelAttributes[attr];
      console.log(`   - ${attr} -> ${field.field || attr} (${field.type})`);
    });
    
    // Try a simple query to see what Sequelize generates
    console.log('\n3. Testing simple Room.findOne query...');
    try {
      const testRoom = await Room.findOne({
        attributes: ['id', 'title'],
        limit: 1
      });
      console.log('   ✓ Simple query successful');
    } catch (error) {
      console.log('   ✗ Simple query failed:', error.message);
      console.log('   SQL:', error.sql);
    }
    
    // Check for associations
    console.log('\n4. Room model associations:');
    const associations = Room.associations || {};
    Object.keys(associations).forEach(assoc => {
      console.log(`   - ${assoc}: ${associations[assoc].associationType}`);
    });
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

debugRoomModel();