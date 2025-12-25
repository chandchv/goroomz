'use strict';

/**
 * Migration: Add Performance Indexes for Role Segregation
 * 
 * This migration adds additional indexes to optimize queries for the role
 * segregation system, particularly for data scoping operations.
 * 
 * Requirements: All (infrastructure)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Adding performance indexes for role segregation...');
      
      // Check if indexes already exist before creating
      const checkIndex = async (tableName, indexName) => {
        const [results] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = '${tableName}' 
            AND indexname = '${indexName}'
          );
        `, { transaction });
        return results[0].exists;
      };

      // Users table indexes for role-based queries
      if (!await checkIndex('users', 'users_role_internal_role_idx')) {
        await queryInterface.addIndex('users', ['role', 'internal_role'], {
          name: 'users_role_internal_role_idx',
          transaction
        });
        console.log('✅ Added users_role_internal_role_idx');
      }

      if (!await checkIndex('users', 'users_staff_role_active_idx')) {
        await queryInterface.addIndex('users', ['staff_role', 'is_active'], {
          name: 'users_staff_role_active_idx',
          transaction
        });
        console.log('✅ Added users_staff_role_active_idx');
      }

      if (!await checkIndex('users', 'users_territory_internal_role_idx')) {
        await queryInterface.addIndex('users', ['territory_id', 'internal_role'], {
          name: 'users_territory_internal_role_idx',
          transaction
        });
        console.log('✅ Added users_territory_internal_role_idx');
      }

      // Rooms table indexes for property ownership queries
      if (!await checkIndex('rooms', 'rooms_owner_id_idx')) {
        await queryInterface.addIndex('rooms', ['owner_id'], {
          name: 'rooms_owner_id_idx',
          transaction
        });
        console.log('✅ Added rooms_owner_id_idx');
      }

      // Bookings table indexes for scoped queries (using room_id since bookings don't have property_id)
      if (!await checkIndex('bookings', 'bookings_room_id_status_idx')) {
        await queryInterface.addIndex('bookings', ['room_id', 'status'], {
          name: 'bookings_room_id_status_idx',
          transaction
        });
        console.log('✅ Added bookings_room_id_status_idx');
      }

      // Audit logs table indexes for scoped audit queries
      if (!await checkIndex('audit_logs', 'audit_logs_user_id_action_idx')) {
        await queryInterface.addIndex('audit_logs', ['user_id', 'action'], {
          name: 'audit_logs_user_id_action_idx',
          transaction
        });
        console.log('✅ Added audit_logs_user_id_action_idx');
      }
      
      if (!await checkIndex('audit_logs', 'audit_logs_resource_type_id_idx')) {
        await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id'], {
          name: 'audit_logs_resource_type_id_idx',
          transaction
        });
        console.log('✅ Added audit_logs_resource_type_id_idx');
      }

      await transaction.commit();
      console.log('✅ Performance indexes added successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Removing performance indexes...');
      
      // Remove indexes in reverse order
      const indexesToRemove = [
        { table: 'audit_logs', name: 'audit_logs_resource_type_id_idx' },
        { table: 'audit_logs', name: 'audit_logs_user_id_action_idx' },
        { table: 'bookings', name: 'bookings_room_id_status_idx' },
        { table: 'rooms', name: 'rooms_owner_id_idx' },
        { table: 'users', name: 'users_territory_internal_role_idx' },
        { table: 'users', name: 'users_staff_role_active_idx' },
        { table: 'users', name: 'users_role_internal_role_idx' }
      ];

      for (const { table, name } of indexesToRemove) {
        try {
          await queryInterface.removeIndex(table, name, { transaction });
          console.log(`✅ Removed ${name}`);
        } catch (error) {
          console.log(`⚠️  Index ${name} may not exist, skipping...`);
        }
      }
      
      await transaction.commit();
      console.log('✅ Performance indexes removed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
