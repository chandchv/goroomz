const { sequelize } = require('../models');

async function markMigrationComplete() {
  try {
    await sequelize.query(
      `INSERT INTO "SequelizeMeta" (name) VALUES ('20251120000000-add-internal-roles.js')`
    );
    console.log('✓ Migration 20251120000000-add-internal-roles.js marked as complete');
    process.exit(0);
  } catch (error) {
    console.error('Error marking migration as complete:', error.message);
    process.exit(1);
  }
}

markMigrationComplete();
