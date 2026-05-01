/**
 * Migration script to add missing columns to leads table
 * Run with: node scripts/migrateLeadsTable.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function migrateLeadsTable() {
  try {
    console.log('🔄 Starting leads table migration...');
    
    // Check current columns
    const [columns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'leads' AND table_schema = 'public'
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Existing columns:', existingColumns.join(', '));
    
    // Columns to add based on Lead model
    const columnsToAdd = [
      { name: 'pincode', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)` },
      { name: 'landmark', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS landmark VARCHAR(200)` },
      { name: 'notes', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT` },
      { name: 'priority', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'` },
      { name: 'tags', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'` },
      { name: 'frontend_submission_id', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS frontend_submission_id VARCHAR(100) UNIQUE` },
      { name: 'sync_status', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending'` },
      { name: 'last_sync_at', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE` },
      { name: 'sync_error', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS sync_error TEXT` },
      { name: 'property_details', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_details JSONB` },
      { name: 'amenities', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}'` },
      { name: 'images', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'` },
      { name: 'expected_launch_date', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_launch_date TIMESTAMP WITH TIME ZONE` },
      { name: 'submission_date', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()` },
      { name: 'last_contact_date', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE` },
      { name: 'expected_close_date', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date TIMESTAMP WITH TIME ZONE` },
      { name: 'approval_date', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE` },
      { name: 'approved_by', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id)` },
      { name: 'rejection_reason', sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS rejection_reason TEXT` }
    ];
    
    // Add missing columns
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding column: ${col.name}`);
        try {
          await sequelize.query(col.sql);
          console.log(`   ✅ Added ${col.name}`);
        } catch (err) {
          console.log(`   ⚠️ Could not add ${col.name}: ${err.message}`);
        }
      } else {
        console.log(`   ✓ Column ${col.name} already exists`);
      }
    }
    
    // Fix agent_id to allow NULL (it's currently NOT NULL but should be nullable)
    console.log('\n🔧 Fixing agent_id to allow NULL...');
    try {
      await sequelize.query(`ALTER TABLE leads ALTER COLUMN agent_id DROP NOT NULL`);
      console.log('   ✅ agent_id is now nullable');
    } catch (err) {
      console.log(`   ⚠️ Could not modify agent_id: ${err.message}`);
    }
    
    // Fix address to be NOT NULL
    console.log('\n🔧 Ensuring address is NOT NULL...');
    try {
      await sequelize.query(`ALTER TABLE leads ALTER COLUMN address SET NOT NULL`);
      console.log('   ✅ address is now NOT NULL');
    } catch (err) {
      console.log(`   ⚠️ Could not modify address: ${err.message}`);
    }
    
    // Fix estimated_rooms to be NOT NULL
    console.log('\n🔧 Ensuring estimated_rooms is NOT NULL...');
    try {
      await sequelize.query(`UPDATE leads SET estimated_rooms = 1 WHERE estimated_rooms IS NULL`);
      await sequelize.query(`ALTER TABLE leads ALTER COLUMN estimated_rooms SET NOT NULL`);
      console.log('   ✅ estimated_rooms is now NOT NULL');
    } catch (err) {
      console.log(`   ⚠️ Could not modify estimated_rooms: ${err.message}`);
    }
    
    // Create indexes
    console.log('\n📇 Creating indexes...');
    const indexes = [
      { name: 'idx_leads_status_submission', sql: `CREATE INDEX IF NOT EXISTS idx_leads_status_submission ON leads(status, submission_date)` },
      { name: 'idx_leads_agent_status', sql: `CREATE INDEX IF NOT EXISTS idx_leads_agent_status ON leads(agent_id, status)` },
      { name: 'idx_leads_territory_status', sql: `CREATE INDEX IF NOT EXISTS idx_leads_territory_status ON leads(territory_id, status)` },
      { name: 'idx_leads_city_state', sql: `CREATE INDEX IF NOT EXISTS idx_leads_city_state ON leads(city, state)` },
      { name: 'idx_leads_frontend_submission', sql: `CREATE INDEX IF NOT EXISTS idx_leads_frontend_submission ON leads(frontend_submission_id)` },
      { name: 'idx_leads_sync_status', sql: `CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status, last_sync_at)` }
    ];
    
    for (const idx of indexes) {
      try {
        await sequelize.query(idx.sql);
        console.log(`   ✅ Index ${idx.name} created`);
      } catch (err) {
        console.log(`   ⚠️ Could not create index ${idx.name}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Leads table migration completed!');
    
    // Verify final structure
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Final table structure:');
    finalColumns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

migrateLeadsTable()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Migration script failed:', err);
    process.exit(1);
  });
