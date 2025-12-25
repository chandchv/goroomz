/**
 * Check if internal_roles table exists and what data it has
 */

const { sequelize } = require('../models');

async function checkInternalRolesTable() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%internal%role%'
    `);
    
    console.log('Tables matching "internal role":');
    console.log(tables);
    
    if (tables.length === 0) {
      console.log('\n❌ No internal_roles table found!');
      console.log('\nYou need to create it. The table should be named "internal_roles" (lowercase).');
      console.log('\nTry running: npx sequelize-cli db:migrate');
    } else {
      // Try to query the table
      const tableName = tables[0].table_name;
      console.log(`\n✓ Found table: ${tableName}`);
      
      const [roles] = await sequelize.query(`SELECT * FROM "${tableName}"`);
      console.log(`\nRoles in table (${roles.length} total):`);
      roles.forEach(role => {
        console.log(`  - ${role.name}: ${role.display_name || role.displayName}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkInternalRolesTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
