'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'assigned_property_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'rooms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for performance
    await queryInterface.addIndex('users', ['assigned_property_id'], {
      name: 'users_assigned_property_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'users_assigned_property_id_idx');
    await queryInterface.removeColumn('users', 'assigned_property_id');
  }
};
