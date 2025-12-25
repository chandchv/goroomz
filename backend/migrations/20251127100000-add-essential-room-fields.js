'use strict';

/**
 * Migration: Add Essential Room Fields
 * 
 * Adds critical fields needed for room management:
 * - title: Room display name (e.g., "Property Name - Room 101")
 * - description: Room description
 * - price: Room price
 * - max_guests: Maximum number of guests
 * - category: Room category (PG, Hotel Room, etc.)
 * - room_type: Type of room
 * - pricing_type: daily or monthly pricing
 * - location: Room location (JSONB)
 * - amenities: Room amenities (array)
 * - rules: Room rules (array)
 * - images: Room images (JSONB)
 * - approval_status: Approval status
 * - approved_at: Approval timestamp
 * - approved_by: User who approved
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Adding essential room fields to rooms table...');

      const tableDescription = await queryInterface.describeTable('rooms');
      
      // Add title column
      if (!tableDescription.title) {
        await queryInterface.addColumn('rooms', 'title', {
          type: Sequelize.STRING(200),
          allowNull: true,
          comment: 'Room display name'
        }, { transaction });
      }

      // Add description column
      if (!tableDescription.description) {
        await queryInterface.addColumn('rooms', 'description', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Room description'
        }, { transaction });
      }

      // Add price column
      if (!tableDescription.price) {
        await queryInterface.addColumn('rooms', 'price', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Room price'
        }, { transaction });
      }

      // Add max_guests column
      if (!tableDescription.max_guests) {
        await queryInterface.addColumn('rooms', 'max_guests', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1,
          comment: 'Maximum number of guests'
        }, { transaction });
      }

      // Add category enum
      if (!tableDescription.category) {
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_category AS ENUM ('PG', 'Hotel Room', 'Independent Home', 'Home Stay');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'category', {
          type: Sequelize.ENUM('PG', 'Hotel Room', 'Independent Home', 'Home Stay'),
          allowNull: true,
          comment: 'Room category'
        }, { transaction });
      }

      // Add room_type enum
      if (!tableDescription.room_type) {
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_room_type AS ENUM ('Private Room', 'Shared Room', 'Entire Place', 'Studio', 'Hotel Room', 'PG');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'room_type', {
          type: Sequelize.ENUM('Private Room', 'Shared Room', 'Entire Place', 'Studio', 'Hotel Room', 'PG'),
          allowNull: true,
          comment: 'Type of room'
        }, { transaction });
      }

      // Add pricing_type enum
      if (!tableDescription.pricing_type) {
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_pricing_type AS ENUM ('daily', 'monthly');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'pricing_type', {
          type: Sequelize.ENUM('daily', 'monthly'),
          allowNull: true,
          comment: 'Pricing type'
        }, { transaction });
      }

      // Add location column (JSONB)
      if (!tableDescription.location) {
        await queryInterface.addColumn('rooms', 'location', {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Room location details'
        }, { transaction });
      }

      // Add amenities column (array)
      if (!tableDescription.amenities) {
        await queryInterface.addColumn('rooms', 'amenities', {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: [],
          comment: 'Room amenities'
        }, { transaction });
      }

      // Add rules column (array)
      if (!tableDescription.rules) {
        await queryInterface.addColumn('rooms', 'rules', {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: [],
          comment: 'Room rules'
        }, { transaction });
      }

      // Add images column (JSONB)
      if (!tableDescription.images) {
        await queryInterface.addColumn('rooms', 'images', {
          type: Sequelize.JSONB,
          defaultValue: [],
          comment: 'Room images'
        }, { transaction });
      }

      // Add approval_status enum
      if (!tableDescription.approval_status) {
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE enum_rooms_approval_status AS ENUM ('pending', 'approved', 'rejected');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('rooms', 'approval_status', {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          allowNull: true,
          defaultValue: 'approved',
          comment: 'Approval status'
        }, { transaction });
      }

      // Add approved_at column
      if (!tableDescription.approved_at) {
        await queryInterface.addColumn('rooms', 'approved_at', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Approval timestamp'
        }, { transaction });
      }

      // Add approved_by column
      if (!tableDescription.approved_by) {
        await queryInterface.addColumn('rooms', 'approved_by', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User who approved the room'
        }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Successfully added essential room fields to rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding essential room fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeColumn('rooms', 'approved_by', { transaction });
      await queryInterface.removeColumn('rooms', 'approved_at', { transaction });
      await queryInterface.removeColumn('rooms', 'approval_status', { transaction });
      await queryInterface.removeColumn('rooms', 'images', { transaction });
      await queryInterface.removeColumn('rooms', 'rules', { transaction });
      await queryInterface.removeColumn('rooms', 'amenities', { transaction });
      await queryInterface.removeColumn('rooms', 'location', { transaction });
      await queryInterface.removeColumn('rooms', 'pricing_type', { transaction });
      await queryInterface.removeColumn('rooms', 'room_type', { transaction });
      await queryInterface.removeColumn('rooms', 'category', { transaction });
      await queryInterface.removeColumn('rooms', 'max_guests', { transaction });
      await queryInterface.removeColumn('rooms', 'price', { transaction });
      await queryInterface.removeColumn('rooms', 'description', { transaction });
      await queryInterface.removeColumn('rooms', 'title', { transaction });

      await transaction.commit();
      console.log('✅ Successfully removed essential room fields from rooms table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing essential room fields:', error);
      throw error;
    }
  }
};
