# Database Migrations Guide

## Current Setup

### What Happens on Server Restart

Currently, the server automatically runs `syncDatabase(false)` on every restart:
- **`force: false`** - Does NOT drop/recreate tables (preserves all data)
- **`alter: false`** - Does NOT alter existing tables
- **Only creates tables** if they don't exist

**This is safe** - your data will not be lost. The sync only ensures the schema exists.

### Manual Migration Scripts

You have manual migration scripts in `backend/migrations/`:
- `add-lead-fields.js`
- `add-internal-role-fields.js`
- `fix-payment-schedule-status.js`

These need to be run manually when needed.

## Using Sequelize CLI Migrations (Recommended)

### Setup (First Time)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a new migration:**
   ```bash
   npm run migration:create -- add-new-column
   ```

3. **Edit the migration file** in `backend/migrations/XXXXXX-add-new-column.js`

### Running Migrations

1. **Run all pending migrations:**
   ```bash
   npm run migrate
   ```

2. **Check migration status:**
   ```bash
   npm run migrate:status
   ```

3. **Rollback last migration:**
   ```bash
   npm run migrate:undo
   ```

### Example Migration File

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new column
    await queryInterface.addColumn('users', 'new_field', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove column (for rollback)
    await queryInterface.removeColumn('users', 'new_field');
  }
};
```

## Best Practices

### Development
- Use migrations for schema changes
- The server's auto-sync will still create tables if missing
- Migrations are tracked in `SequelizeMeta` table

### Production
- **Always run migrations manually** before deployment
- Use `npm run migrate` to apply pending migrations
- Keep migrations small and reversible
- Test rollback (`migrate:undo`) before deploying

## Database Initialization on Restart

**Current behavior:**
- Server calls `syncDatabase(false)` automatically
- Safe for production (doesn't alter existing tables)
- Only creates missing tables

**You can disable auto-sync** if you prefer to use only migrations:

```javascript
// In server.js, comment out or modify:
// await syncDatabase(false);  // Disable auto-sync
// Then rely solely on migrations
```

## Migration vs Sync

| Feature | Sync (`syncDatabase`) | Migrations |
|---------|----------------------|------------|
| **Purpose** | Ensure schema exists | Track schema changes |
| **Data Safety** | Safe (won't drop) | Safe (tracked) |
| **Production** | Auto-runs on startup | Manual execution |
| **Tracking** | Not tracked | Tracked in DB |
| **Rollback** | No | Yes (`migrate:undo`) |
| **Best For** | Development/Quick setup | Production/Version control |

## Recommended Workflow

1. **Development:**
   - Use auto-sync for quick iteration
   - Create migrations for important changes

2. **Production:**
   - Disable auto-sync in production
   - Run migrations manually: `npm run migrate`
   - Track all schema changes via migrations

