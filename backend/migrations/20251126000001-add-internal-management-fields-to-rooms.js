'use strict';

/**
 * Migration: Add Internal Management Fields to Rooms
 * 
 * Adds fields needed for internal property management:
 * - custom_category_id: Link to custom room categories
 * - floor_number: Floor location of the room
 * - room_number: Room identifier within the property
 * - sharing_type: Type of room sharing
 * - total_beds: Number of beds in the room
 * - current_status: Current occupancy status
 * - last_cleaned_at: Last cleaning timestamp
 * - last_maintenance_at: Last maintenance timestamp
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Adding internal management fields to rooms table...');

      // Check if columns already exist before adding
      const tableDescription = await queryInterface.describeTable('rooms');
      
      if (!tableDescription.custom_category_id) {
        await queryInterface.addColumn('rooms', 'custom_category_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'room_categories',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      if (!tableDescription.floor_number) {
        await queryInterface.addColumn('rooms', 'floor_number', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.room_number) {
        await queryInterface.addColumn('rooms', 'room_number', {
          type: Sequelize.STRING(20),
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.sharing_type) {
        // Create enum type if it doesn't exist
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_sharing_type AS ENUM ('single', '2_sharing', '3_sharing', 'quad', 'dormitory');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'sharing_type', {
          type: Sequelize.ENUM('single', '2_sharing', '3_sharing', 'quad', 'dormitory'),
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.total_beds) {
        await queryInterface.addColumn('rooms', 'total_beds', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.current_status) {
        // Create enum type if it doesn't exist
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_current_status AS ENUM ('occupied', 'vacant_clean', 'vacant_dirty');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'current_status', {
          type: Sequelize.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
          allowNull: true,
          defaultValue: 'vacant_clean'
        }, { transaction });
      }

      if (!tableDescription.last_cleaned_at) {
        await queryInterface.addColumn('rooms', 'last_cleaned_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.last_maintenance_at) {
        await queryInterface.addColumn('rooms', 'last_maintenance_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Successfully added internal management fields to rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding internal management fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeColumn('rooms', 'last_maintenance_at', { transaction });
      await queryInterface.removeColumn('rooms', 'last_cleaned_at', { transaction });
      await queryInterface.removeColumn('rooms', 'current_status', { transaction });
      await queryInterface.removeColumn('rooms', 'total_beds', { transaction });
      await queryInterface.removeColumn('rooms', 'sharing_type', { transaction });
      await queryInterface.removeColumn('rooms', 'room_number', { transaction });
      await queryInterface.removeColumn('rooms', 'floor_number', { transaction });
      await queryInterface.removeColumn('rooms', 'custom_category_id', { transaction });

      await transaction.commit();
      console.log('✅ Successfully removed internal management fields from rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing internal management fields:', error);
      throw error;
    }
  }
};
