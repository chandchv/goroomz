'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, remove any duplicate phone numbers by setting them to null
      // Keep the first occurrence of each phone number
      await queryInterface.sequelize.query(`
        UPDATE users 
        SET phone = NULL 
        WHERE id NOT IN (
          SELECT DISTINCT ON (phone) id 
          FROM users 
          WHERE phone IS NOT NULL 
          ORDER BY phone, created_at ASC
        ) 
        AND phone IS NOT NULL;
      `);

      // Add unique constraint on phone column (only for non-null values)
      await queryInterface.addIndex('users', {
        fields: ['phone'],
        unique: true,
        name: 'unique_phone_constraint',
        where: {
          phone: {
            [Sequelize.Op.ne]: null
          }
        }
      });

      console.log('✅ Added unique constraint on phone column');
    } catch (error) {
      console.error('❌ Error adding phone unique constraint:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove the unique constraint
      await queryInterface.removeIndex('users', 'unique_phone_constraint');
      console.log('✅ Removed unique constraint on phone column');
    } catch (error) {
      console.error('❌ Error removing phone unique constraint:', error);
      throw error;
    }
  }
};