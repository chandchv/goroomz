require('dotenv').config();
const { sequelize } = require('../config/database');

async function fixInternalRoleColumn() {
  try {
    console.log('🔄 Fixing internal_role column type...');
    
    // Drop the foreign key constraint if it exists
    try {
      await sequelize.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_internal_role_fkey;
      `);
      console.log('✅ Dropped existing foreign key constraint');
    } catch (err) {
      console.log('⚠️  No existing foreign key to drop');
    }
    
    // Convert the column from ENUM to VARCHAR
    await sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN internal_role TYPE VARCHAR(255) 
      USING internal_role::text;
    `);
    console.log('✅ Converted internal_role column to VARCHAR');
    
    // Drop the old ENUM type
    try {
      await sequelize.query(`
        DROP TYPE IF EXISTS enum_users_internal_role CASCADE;
      `);
      console.log('✅ Dropped old ENUM type');
    } catch (err) {
      console.log('⚠️  ENUM type might not exist');
    }
    
    // Add the foreign key constraint
    await sequelize.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_internal_role_fkey 
      FOREIGN KEY (internal_role) 
      REFERENCES internal_roles(name) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    console.log('✅ Added foreign key constraint');
    
    console.log('\n✅ internal_role column fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixInternalRoleColumn();
