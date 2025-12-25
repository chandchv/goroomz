const { sequelize } = require('../config/database');

async function checkBedAssignmentsTable() {
  try {
    console.log('🔍 Checking bed_assignments table structure...\n');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'bed_assignments'
      ORDER BY ordinal_position;
    `);

    console.log('Columns in bed_assignments table:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Check constraints
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'bed_assignments';
    `);

    console.log('\nConstraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.constraint_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBedAssignmentsTable();
