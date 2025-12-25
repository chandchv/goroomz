/**
 * Migration script to add internal role management fields to User model
 * Sequelize CLI migration format
 */

'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Starting migration: Adding internal role fields to users table...');
      
      // Check if users table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('users')) {
        console.log('⚠️  users table does not exist yet. Run database sync first.');
        return;
      }

      const userTable = await queryInterface.describeTable('users');
      
      // Helper function to add column if it doesn't exist
      const addColumnIfMissing = async (columnName, definition, successMessage) => {
        if (userTable[columnName]) {
          console.log(`ℹ️  Column ${columnName} already exists, skipping.`);
          return;
        }
        try {
          await queryInterface.addColumn('users', columnName, definition);
          console.log(successMessage);
        } catch (error) {
          if (error?.original?.code === '42701') {
            console.log(`ℹ️  Column ${columnName} already exists (caught duplicate error), skipping.`);
          } else {
            throw error;
          }
        }
      };

      // Add internalRole ENUM
      await addColumnIfMissing('internalRole', {
        type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
        allowNull: true
      }, '✅ Added internalRole column');

      // Add internalPermissions JSONB
      await addColumnIfMissing('internalPermissions', {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          canOnboardProperties: false,
          canApproveOnboardings: false,
          canManageAgents: false,
          canAccessAllProperties: false,
          canManageSystemSettings: false,
          canViewAuditLogs: false,
          canManageCommissions: false,
          canManageTerritories: false,
          canManageTickets: false,
          canBroadcastAnnouncements: false
        }
      }, '✅ Added internalPermissions column');

      // Add territoryId
      await addColumnIfMissing('territoryId', {
        type: DataTypes.UUID,
        allowNull: true
      }, '✅ Added territoryId column');

      // Add managerId
      await addColumnIfMissing('managerId', {
        type: DataTypes.UUID,
        allowNull: true
      }, '✅ Added managerId column');

      // Add commissionRate
      await addColumnIfMissing('commissionRate', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      }, '✅ Added commissionRate column');

      // Check if isActive already exists (it might from other features)
      if (!userTable['isActive']) {
        await addColumnIfMissing('isActive', {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false
        }, '✅ Added isActive column');
      } else {
        console.log('ℹ️  Column isActive already exists, skipping.');
      }

      // Add lastLoginAt
      await addColumnIfMissing('lastLoginAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, '✅ Added lastLoginAt column');

      console.log('✅ Migration completed successfully!');
      console.log('📝 Summary: Added internal role management fields to users table');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Rolling back: Removing internal role fields from users table...');
      
      // Remove columns (if they exist)
      const removeColumnIfExists = async (columnName) => {
        try {
          await queryInterface.removeColumn('users', columnName);
          console.log(`✅ Removed ${columnName} column`);
        } catch (error) {
          if (error?.message?.includes('does not exist')) {
            console.log(`ℹ️  Column ${columnName} does not exist, skipping.`);
          } else {
            throw error;
          }
        }
      };

      await removeColumnIfExists('lastLoginAt');
      await removeColumnIfExists('isActive');
      await removeColumnIfExists('commissionRate');
      await removeColumnIfExists('managerId');
      await removeColumnIfExists('territoryId');
      await removeColumnIfExists('internalPermissions');
      await removeColumnIfExists('internalRole');

      console.log('✅ Rollback completed successfully!');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

