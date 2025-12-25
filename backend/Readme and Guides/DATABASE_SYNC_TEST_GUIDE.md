# Database Sync Test Guide (force:false)

## Overview

This document provides guidance for testing database synchronization with `force:false` to ensure that:
1. The database can sync without dropping existing tables
2. All model associations work correctly
3. No data is lost during sync operations
4. All foreign key constraints are properly configured

## Prerequisites

Before running the sync test, ensure:
- PostgreSQL database is running
- Database credentials in `backend/.env` are correct
- All migrations have been run: `npm run migrate`
- Database has existing data (optional but recommended for thorough testing)

## Running the Sync Test

### Option 1: Automated Test Script

```bash
cd backend
node scripts/testDatabaseSync.js
```

This script will:
- ✅ Test database connection
- ✅ Check existing tables before sync
- ✅ Run sync with `force:false`
- ✅ Verify all tables still exist after sync
- ✅ Verify each model's table exists
- ✅ Test all model associations with sample queries
- ✅ Check for required User table fields (internal role fields)
- ✅ Verify foreign key constraints are working

### Option 2: Manual Testing

If the automated script fails due to database connection issues, you can manually test:

#### Step 1: Start the Backend Server

```bash
cd backend
npm start
```

The server startup will automatically call `syncDatabase(false)` from `models/index.js`.

#### Step 2: Check Server Logs

Look for these success messages:
```
✅ Added missing [field] column to users table
✅ Database synchronized successfully
```

#### Step 3: Verify Tables Exist

Connect to PostgreSQL and run:

```sql
-- List all tables
\dt

-- Should see all these tables:
-- users, rooms, room_types, bookings, categories, room_statuses
-- bed_assignments, payments, payment_schedules, security_deposits
-- maintenance_requests, housekeeping_logs, room_categories
-- internal_roles, leads, lead_communications, commissions
-- territories, agent_targets, support_tickets, ticket_responses
-- property_documents, audit_logs, announcements, notifications
-- alerts, subscriptions, discounts, billing_histories
-- api_keys, api_key_usages
```

#### Step 4: Verify User Table Schema

```sql
-- Check User table has internal role fields
\d users

-- Should include these columns:
-- internalRole (character varying)
-- internalPermissions (jsonb)
-- territoryId (uuid)
-- managerId (uuid)
-- commissionRate (numeric(5,2))
-- isActive (boolean)
-- lastLoginAt (timestamp with time zone)
```

#### Step 5: Test Associations

Run these queries to verify associations work:

```sql
-- Test User -> Room association
SELECT u.id, u.name, COUNT(r.id) as room_count
FROM users u
LEFT JOIN rooms r ON r."ownerId" = u.id
GROUP BY u.id, u.name
LIMIT 5;

-- Test Lead -> User (agent) association
SELECT l.id, l."propertyOwnerName", u.name as agent_name
FROM leads l
LEFT JOIN users u ON l."agentId" = u.id
LIMIT 5;

-- Test Commission -> Lead association
SELECT c.id, c.amount, l."propertyOwnerName"
FROM commissions c
LEFT JOIN leads l ON c."leadId" = l.id
LIMIT 5;

-- Test Territory -> User (regional manager) association
SELECT t.id, t.name as territory_name, u.name as manager_name
FROM territories t
LEFT JOIN users u ON t."regionalManagerId" = u.id
LIMIT 5;
```

## Common Issues and Solutions

### Issue 1: Sync Errors Due to Missing Columns

**Symptom:** Error messages about missing columns during sync

**Solution:** The `ensureSchema()` function in `models/index.js` should automatically add missing columns. If it doesn't:

1. Check the error message for the specific column
2. Create a migration to add the column manually
3. Run the migration before syncing

### Issue 2: Foreign Key Constraint Violations

**Symptom:** Errors about foreign key constraints during sync

**Solution:** 
1. Check that referenced tables exist before tables that reference them
2. Ensure foreign key columns have the correct data type (usually UUID)
3. Verify that foreign key values in existing data are valid

### Issue 3: Association Errors

**Symptom:** Errors like "X is not associated to Y"

**Solution:**
1. Check `models/index.js` for the association definition
2. Verify the `foreignKey` and `as` (alias) match in both directions
3. Ensure the association is defined after both models are loaded

### Issue 4: ENUM Type Conflicts

**Symptom:** Errors about ENUM types during sync

**Solution:**
1. Check if ENUM values have changed in the model
2. Create a migration to alter the ENUM type
3. Use `ALTER TYPE` SQL commands to add/remove ENUM values

## Sync Configuration

The sync is configured in `backend/models/index.js`:

```javascript
const syncDatabase = async (force = false) => {
  try {
    await ensureSchema();
    await sequelize.sync({ force, alter: false });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};
```

**Important Settings:**
- `force: false` - Does NOT drop existing tables
- `alter: false` - Does NOT automatically alter table schemas
- `ensureSchema()` - Manually adds missing columns to User table

## Manual Migration Steps

If automatic sync fails, you may need to manually migrate:

### Adding Missing Columns

```sql
-- Example: Add missing column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "internalRole" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "internalPermissions" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "territoryId" UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "managerId" UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "commissionRate" NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;
```

### Adding Foreign Key Constraints

```sql
-- Example: Add foreign key constraint
ALTER TABLE leads 
ADD CONSTRAINT fk_leads_agent 
FOREIGN KEY ("agentId") REFERENCES users(id) 
ON DELETE SET NULL;

ALTER TABLE leads 
ADD CONSTRAINT fk_leads_territory 
FOREIGN KEY ("territoryId") REFERENCES territories(id) 
ON DELETE SET NULL;
```

### Creating Missing Tables

If a table is missing entirely, you can create it manually or use migrations:

```bash
# Create a new migration
npx sequelize-cli migration:generate --name create-missing-table

# Edit the migration file to create the table
# Then run the migration
npm run migrate
```

## Verification Checklist

After running sync with `force:false`, verify:

- [ ] All existing tables are preserved
- [ ] No data was lost
- [ ] All new tables were created
- [ ] User table has all internal role fields
- [ ] All model associations work (test with queries)
- [ ] Foreign key constraints are enforced
- [ ] Server starts without sync errors
- [ ] API endpoints work correctly

## Testing with Existing Data

To thoroughly test sync with existing data:

1. **Backup the database first:**
   ```bash
   node backend/scripts/backupDatabase.js
   ```

2. **Run the sync test:**
   ```bash
   node backend/scripts/testDatabaseSync.js
   ```

3. **Verify data integrity:**
   - Check record counts before and after
   - Verify foreign key relationships are intact
   - Test that queries return expected results

4. **If issues occur, restore from backup:**
   ```bash
   node backend/scripts/restoreDatabase.js
   ```

## Continuous Integration

For CI/CD pipelines, add this test:

```yaml
# Example GitHub Actions workflow
- name: Test Database Sync
  run: |
    cd backend
    npm run migrate
    node scripts/testDatabaseSync.js
```

## Conclusion

Database sync with `force:false` is critical for production environments where data must be preserved. Always test sync operations in a staging environment before deploying to production.

For any sync issues not covered in this guide, check:
- Sequelize documentation: https://sequelize.org/docs/v6/core-concepts/model-basics/
- PostgreSQL logs for detailed error messages
- `backend/models/index.js` for association definitions
