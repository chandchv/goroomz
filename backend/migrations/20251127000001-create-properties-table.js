'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('properties', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('hotel', 'pg', 'hostel', 'homestay', 'apartment'),
        allowNull: false,
        comment: 'Type of property'
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Category this property belongs to'
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Property owner user ID'
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Full address with coordinates'
      },
      contact_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Contact information'
      },
      amenities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Property-level amenities'
      },
      images: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Property images'
      },
      rules: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Property rules and policies'
      },
      total_floors: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Total number of floors'
      },
      total_rooms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Total number of rooms'
      },
      check_in_time: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '12:00:00',
        comment: 'Standard check-in time'
      },
      check_out_time: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '11:00:00',
        comment: 'Standard check-out time'
      },
      rating: {
        type: Sequelize.JSONB,
        defaultValue: { average: 0, count: 0 },
        comment: 'Property rating'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether property is active'
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether property is featured'
      },
      approval_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Property approval status'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When property was approved'
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who approved'
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for rejection'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata'
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
    await queryInterface.addIndex('properties', ['name'], {
      name: 'properties_name_idx'
    });

    await queryInterface.addIndex('properties', ['type'], {
      name: 'properties_type_idx'
    });

    await queryInterface.addIndex('properties', ['category_id'], {
      name: 'properties_category_id_idx'
    });

    await queryInterface.addIndex('properties', ['owner_id'], {
      name: 'properties_owner_id_idx'
    });

    await queryInterface.addIndex('properties', ['is_active'], {
      name: 'properties_is_active_idx'
    });

    await queryInterface.addIndex('properties', ['approval_status'], {
      name: 'properties_approval_status_idx'
    });

    // GIN index for JSONB location field
    await queryInterface.sequelize.query(
      'CREATE INDEX properties_location_idx ON properties USING gin (location);'
    );

    console.log('✅ Properties table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('properties');
    console.log('✅ Properties table dropped');
  }
};
