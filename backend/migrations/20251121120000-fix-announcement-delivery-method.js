'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing column and recreate it with the correct type
    await queryInterface.sequelize.query(`
      -- Drop the column if it exists
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "delivery_method";
    `);

    // Recreate the column with the correct ENUM array type
    await queryInterface.sequelize.query(`
      -- Create the ENUM type if it doesn't exist
      DO $$ BEGIN
        CREATE TYPE enum_announcements_delivery_method AS ENUM('email', 'in_app', 'sms');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Add the column back with the correct type
      ALTER TABLE "announcements" 
      ADD COLUMN "delivery_method" enum_announcements_delivery_method[] NOT NULL DEFAULT ARRAY['email', 'in_app']::enum_announcements_delivery_method[];
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes if needed
    await queryInterface.sequelize.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "delivery_method";
    `);
  }
};
