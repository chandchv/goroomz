/**
 * Migration to add fields to leads table
 */

'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('leads');
      
      // Add agentId if it doesn't exist (without foreign key constraint for now)
      if (!tableInfo.agentId) {
        await queryInterface.addColumn('leads', 'agentId', {
          type: DataTypes.UUID,
          allowNull: true // Temporarily allow null for existing records
        });
      }

      // Add territoryId if it doesn't exist (without foreign key constraint for now)
      if (!tableInfo.territoryId) {
        await queryInterface.addColumn('leads', 'territoryId', {
          type: DataTypes.UUID,
          allowNull: true
        });
      }

      // Add approvedBy if it doesn't exist (without foreign key constraint for now)
      if (!tableInfo.approvedBy) {
        await queryInterface.addColumn('leads', 'approvedBy', {
          type: DataTypes.UUID,
          allowNull: true
        });
      }

      // Add approvedAt if it doesn't exist
      if (!tableInfo.approvedAt) {
        await queryInterface.addColumn('leads', 'approvedAt', {
          type: DataTypes.DATE,
          allowNull: true
        });
      }

      // Add rejectionReason if it doesn't exist
      if (!tableInfo.rejectionReason) {
        await queryInterface.addColumn('leads', 'rejectionReason', {
          type: DataTypes.TEXT,
          allowNull: true
        });
      }

      // Add createdAt if it doesn't exist
      if (!tableInfo.createdAt) {
        await queryInterface.addColumn('leads', 'createdAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }

      // Add updatedAt if it doesn't exist
      if (!tableInfo.updatedAt) {
        await queryInterface.addColumn('leads', 'updatedAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }

      // Add indexes
      try {
        await queryInterface.addIndex('leads', ['agentId'], {
          name: 'leads_agent_id'
        });
      } catch (err) {
        console.log('Index leads_agent_id may already exist');
      }

      try {
        await queryInterface.addIndex('leads', ['territoryId'], {
          name: 'leads_territory_id'
        });
      } catch (err) {
        console.log('Index leads_territory_id may already exist');
      }

      try {
        await queryInterface.addIndex('leads', ['status'], {
          name: 'leads_status'
        });
      } catch (err) {
        console.log('Index leads_status may already exist');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove indexes
      try {
        await queryInterface.removeIndex('leads', 'leads_agent_id');
      } catch (err) {
        console.log('Index leads_agent_id may not exist');
      }

      try {
        await queryInterface.removeIndex('leads', 'leads_territory_id');
      } catch (err) {
        console.log('Index leads_territory_id may not exist');
      }

      try {
        await queryInterface.removeIndex('leads', 'leads_status');
      } catch (err) {
        console.log('Index leads_status may not exist');
      }

      // Remove columns
      const removeColumnIfExists = async (columnName) => {
        try {
          await queryInterface.removeColumn('leads', columnName);
        } catch (err) {
          if (err.message.includes('does not exist')) {
            console.log(`Column ${columnName} does not exist, skipping`);
          } else {
            throw err;
          }
        }
      };

      await removeColumnIfExists('updatedAt');
      await removeColumnIfExists('createdAt');
      await removeColumnIfExists('rejectionReason');
      await removeColumnIfExists('approvedAt');
      await removeColumnIfExists('approvedBy');
      await removeColumnIfExists('territoryId');
      await removeColumnIfExists('agentId');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};

