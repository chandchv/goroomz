'use strict';

/**
 * Fix room_statuses foreign key constraint
 * 
 * The room_statuses table currently has a foreign key pointing to rooms_old.id
 * but it should point to rooms.id since that's where the current room data is.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔧 Fixing room_statuses foreign key constraint...');
      
      // First, check if the constraint exists
      const constraints = await queryInterface.sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'room_statuses' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'room_statuses_room_id_fkey';
      `, { 
        type: Sequelize.QueryTypes.SELECT,
        transaction 
      });
      
      if (constraints.length > 0) {
        console.log('📝 Dropping existing foreign key constraint...');
        await queryInterface.sequelize.query(
          'ALTER TABLE room_statuses DROP CONSTRAINT room_statuses_room_id_fkey;',
          { transaction }
        );
      }
      
      // Add the correct foreign key constraint pointing to rooms table
      console.log('✅ Adding correct foreign key constraint to rooms table...');
      await queryInterface.sequelize.query(`
        ALTER TABLE room_statuses 
        ADD CONSTRAINT room_statuses_room_id_fkey 
        FOREIGN KEY (room_id) 
        REFERENCES rooms(id) 
        ON DELETE CASCADE;
      `, { transaction });
      
      // Verify the constraint was created correctly
      const newConstraints = await queryInterface.sequelize.query(`
        SELECT 
          kcu.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.constraint_column_usage ccu 
          ON kcu.constraint_name = ccu.constraint_name
        WHERE kcu.table_name = 'room_statuses'
        AND kcu.constraint_name = 'room_statuses_room_id_fkey';
      `, { 
        type: Sequelize.QueryTypes.SELECT,
        transaction 
      });
      
      if (newConstraints.length > 0) {
        const constraint = newConstraints[0];
        console.log(`✅ Foreign key constraint created: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      }
      
      await transaction.commit();
      console.log('🎉 Room statuses foreign key constraint fixed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error fixing room statuses foreign key constraint:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Reverting room_statuses foreign key constraint...');
      
      // Drop the current constraint
      await queryInterface.sequelize.query(
        'ALTER TABLE room_statuses DROP CONSTRAINT IF EXISTS room_statuses_room_id_fkey;',
        { transaction }
      );
      
      // Add back the old constraint (pointing to rooms_old)
      // Note: This might fail if rooms_old doesn't exist or doesn't have the referenced data
      await queryInterface.sequelize.query(`
        ALTER TABLE room_statuses 
        ADD CONSTRAINT room_statuses_room_id_fkey 
        FOREIGN KEY (room_id) 
        REFERENCES rooms_old(id) 
        ON DELETE CASCADE;
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ Reverted room statuses foreign key constraint');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error reverting room statuses foreign key constraint:', error);
      throw error;
    }
  }
};