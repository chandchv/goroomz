'use strict';

/**
 * Migration to add missing foreign key constraints
 * 
 * This migration adds the 6 missing foreign key constraints identified
 * by the database health check script.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding missing foreign key constraints...');

    const addConstraintIfNotExists = async (tableName, constraintName, constraintConfig) => {
      try {
        // Check if constraint already exists
        const [results] = await queryInterface.sequelize.query(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = '${tableName}' 
          AND constraint_name = '${constraintName}'
          AND constraint_type = 'FOREIGN KEY'
        `);
        
        if (results.length > 0) {
          console.log(`⏭️  Skipping ${constraintName} - already exists`);
          return;
        }
        
        console.log(`Adding FK: ${constraintName}`);
        await queryInterface.addConstraint(tableName, constraintConfig);
      } catch (error) {
        console.error(`❌ Error adding ${constraintName}:`, error.message);
        throw error;
      }
    };

    try {
      // 1. Add foreign key for housekeeping_logs.cleaned_by → users.id
      await addConstraintIfNotExists('housekeeping_logs', 'housekeeping_logs_cleaned_by_fkey', {
        fields: ['cleaned_by'],
        type: 'foreign key',
        name: 'housekeeping_logs_cleaned_by_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // 2. Skip alerts.created_for - column doesn't exist in model
      // The Alert model uses ownerId and resolvedBy instead
      console.log('⏭️  Skipping alerts.created_for - column not in model definition');

      // 3. Skip discounts.property_owner_id - column doesn't exist in model
      // The Discount model uses createdBy instead
      console.log('⏭️  Skipping discounts.property_owner_id - column not in model definition');

      // 4. Add foreign key for billing_histories.subscription_id → subscriptions.id
      await addConstraintIfNotExists('billing_history', 'billing_history_subscription_id_fkey', {
        fields: ['subscription_id'],
        type: 'foreign key',
        name: 'billing_history_subscription_id_fkey',
        references: {
          table: 'subscriptions',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // 5. Add foreign key for api_keys.created_by → users.id
      await addConstraintIfNotExists('api_keys', 'api_keys_created_by_fkey', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'api_keys_created_by_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // 6. Add foreign key for api_key_usage.api_key_id → api_keys.id
      await addConstraintIfNotExists('api_key_usage', 'api_key_usage_api_key_id_fkey', {
        fields: ['api_key_id'],
        type: 'foreign key',
        name: 'api_key_usage_api_key_id_fkey',
        references: {
          table: 'api_keys',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      console.log('✅ All foreign key constraints processed successfully');
    } catch (error) {
      console.error('❌ Error adding foreign key constraints:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing foreign key constraints...');

    try {
      // Remove constraints in reverse order
      await queryInterface.removeConstraint('api_key_usage', 'api_key_usage_api_key_id_fkey');
      await queryInterface.removeConstraint('api_keys', 'api_keys_created_by_fkey');
      await queryInterface.removeConstraint('billing_history', 'billing_history_subscription_id_fkey');
      await queryInterface.removeConstraint('discounts', 'discounts_property_owner_id_fkey');
      await queryInterface.removeConstraint('alerts', 'alerts_created_for_fkey');
      await queryInterface.removeConstraint('housekeeping_logs', 'housekeeping_logs_cleaned_by_fkey');

      console.log('✅ All foreign key constraints removed successfully');
    } catch (error) {
      console.error('❌ Error removing foreign key constraints:', error.message);
      throw error;
    }
  }
};
