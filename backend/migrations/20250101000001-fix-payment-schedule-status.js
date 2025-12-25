/**
 * Migration to add status column to payment_schedules table
 * This fixes the error: column "status" does not exist
 */

'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if status column exists
      const tableDescription = await queryInterface.describeTable('payment_schedules');
      
      if (!tableDescription.status) {
        console.log('Adding status column to payment_schedules table...');
        
        // Add status column
        await queryInterface.addColumn(
          'payment_schedules',
          'status',
          {
            type: Sequelize.ENUM('pending', 'paid', 'overdue'),
            allowNull: false,
            defaultValue: 'pending'
          },
          { transaction }
        );
        
        console.log('✓ Status column added successfully');
        
        // Add index on status column
        await queryInterface.addIndex(
          'payment_schedules',
          ['status'],
          {
            name: 'payment_schedules_status',
            transaction
          }
        );
        
        console.log('✓ Index on status column created successfully');
      } else {
        console.log('Status column already exists, skipping...');
      }
      
      await transaction.commit();
      console.log('✓ Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove index
      await queryInterface.removeIndex(
        'payment_schedules',
        'payment_schedules_status',
        { transaction }
      );
      
      // Remove column
      await queryInterface.removeColumn(
        'payment_schedules',
        'status',
        { transaction }
      );
      
      await transaction.commit();
      console.log('✓ Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};

