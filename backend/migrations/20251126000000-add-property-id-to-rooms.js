'use strict';

/**
 * Migration: Add propertyId to Rooms table
 * 
 * This migration adds a propertyId field to support proper property-room hierarchy.
 * - Properties are Room records with propertyId = NULL
 * - Individual rooms have propertyId pointing to their parent property
 * - Adds unique constraint on (propertyId, roomNumber) to prevent duplicate room numbers within a property
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add propertyId column
      await queryInterface.addColumn('rooms', 'property_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // Add index on propertyId for faster queries
      await queryInterface.addIndex('rooms', ['property_id'], {
        name: 'idx_rooms_property_id',
        transaction
      });

      // Add unique constraint on (propertyId, roomNumber) for rooms that belong to a property
      // This prevents duplicate room numbers within the same property
      await queryInterface.addIndex('rooms', ['property_id', 'room_number'], {
        name: 'unique_room_number_per_property',
        unique: true,
        where: {
          property_id: { [Sequelize.Op.ne]: null }
        },
        transaction
      });

      // Update sharingType enum to include 'quad' and 'dormitory'
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_rooms_sharing_type" ADD VALUE IF NOT EXISTS 'quad';
        ALTER TYPE "enum_rooms_sharing_type" ADD VALUE IF NOT EXISTS 'dormitory';
      `, { transaction });

      await transaction.commit();
      console.log('✅ Successfully added propertyId to rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding propertyId to rooms:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove unique constraint
      await queryInterface.removeIndex('rooms', 'unique_room_number_per_property', { transaction });

      // Remove index
      await queryInterface.removeIndex('rooms', 'idx_rooms_property_id', { transaction });

      // Remove column
      await queryInterface.removeColumn('rooms', 'property_id', { transaction });

      await transaction.commit();
      console.log('✅ Successfully removed propertyId from rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing propertyId from rooms:', error);
      throw error;
    }
  }
};
