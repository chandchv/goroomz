const { sequelize } = require('../config/database');

async function runMigration() {
  try {
    // Check if table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_assignments'
      );
    `);
    
    if (results[0].exists) {
      console.log('✅ property_assignments table already exists');
      await sequelize.close();
      return;
    }

    console.log('Creating property_assignments table...');
    
    // Create the table
    await sequelize.query(`
      CREATE TABLE property_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        property_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
        assignment_type VARCHAR(255) NOT NULL CHECK (assignment_type IN ('agent', 'staff', 'manager')),
        assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        assigned_by UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Adding indexes...');
    
    // Add indexes
    await sequelize.query('CREATE INDEX property_assignments_user_id_idx ON property_assignments(user_id);');
    await sequelize.query('CREATE INDEX property_assignments_property_id_idx ON property_assignments(property_id);');
    await sequelize.query('CREATE INDEX property_assignments_assignment_type_idx ON property_assignments(assignment_type);');
    await sequelize.query('CREATE INDEX property_assignments_is_active_idx ON property_assignments(is_active);');
    await sequelize.query('CREATE INDEX property_assignments_user_property_active_idx ON property_assignments(user_id, property_id, is_active);');
    await sequelize.query('CREATE INDEX property_assignments_type_active_idx ON property_assignments(assignment_type, is_active);');

    // Mark migration as complete
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20251123000000-create-property-assignments.js')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ property_assignments table created successfully!');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
