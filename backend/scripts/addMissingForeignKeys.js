/**
 * Script to add missing foreign key constraints
 * 
 * This script checks which foreign key constraints are actually missing
 * and adds only those that don't exist yet.
 */

const { sequelize } = require('../config/database');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function addMissingForeignKeys() {
  log('\n' + '='.repeat(80), 'cyan');
  log('ADDING MISSING FOREIGN KEY CONSTRAINTS', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  try {
    // Get all existing foreign key constraints
    const [existingConstraints] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    log(`Found ${existingConstraints.length} existing foreign key constraints\n`, 'cyan');

    // Define the constraints we want to add
    const desiredConstraints = [
      {
        table: 'alerts',
        column: 'created_for',
        refTable: 'users',
        refColumn: 'id',
        name: 'alerts_created_for_fkey',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        table: 'discounts',
        column: 'property_owner_id',
        refTable: 'users',
        refColumn: 'id',
        name: 'discounts_property_owner_id_fkey',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        table: 'billing_history',
        column: 'subscription_id',
        refTable: 'subscriptions',
        refColumn: 'id',
        name: 'billing_history_subscription_id_fkey',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        table: 'api_keys',
        column: 'created_by',
        refTable: 'users',
        refColumn: 'id',
        name: 'api_keys_created_by_fkey',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      {
        table: 'api_key_usage',
        column: 'api_key_id',
        refTable: 'api_keys',
        refColumn: 'id',
        name: 'api_key_usage_api_key_id_fkey',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    ];

    let added = 0;
    let skipped = 0;

    for (const constraint of desiredConstraints) {
      // Check if constraint already exists
      const exists = existingConstraints.some(c =>
        c.table_name === constraint.table &&
        c.column_name === constraint.column &&
        c.foreign_table_name === constraint.refTable &&
        c.foreign_column_name === constraint.refColumn
      );

      if (exists) {
        log(`⏭️  Skipping ${constraint.table}.${constraint.column} → ${constraint.refTable}.${constraint.refColumn} (already exists)`, 'yellow');
        skipped++;
        continue;
      }

      // Add the constraint
      try {
        log(`Adding ${constraint.table}.${constraint.column} → ${constraint.refTable}.${constraint.refColumn}...`, 'cyan');
        
        await sequelize.query(`
          ALTER TABLE "${constraint.table}"
          ADD CONSTRAINT "${constraint.name}"
          FOREIGN KEY ("${constraint.column}")
          REFERENCES "${constraint.refTable}" ("${constraint.refColumn}")
          ON UPDATE ${constraint.onUpdate}
          ON DELETE ${constraint.onDelete};
        `);

        log(`✅ Added ${constraint.name}`, 'green');
        added++;
      } catch (error) {
        log(`❌ Error adding ${constraint.name}: ${error.message}`, 'red');
      }
    }

    log('\n' + '='.repeat(80), 'cyan');
    log('SUMMARY', 'cyan');
    log('='.repeat(80), 'cyan');
    log(`\nConstraints added: ${added}`, added > 0 ? 'green' : 'reset');
    log(`Constraints skipped: ${skipped}`, 'yellow');
    log(`Total processed: ${desiredConstraints.length}\n`, 'bright');

    if (added > 0) {
      log('✅ Foreign key constraints have been added successfully!', 'green');
    } else {
      log('ℹ️  All foreign key constraints already exist.', 'cyan');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  addMissingForeignKeys()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to add foreign keys:', error);
      process.exit(1);
    });
}

module.exports = { addMissingForeignKeys };
