const { sequelize } = require('../models');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to rooms table...\n');
    
    // Check current table structure
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms'
      ORDER BY column_name;
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Existing columns:', existingColumns.length);
    
    const columnsToAdd = [
      {
        name: 'custom_category_id',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS custom_category_id UUID REFERENCES room_categories(id) ON DELETE SET NULL;`
      },
      {
        name: 'floor_number',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_number INTEGER;`
      },
      {
        name: 'room_number',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);`
      },
      {
        name: 'total_beds',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS total_beds INTEGER;`
      },
      {
        name: 'last_cleaned_at',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMP WITH TIME ZONE;`
      },
      {
        name: 'last_maintenance_at',
        sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_maintenance_at TIMESTAMP WITH TIME ZONE;`
      }
    ];
    
    // Add enum types first
    console.log('\n📦 Creating enum types...');
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_rooms_sharing_type AS ENUM ('single', '2_sharing', '3_sharing', 'quad', 'dormitory');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ enum_rooms_sharing_type created/exists');
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_rooms_current_status AS ENUM ('occupied', 'vacant_clean', 'vacant_dirty');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ enum_rooms_current_status created/exists');
    
    // Add enum columns
    await sequelize.query(`
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sharing_type enum_rooms_sharing_type;
    `);
    console.log('✅ sharing_type column added');
    
    await sequelize.query(`
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_status enum_rooms_current_status DEFAULT 'vacant_clean';
    `);
    console.log('✅ current_status column added');
    
    // Add other columns
    console.log('\n📦 Adding columns...');
    for (const column of columnsToAdd) {
      try {
        await sequelize.query(column.sql);
        console.log(`✅ ${column.name} added`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${column.name} already exists`);
        } else {
          console.error(`❌ Failed to add ${column.name}:`, error.message);
        }
      }
    }
    
    // Verify final structure
    const [finalColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms'
      ORDER BY column_name;
    `);
    
    console.log('\n✅ Migration complete!');
    console.log(`📊 Total columns now: ${finalColumns.length}`);
    
    const newColumns = finalColumns.filter(c => 
      ['custom_category_id', 'floor_number', 'room_number', 'sharing_type', 
       'total_beds', 'current_status', 'last_cleaned_at', 'last_maintenance_at']
      .includes(c.column_name)
    );
    
    console.log('\n📋 Internal management columns:');
    newColumns.forEach(c => console.log(`   - ${c.column_name}`));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

addMissingColumns();
