'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('rooms_new', {
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
        comment: 'Property this room belongs to'
      },
      room_number: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Room number'
      },
      floor_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Floor number'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Optional room name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Room description'
      },
      room_type: {
        type: Sequelize.ENUM('standard', 'deluxe', 'suite', 'dormitory', 'private', 'shared'),
        allowNull: false,
        defaultValue: 'standard',
        comment: 'Type/category of room'
      },
      sharing_type: {
        type: Sequelize.ENUM('single', 'double', 'triple', 'quad', 'dormitory'),
        allowNull: false,
        defaultValue: 'single',
        comment: 'Sharing configuration'
      },
      total_beds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Total number of beds'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Base price'
      },
      pricing_type: {
        type: Sequelize.ENUM('per_bed', 'per_room', 'per_night', 'per_month'),
        allowNull: false,
        defaultValue: 'per_bed',
        comment: 'How pricing is calculated'
      },
      amenities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Room-specific amenities'
      },
      images: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Room images'
      },
      current_status: {
        type: Sequelize.ENUM('occupied', 'vacant_clean', 'vacant_dirty', 'maintenance', 'blocked'),
        allowNull: false,
        defaultValue: 'vacant_clean',
        comment: 'Current operational status'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether room is active'
      },
      last_cleaned_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last cleaning timestamp'
      },
      last_maintenance_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last maintenance timestamp'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes'
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
    await queryInterface.addIndex('rooms_new', ['property_id'], {
      name: 'rooms_new_property_id_idx'
    });

    await queryInterface.addIndex('rooms_new', ['property_id', 'floor_number'], {
      name: 'rooms_new_property_floor_idx'
    });

    await queryInterface.addIndex('rooms_new', ['current_status'], {
      name: 'rooms_new_current_status_idx'
    });

    await queryInterface.addIndex('rooms_new', ['is_active'], {
      name: 'rooms_new_is_active_idx'
    });

    await queryInterface.addIndex('rooms_new', ['sharing_type'], {
      name: 'rooms_new_sharing_type_idx'
    });

    // Unique constraint on property_id + room_number
    await queryInterface.addConstraint('rooms_new', {
      fields: ['property_id', 'room_number'],
      type: 'unique',
      name: 'rooms_new_unique_room_number_per_property'
    });

    console.log('✅ Rooms_new table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rooms_new');
    console.log('✅ Rooms_new table dropped');
  }
};
