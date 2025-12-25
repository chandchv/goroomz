# Database Restructure Migration Guide

## Overview

This guide walks you through migrating your database from the old structure (where `rooms` table represented both properties and rooms) to the new proper hierarchical structure (separate `properties`, `rooms`, and `property_staff` tables).

## Prerequisites

Before starting the migration:

1. ✅ **Backup your database**
   ```bash
   # PostgreSQL backup
   pg_dump -U your_username -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. ✅ **Test on development/staging first**
   - Never run migrations directly on production without testing
   - Verify the migration works on a copy of your production data

3. ✅ **Review migration files**
   - Read through each migration file in `backend/migrations/`
   - Understand what changes will be made

4. ✅ **Schedule maintenance window**
   - Plan for downtime during migration
   - Notify users if necessary

## Migration Files

The migration consists of 5 files that run in sequence:

1. **20251127000001-create-properties-table.js**
   - Creates the `properties` table
   - Adds indexes and constraints

2. **20251127000002-create-rooms-new-table.js**
   - Creates the `rooms_new` table
   - Adds indexes and unique constraints

3. **20251127000003-create-property-staff-table.js**
   - Creates the `property_staff` table
   - Sets up staff assignment structure

4. **20251127000004-migrate-data-to-new-structure.js**
   - Migrates properties from `rooms` to `properties`
   - Migrates rooms from `rooms` to `rooms_new`
   - Updates foreign keys in related tables
   - **This is the critical data migration step**

5. **20251127000005-finalize-structure-switch.js**
   - Renames `rooms` to `rooms_old` (backup)
   - Renames `rooms_new` to `rooms` (active)
   - Finalizes foreign key updates
   - **After this, your app MUST use the new structure**

## Migration Methods

### Method 1: Interactive Script (Recommended)

Use the interactive script that guides you through each phase:

```bash
cd backend
node scripts/runDatabaseRestructure.js
```

The script will:
- Ask for confirmation at each phase
- Show progress and data counts
- Allow you to stop before finalizing
- Provide rollback instructions if needed

### Method 2: Manual Step-by-Step

Run migrations manually for more control:

```bash
cd backend

# Phase 1: Create new tables
npx sequelize-cli db:migrate --name 20251127000001-create-properties-table.js
npx sequelize-cli db:migrate --name 20251127000002-create-rooms-new-table.js
npx sequelize-cli db:migrate --name 20251127000003-create-property-staff-table.js

# Phase 2: Migrate data
npx sequelize-cli db:migrate --name 20251127000004-migrate-data-to-new-structure.js

# Phase 3: Verify data (see verification section below)

# Phase 4: Finalize switch (only after verification)
npx sequelize-cli db:migrate --name 20251127000005-finalize-structure-switch.js
```

### Method 3: All at Once (Not Recommended)

Run all migrations at once (only for development):

```bash
cd backend
npx sequelize-cli db:migrate
```

⚠️ **Warning**: This gives you no chance to verify between phases!

## Data Verification

After running migration 20251127000004, verify the data before finalizing:

```sql
-- Check property counts
SELECT 
  (SELECT COUNT(*) FROM rooms WHERE property_id IS NULL) as old_properties,
  (SELECT COUNT(*) FROM properties) as new_properties;

-- Check room counts
SELECT 
  (SELECT COUNT(*) FROM rooms WHERE property_id IS NOT NULL) as old_rooms,
  (SELECT COUNT(*) FROM rooms_new) as new_rooms;

-- Verify property data
SELECT id, name, type, owner_id, is_active 
FROM properties 
LIMIT 10;

-- Verify room data
SELECT id, property_id, room_number, floor_number, sharing_type, total_beds 
FROM rooms_new 
LIMIT 10;

-- Check foreign key updates
SELECT 
  (SELECT COUNT(*) FROM bed_assignments WHERE room_id_new IS NOT NULL) as bed_assignments_updated,
  (SELECT COUNT(*) FROM bookings WHERE room_id_new IS NOT NULL) as bookings_updated;
```

Expected results:
- `old_properties` should equal `new_properties`
- `old_rooms` should equal `new_rooms`
- All foreign key counts should match

## Rollback Procedures

### If migration fails during Phase 1-3

```bash
cd backend
npx sequelize-cli db:migrate:undo
```

This will drop the new tables without affecting your existing data.

### If migration fails during Phase 4 (data migration)

The migration uses transactions, so it should rollback automatically. If not:

```bash
cd backend
npx sequelize-cli db:migrate:undo

# Manually clean up if needed
psql -U your_username -d your_database
DELETE FROM rooms_new;
DELETE FROM properties;
```

### If you need to rollback after Phase 5 (finalized)

```bash
cd backend
npx sequelize-cli db:migrate:undo

# This will:
# - Rename rooms → rooms_new
# - Rename rooms_old → rooms
# - Restore old foreign keys
```

## Post-Migration Tasks

After successful migration:

### 1. Update Application Code

Update your models to use the new structure:

```javascript
// Old (before migration)
const Room = require('./models/Room');
const rooms = await Room.findAll({ where: { propertyId: null } }); // Properties

// New (after migration)
const Property = require('./models/Property');
const Room = require('./models/Room'); // Now uses rooms table (was rooms_new)
const properties = await Property.findAll();
const rooms = await Room.findAll({ where: { propertyId: someId } });
```

### 2. Update API Endpoints

```javascript
// Old endpoints
GET /api/rooms → Returns mix of properties and rooms

// New endpoints
GET /api/properties → Returns properties
GET /api/properties/:id → Property details
GET /api/properties/:id/rooms → Rooms for property
GET /api/rooms/:id → Specific room details
```

### 3. Update Frontend Components

```javascript
// Update components to fetch from new endpoints
const properties = await api.get('/api/properties');
const rooms = await api.get(`/api/properties/${propertyId}/rooms`);
```

### 4. Test Thoroughly

- [ ] Test property listing
- [ ] Test room listing for each property
- [ ] Test room creation (bulk and individual)
- [ ] Test bookings
- [ ] Test bed assignments
- [ ] Test housekeeping logs
- [ ] Test maintenance requests
- [ ] Test staff assignments

### 5. Monitor for Issues

- Check application logs for errors
- Monitor database performance
- Watch for foreign key constraint violations

### 6. Clean Up (After 30 Days)

Once you're confident everything works:

```sql
-- Drop the backup table
DROP TABLE rooms_old;

-- Drop old columns from related tables
ALTER TABLE bed_assignments DROP COLUMN IF EXISTS room_id_old;
ALTER TABLE bookings DROP COLUMN IF EXISTS room_id_old;
ALTER TABLE housekeeping_logs DROP COLUMN IF EXISTS room_id_old;
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS room_id_old;
```

## Troubleshooting

### Issue: Foreign key constraint violations

**Symptom**: Migration fails with foreign key errors

**Solution**:
```sql
-- Check for orphaned records
SELECT * FROM rooms WHERE property_id IS NOT NULL 
  AND property_id NOT IN (SELECT id FROM rooms WHERE property_id IS NULL);

-- Clean up orphaned records before migration
DELETE FROM rooms WHERE property_id IS NOT NULL 
  AND property_id NOT IN (SELECT id FROM rooms WHERE property_id IS NULL);
```

### Issue: Duplicate room numbers

**Symptom**: Unique constraint violation on (property_id, room_number)

**Solution**:
```sql
-- Find duplicates
SELECT property_id, room_number, COUNT(*) 
FROM rooms 
WHERE property_id IS NOT NULL 
GROUP BY property_id, room_number 
HAVING COUNT(*) > 1;

-- Fix duplicates by appending suffix
UPDATE rooms 
SET room_number = room_number || '-' || id::text 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id, room_number ORDER BY created_at) as rn
    FROM rooms WHERE property_id IS NOT NULL
  ) t WHERE rn > 1
);
```

### Issue: Missing categories

**Symptom**: Migration fails because category_id is required

**Solution**:
```sql
-- Create default category if none exist
INSERT INTO categories (id, name, description, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'General',
  'Default category for properties',
  true,
  0
)
ON CONFLICT DO NOTHING;
```

### Issue: Application still using old structure

**Symptom**: Errors about missing columns or tables

**Solution**:
1. Ensure you've updated all model files
2. Restart your application server
3. Clear any caches
4. Check that you're importing the correct models

## Support

If you encounter issues:

1. Check the migration logs for specific errors
2. Review the troubleshooting section above
3. Restore from backup if necessary
4. Contact your database administrator

## Summary Checklist

Before migration:
- [ ] Database backed up
- [ ] Tested on development/staging
- [ ] Reviewed migration files
- [ ] Scheduled maintenance window

During migration:
- [ ] Run Phase 1 (create tables)
- [ ] Run Phase 2 (migrate data)
- [ ] Verify data counts match
- [ ] Run Phase 3 (finalize switch)

After migration:
- [ ] Update application code
- [ ] Update API endpoints
- [ ] Update frontend components
- [ ] Test all functionality
- [ ] Monitor for issues
- [ ] Clean up after 30 days

## Timeline Estimate

- Small database (<1000 records): 5-10 minutes
- Medium database (1000-10000 records): 10-30 minutes
- Large database (>10000 records): 30-60 minutes

Add time for:
- Testing: 1-2 hours
- Code updates: 2-4 hours
- Deployment: 1 hour

**Total estimated time: 4-8 hours** (including testing and deployment)
