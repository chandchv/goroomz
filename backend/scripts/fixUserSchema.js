/**
 * Migration script to fix User schema issues
 * 
 * This script:
 * 1. Adds missing role values to the enum_users_role enum
 * 2. Adds the isActive column to the users table
 */

const { sequelize } = require('../config/database');

async function fixUserSchema() {
  console.log('Starting User schema migration...');

  try {
    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Step 1: Add new role values to the enum
      console.log('Adding new role values to enum_users_role...');
      
      // Get current enum values
      const [currentEnum] = await sequelize.query(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
        );`,
        { transaction }
      );
      
      const existingRoles = currentEnum.map(row => row.enumlabel);
      console.log('Existing roles:', existingRoles);

      // Roles that need to be added
      const newRoles = ['agent', 'operations_manager', 'platform_admin', 'regional_manager'];
      
      for (const role of newRoles) {
        if (!existingRoles.includes(role)) {
          console.log(`Adding role: ${role}`);
          await sequelize.query(
            `ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS '${role}';`,
            { transaction }
          );
        } else {
          console.log(`Role ${role} already exists, skipping...`);
        }
      }

      // Step 2: Add isActive column if it doesn't exist
      console.log('Checking if isActive column exists...');
      
      const [columns] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'isActive';`,
        { transaction }
      );

      if (columns.length === 0) {
        console.log('Adding isActive column...');
        await sequelize.query(
          `ALTER TABLE users ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;`,
          { transaction }
        );
        console.log('isActive column added successfully');
      } else {
        console.log('isActive column already exists, skipping...');
      }

      // Commit the transaction
      await transaction.commit();
      console.log('✅ User schema migration completed successfully!');
      
      // Verify the changes
      console.log('\nVerifying changes...');
      const [updatedEnum] = await sequelize.query(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
        ) ORDER BY enumlabel;`
      );
      console.log('Updated roles:', updatedEnum.map(row => row.enumlabel));

      const [updatedColumns] = await sequelize.query(
        `SELECT column_name, data_type, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'isActive';`
      );
      console.log('isActive column:', updatedColumns);

    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
fixUserSchema()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
