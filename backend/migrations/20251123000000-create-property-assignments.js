'use strict';

/**
 * Migration: Create PropertyAssignments Table
 * 
 * This migration creates the property_assignments table for tracking
 * user-property assignments (agents, staff, managers).
 * 
 * Requirements: 3.3, 7.1, 7.4
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Creating property_assignments table...');
      
      await queryInterface.createTable('property_assignments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        propertyId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'rooms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        assignmentType: {
          type: Sequelize.ENUM('agent', 'staff', 'manager'),
          allowNull: false
        },
        assignedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        assignedBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Add indexes for performance
      console.log('Adding indexes to property_assignments table...');
      
      await queryInterface.addIndex('property_assignments', ['user_id'], {
        name: 'property_assignments_user_id_idx',
        transaction
      });

      await queryInterface.addIndex('property_assignments', ['property_id'], {
        name: 'property_assignments_property_id_idx',
        transaction
      });

      await queryInterface.addIndex('property_assignments', ['assignment_type'], {
        name: 'property_assignments_assignment_type_idx',
        transaction
      });

      await queryInterface.addIndex('property_assignments', ['is_active'], {
        name: 'property_assignments_is_active_idx',
        transaction
      });

      // Composite index for common queries
      await queryInterface.addIndex('property_assignments', ['user_id', 'property_id', 'is_active'], {
        name: 'property_assignments_user_property_active_idx',
        transaction
      });

      // Composite index for filtering by type and status
      await queryInterface.addIndex('property_assignments', ['assignment_type', 'is_active'], {
        name: 'property_assignments_type_active_idx',
        transaction
      });

      await transaction.commit();
      console.log('✅ property_assignments table created successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Dropping property_assignments table...');
      
      await queryInterface.dropTable('property_assignments', { transaction });
      
      await transaction.commit();
      console.log('✅ property_assignments table dropped successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
