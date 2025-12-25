'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Starting data migration to new structure...');

      // Step 1: Migrate Properties (rooms where property_id IS NULL)
      console.log('📦 Step 1: Migrating properties from rooms table...');
      
      await queryInterface.sequelize.query(`
        INSERT INTO properties (
          id,
          name,
          description,
          type,
          category_id,
          owner_id,
          location,
          contact_info,
          amenities,
          images,
          rules,
          total_floors,
          total_rooms,
          rating,
          is_active,
          is_featured,
          approval_status,
          approved_at,
          approved_by,
          rejection_reason,
          metadata,
          created_at,
          updated_at
        )
        SELECT 
          r.id,
          r.title as name,
          r.description,
          CASE 
            WHEN r.category::text = 'Hotel Room' THEN 'hotel'::text
            WHEN r.category::text = 'PG' THEN 'pg'::text
            WHEN r.category::text = 'Home Stay' THEN 'homestay'::text
            WHEN r.category::text = 'Independent Home' THEN 'apartment'::text
            ELSE 'hostel'::text
          END::enum_properties_type as type,
          COALESCE(
            (SELECT id FROM categories WHERE name = r.category::text LIMIT 1),
            (SELECT id FROM categories ORDER BY created_at LIMIT 1)
          ) as category_id,
          r.owner_id,
          r.location,
          jsonb_build_object(
            'phone', COALESCE(r.location->>'phone', ''),
            'email', COALESCE(r.location->>'email', '')
          ) as contact_info,
          r.amenities,
          r.images,
          r.rules,
          COALESCE((r.property_details->>'totalFloors')::integer, 1) as total_floors,
          0 as total_rooms,
          r.rating,
          r.is_active,
          r.featured as is_featured,
          r.approval_status::text::enum_properties_approval_status,
          r.approved_at,
          r.approved_by,
          r.rejection_reason,
          r.property_details as metadata,
          r.created_at,
          r.updated_at
        FROM rooms r
        WHERE r.property_id IS NULL
        ON CONFLICT (id) DO NOTHING;
      `, { transaction });

      const propertyCount = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM properties',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      console.log(`   ✅ Migrated ${propertyCount[0].count} properties`);

      // Step 2: Migrate Rooms (rooms where property_id IS NOT NULL)
      console.log('🛏️  Step 2: Migrating rooms from rooms table...');
      
      await queryInterface.sequelize.query(`
        INSERT INTO rooms_new (
          id,
          property_id,
          room_number,
          floor_number,
          name,
          description,
          room_type,
          sharing_type,
          total_beds,
          price,
          pricing_type,
          amenities,
          images,
          current_status,
          is_active,
          last_cleaned_at,
          last_maintenance_at,
          notes,
          metadata,
          created_at,
          updated_at
        )
        SELECT 
          r.id,
          r.property_id,
          COALESCE(r.room_number, 'N/A') as room_number,
          COALESCE(r.floor_number, 0) as floor_number,
          r.title as name,
          r.description,
          CASE 
            WHEN r.room_type = 'Private Room' THEN 'private'::text
            WHEN r.room_type = 'Shared Room' THEN 'shared'::text
            WHEN r.room_type = 'Studio' THEN 'suite'::text
            WHEN r.room_type = 'PG' THEN 'standard'::text
            ELSE 'standard'::text
          END::enum_rooms_new_room_type as room_type,
          CASE 
            WHEN r.sharing_type = 'single' THEN 'single'::text
            WHEN r.sharing_type = '2_sharing' THEN 'double'::text
            WHEN r.sharing_type = '3_sharing' THEN 'triple'::text
            WHEN r.sharing_type = 'quad' THEN 'quad'::text
            WHEN r.sharing_type = 'dormitory' THEN 'dormitory'::text
            ELSE 'single'::text
          END::enum_rooms_new_sharing_type as sharing_type,
          COALESCE(r.total_beds, 1) as total_beds,
          COALESCE(r.price, 0) as price,
          CASE 
            WHEN r.pricing_type = 'monthly' THEN 'per_month'::text
            WHEN r.pricing_type = 'daily' THEN 'per_night'::text
            ELSE 'per_bed'::text
          END::enum_rooms_new_pricing_type as pricing_type,
          r.amenities,
          r.images,
          COALESCE(
            r.current_status::text,
            'vacant_clean'
          )::enum_rooms_new_current_status as current_status,
          r.is_active,
          r.last_cleaned_at,
          r.last_maintenance_at,
          NULL as notes,
          jsonb_build_object(
            'maxGuests', r.max_guests,
            'roomType', r.room_type
          ) as metadata,
          r.created_at,
          r.updated_at
        FROM rooms r
        WHERE r.property_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
      `, { transaction });

      const roomCount = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM rooms_new',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      console.log(`   ✅ Migrated ${roomCount[0].count} rooms`);

      // Step 3: Update total_rooms count in properties
      console.log('🔢 Step 3: Updating room counts in properties...');
      
      await queryInterface.sequelize.query(`
        UPDATE properties p
        SET total_rooms = (
          SELECT COUNT(*)
          FROM rooms_new r
          WHERE r.property_id = p.id
        );
      `, { transaction });

      console.log('   ✅ Room counts updated');

      // Step 4: Update foreign keys in related tables to point to rooms_new
      console.log('🔗 Step 4: Updating foreign keys in related tables...');

      // Check if bed_assignments table exists and has room_id column
      const bedAssignmentsExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'bed_assignments'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (bedAssignmentsExists[0].exists) {
        // Add temporary column
        await queryInterface.addColumn('bed_assignments', 'room_id_new', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms_new',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        // Copy data
        await queryInterface.sequelize.query(`
          UPDATE bed_assignments ba
          SET room_id_new = ba.room_id
          WHERE ba.room_id IN (SELECT id FROM rooms_new);
        `, { transaction });

        console.log('   ✅ bed_assignments.room_id updated');
      }

      // Check if bookings table exists and has room_id column
      const bookingsExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'bookings'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (bookingsExists[0].exists) {
        // Add temporary column
        await queryInterface.addColumn('bookings', 'room_id_new', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms_new',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        // Copy data
        await queryInterface.sequelize.query(`
          UPDATE bookings b
          SET room_id_new = b.room_id
          WHERE b.room_id IN (SELECT id FROM rooms_new);
        `, { transaction });

        console.log('   ✅ bookings.room_id updated');
      }

      // Check if housekeeping_logs table exists
      const housekeepingExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'housekeeping_logs'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (housekeepingExists[0].exists) {
        // Add temporary column
        await queryInterface.addColumn('housekeeping_logs', 'room_id_new', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms_new',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        // Copy data
        await queryInterface.sequelize.query(`
          UPDATE housekeeping_logs hl
          SET room_id_new = hl.room_id
          WHERE hl.room_id IN (SELECT id FROM rooms_new);
        `, { transaction });

        console.log('   ✅ housekeeping_logs.room_id updated');
      }

      // Check if maintenance_requests table exists
      const maintenanceExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'maintenance_requests'
        );
      `, { type: Sequelize.QueryTypes.SELECT, transaction });

      if (maintenanceExists[0].exists) {
        // Add temporary column
        await queryInterface.addColumn('maintenance_requests', 'room_id_new', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'rooms_new',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });

        // Copy data
        await queryInterface.sequelize.query(`
          UPDATE maintenance_requests mr
          SET room_id_new = mr.room_id
          WHERE mr.room_id IN (SELECT id FROM rooms_new);
        `, { transaction });

        console.log('   ✅ maintenance_requests.room_id updated');
      }

      await transaction.commit();
      console.log('✅ Data migration completed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Verify data integrity');
      console.log('   2. Update application code to use new tables');
      console.log('   3. Run migration 20251127000005 to finalize the switch');
      console.log('');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Rolling back data migration...');

      // Remove temporary columns from related tables
      const tables = ['bed_assignments', 'bookings', 'housekeeping_logs', 'maintenance_requests'];
      
      for (const table of tables) {
        const tableExists = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table}'
          );
        `, { type: Sequelize.QueryTypes.SELECT, transaction });

        if (tableExists[0].exists) {
          const columnExists = await queryInterface.sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = '${table}' AND column_name = 'room_id_new'
            );
          `, { type: Sequelize.QueryTypes.SELECT, transaction });

          if (columnExists[0].exists) {
            await queryInterface.removeColumn(table, 'room_id_new', { transaction });
            console.log(`   ✅ Removed room_id_new from ${table}`);
          }
        }
      }

      // Clear migrated data
      await queryInterface.sequelize.query('DELETE FROM rooms_new;', { transaction });
      await queryInterface.sequelize.query('DELETE FROM properties;', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
