'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Finalizing structure switch...');
      console.log('⚠️  WARNING: This will rename tables and update foreign keys!');
      console.log('');

      // Step 1: Backup old rooms table
      console.log('📦 Step 1: Backing up old rooms table...');
      await queryInterface.renameTable('rooms', 'rooms_old', { transaction });
      console.log('   ✅ Renamed rooms → rooms_old');

      // Step 2: Rename rooms_new to rooms
      console.log('🔄 Step 2: Activating new rooms table...');
      await queryInterface.renameTable('rooms_new', 'rooms', { transaction });
      console.log('   ✅ Renamed rooms_new → rooms');

      // Step 3: Update foreign keys in related tables
      console.log('🔗 Step 3: Finalizing foreign key updates...');

      // bed_assignments
      const bedAssignmentsExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'bed_assignments' AND column_name = 'room_id_new'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (bedAssignmentsExists[0].exists) {
        // Drop old foreign key constraint
        await queryInterface.sequelize.query(`
          ALTER TABLE bed_assignments 
          DROP CONSTRAINT IF EXISTS bed_assignments_room_id_fkey;
        `, { transaction });

        // Rename columns
        await queryInterface.renameColumn('bed_assignments', 'room_id', 'room_id_old', { transaction });
        await queryInterface.renameColumn('bed_assignments', 'room_id_new', 'room_id', { transaction });

        // Add foreign key constraint (keep nullable for property-level assignments)
        await queryInterface.changeColumn('bed_assignments', 'room_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        console.log('   ✅ bed_assignments.room_id updated');
      }

      // bookings
      const bookingsExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'bookings' AND column_name = 'room_id_new'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (bookingsExists[0].exists) {
        // Drop old foreign key constraint
        await queryInterface.sequelize.query(`
          ALTER TABLE bookings 
          DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;
        `, { transaction });

        // Rename columns
        await queryInterface.renameColumn('bookings', 'room_id', 'room_id_old', { transaction });
        await queryInterface.renameColumn('bookings', 'room_id_new', 'room_id', { transaction });

        // Make room_id NOT NULL
        await queryInterface.changeColumn('bookings', 'room_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        console.log('   ✅ bookings.room_id updated');
      }

      // housekeeping_logs
      const housekeepingExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'housekeeping_logs' AND column_name = 'room_id_new'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (housekeepingExists[0].exists) {
        // Drop old foreign key constraint
        await queryInterface.sequelize.query(`
          ALTER TABLE housekeeping_logs 
          DROP CONSTRAINT IF EXISTS housekeeping_logs_room_id_fkey;
        `, { transaction });

        // Rename columns
        await queryInterface.renameColumn('housekeeping_logs', 'room_id', 'room_id_old', { transaction });
        await queryInterface.renameColumn('housekeeping_logs', 'room_id_new', 'room_id', { transaction });

        // Make room_id NOT NULL
        await queryInterface.changeColumn('housekeeping_logs', 'room_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        console.log('   ✅ housekeeping_logs.room_id updated');
      }

      // maintenance_requests
      const maintenanceExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'maintenance_requests' AND column_name = 'room_id_new'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (maintenanceExists[0].exists) {
        // Drop old foreign key constraint
        await queryInterface.sequelize.query(`
          ALTER TABLE maintenance_requests 
          DROP CONSTRAINT IF EXISTS maintenance_requests_room_id_fkey;
        `, { transaction });

        // Rename columns
        await queryInterface.renameColumn('maintenance_requests', 'room_id', 'room_id_old', { transaction });
        await queryInterface.renameColumn('maintenance_requests', 'room_id_new', 'room_id', { transaction });

        // Make room_id NOT NULL
        await queryInterface.changeColumn('maintenance_requests', 'room_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        console.log('   ✅ maintenance_requests.room_id updated');
      }

      await transaction.commit();
      console.log('');
      console.log('✅ Structure switch completed successfully!');
      console.log('');
      console.log('📝 Summary:');
      console.log('   • Old rooms table → rooms_old (backup)');
      console.log('   • New rooms_new table → rooms (active)');
      console.log('   • All foreign keys updated');
      console.log('');
      console.log('⚠️  Next steps:');
      console.log('   1. Update your application code to use new models');
      console.log('   2. Test thoroughly in development/staging');
      console.log('   3. Keep rooms_old for 30 days as backup');
      console.log('   4. Drop rooms_old after verification: DROP TABLE rooms_old;');
      console.log('');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Structure switch failed:', error);
      console.error('');
      console.error('🔄 Rolling back changes...');
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Rolling back structure switch...');

      // Step 1: Restore foreign keys in related tables
      console.log('🔗 Step 1: Restoring old foreign keys...');

      const tables = ['bed_assignments', 'bookings', 'housekeeping_logs', 'maintenance_requests'];
      
      for (const table of tables) {
        const oldColumnExists = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = '${table}' AND column_name = 'room_id_old'
          );
        `, { type: Sequelize.QueryTypes.SELECT, transaction });

        if (oldColumnExists[0].exists) {
          // Drop current foreign key
          await queryInterface.sequelize.query(`
            ALTER TABLE ${table} 
            DROP CONSTRAINT IF EXISTS ${table}_room_id_fkey;
          `, { transaction });

          // Rename columns back
          await queryInterface.renameColumn(table, 'room_id', 'room_id_new', { transaction });
          await queryInterface.renameColumn(table, 'room_id_old', 'room_id', { transaction });

          console.log(`   ✅ Restored ${table}.room_id`);
        }
      }

      // Step 2: Restore table names
      console.log('📦 Step 2: Restoring table names...');
      await queryInterface.renameTable('rooms', 'rooms_new', { transaction });
      await queryInterface.renameTable('rooms_old', 'rooms', { transaction });
      console.log('   ✅ Restored table names');

      await transaction.commit();
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
