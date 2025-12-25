'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('property_staff', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      property_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'properties',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Property where staff member works'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Staff member user ID'
      },
      role: {
        type: Sequelize.ENUM(
          'manager',
          'receptionist',
          'housekeeping',
          'maintenance',
          'security',
          'cook',
          'accountant',
          'other'
        ),
        allowNull: false,
        comment: 'Staff role at the property'
      },
      permissions: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Staff permissions'
      },
      salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monthly salary'
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When staff member joined'
      },
      left_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When staff member left'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether staff member is active'
      },
      work_schedule: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Work schedule'
      },
      contact_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Emergency contact info'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('property_staff', ['property_id'], {
      name: 'property_staff_property_id_idx'
    });

    await queryInterface.addIndex('property_staff', ['user_id'], {
      name: 'property_staff_user_id_idx'
    });

    await queryInterface.addIndex('property_staff', ['role'], {
      name: 'property_staff_role_idx'
    });

    await queryInterface.addIndex('property_staff', ['is_active'], {
      name: 'property_staff_is_active_idx'
    });

    // Unique constraint on property_id + user_id
    await queryInterface.addConstraint('property_staff', {
      fields: ['property_id', 'user_id'],
      type: 'unique',
      name: 'unique_staff_per_property'
    });

    console.log('✅ Property_staff table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('property_staff');
    console.log('✅ Property_staff table dropped');
  }
};
