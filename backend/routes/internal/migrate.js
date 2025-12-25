const express = require('express');
const router = express.Router();
const { sequelize } = require('../../models');
const { protectInternal, requirePlatformRole } = require('../../middleware/internalAuth');

/**
 * POST /api/internal/migrate/add-columns
 * Add missing internal management columns to rooms table
 * Superuser only
 */
router.post('/add-columns',
  protectInternal,
  requirePlatformRole('superuser'),
  async (req, res) => {
    try {
      console.log('🔧 Adding missing columns to rooms table...');
      
      const results = [];
      
      // Create enum types
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_rooms_sharing_type AS ENUM ('single', '2_sharing', '3_sharing', 'quad', 'dormitory');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push('enum_rooms_sharing_type created/exists');
      
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_rooms_current_status AS ENUM ('occupied', 'vacant_clean', 'vacant_dirty');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push('enum_rooms_current_status created/exists');
      
      // Add columns
      const columns = [
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS custom_category_id UUID REFERENCES room_categories(id) ON DELETE SET NULL',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_number INTEGER',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20)',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sharing_type enum_rooms_sharing_type',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS total_beds INTEGER',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_status enum_rooms_current_status DEFAULT \'vacant_clean\'',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_maintenance_at TIMESTAMP WITH TIME ZONE'
      ];
      
      for (const sql of columns) {
        await sequelize.query(sql);
        const columnName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
        results.push(`${columnName} added`);
      }
      
      // Verify
      const [finalColumns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rooms'
        ORDER BY column_name;
      `);
      
      res.json({
        success: true,
        message: 'Migration completed successfully',
        results,
        totalColumns: finalColumns.length,
        newColumns: finalColumns
          .filter(c => ['custom_category_id', 'floor_number', 'room_number', 'sharing_type', 
                       'total_beds', 'current_status', 'last_cleaned_at', 'last_maintenance_at']
                       .includes(c.column_name))
          .map(c => c.column_name)
      });
      
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/internal/migrate/populate-properties
 * Migrate data from old rooms structure to new properties table
 * Superuser only
 */
router.post('/populate-properties',
  protectInternal,
  requirePlatformRole('superuser'),
  async (req, res) => {
    try {
      console.log('🔄 Starting data migration to populate properties table...');
      
      // Check if properties table already has data
      const [existingCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM properties'
      );
      
      if (existingCount[0].count > 0) {
        return res.json({
          success: true,
          message: 'Properties table already has data',
          count: existingCount[0].count,
          skipped: true
        });
      }
      
      // Migrate properties (rooms where property_id IS NULL)
      console.log('📦 Migrating properties from rooms table...');
      
      await sequelize.query(`
        INSERT INTO properties (
          id,
          name,
          description,
          type,
          owner_id,
          location,
          amenities,
          images,
          rules,
          rating,
          is_active,
          approval_status,
          created_at,
          updated_at
        )
        SELECT 
          r.id,
          COALESCE(r.title, 'Property') as name,
          COALESCE(r.description, '') as description,
          CASE 
            WHEN r.category = 'Hotel Room' THEN 'hotel'
            WHEN r.category = 'PG' THEN 'pg'
            WHEN r.category = 'Home Stay' THEN 'homestay'
            WHEN r.category = 'Independent Home' THEN 'apartment'
            ELSE 'hostel'
          END as type,
          r.owner_id,
          r.location,
          r.amenities,
          r.images,
          r.rules,
          r.rating,
          r.is_active,
          r.approval_status,
          r.created_at,
          r.updated_at
        FROM rooms r
        WHERE r.property_id IS NULL
        ON CONFLICT (id) DO NOTHING
      `);
      
      // Get count of migrated properties
      const [newCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM properties'
      );
      
      console.log(`✅ Migrated ${newCount[0].count} properties`);
      
      res.json({
        success: true,
        message: 'Properties table populated successfully',
        propertiesMigrated: newCount[0].count
      });
      
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.stack
      });
    }
  }
);

module.exports = router;
