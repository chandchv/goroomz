# Role Segregation Migrations - Deployment Guide

## Quick Reference

**Status**: ✅ Ready for Deployment  
**Version**: 1.0.0  
**Date**: November 25, 2025

## What Was Created

### Schema Migrations (3 files)
1. ✅ `20251123000000-create-property-assignments.js` - PropertyAssignment table
2. ✅ `20251124000000-add-assigned-property-id.js` - User.assignedPropertyId column
3. ✅ `20251125000000-add-performance-indexes.js` - Performance indexes

### Data Migration Scripts (4 files)
1. ✅ `migrateExistingUsersForRoleSegregation.js` - Migrate existing user data
2. ✅ `testRoleSegregationMigration.js` - Validate migrations
3. ✅ `runRoleSegregationMigrations.js` - Master migration runner
4. ✅ `validateMigrationFiles.js` - Pre-deployment validation

### Documentation (3 files)
1. ✅ `ROLE_SEGREGATION_MIGRATIONS_README.md` - Complete guide
2. ✅ `ROLE_SEGREGATION_MIGRATIONS_SUMMARY.md` - Implementation summary
3. ✅ `MIGRATION_DEPLOYMENT_GUIDE.md` - This file

## Pre-Deployment Checklist

Before running migrations in production:

- [ ] **Backup Database**
  ```bash
  pg_dump -h localhost -U postgres -d goroomz > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Test on Production Copy**
  ```bash
  # Create test database
  createdb goroomz_test
  psql -d goroomz_test < backup_20251125_103000.sql
  
  # Update .env to point to test database
  DATABASE_NAME=goroomz_test
  
  # Run migrations
  node backend/scripts/runRoleSegregationMigrations.js
  ```

- [ ] **Validate Migration Files**
  ```bash
  node backend/scripts/validateMigrationFiles.js
  ```

- [ ] **Review Expected Changes**
  - New table: `property_assignments` (9 columns, 6 indexes)
  - Modified table: `users` (1 new column, 1 new index)
  - New indexes: 13 total across multiple tables

- [ ] **Schedule Maintenance Window**
  - Estimated time: 5-10 minutes for small databases
  - Estimated time: 15-30 minutes for large databases (100k+ users)

- [ ] **Notify Team**
  - Database changes will be applied
  - Application may need restart
  - New features will be available

## Deployment Steps

### Option 1: Automated (Recommended)

```bash
# Step 1: Validate files
node backend/scripts/validateMigrationFiles.js

# Step 2: Run all migrations
node backend/scripts/runRoleSegregationMigrations.js
```

This will:
1. Create a database backup
2. Run all schema migrations
3. Migrate existing user data
4. Run validation tests
5. Generate a comprehensive report

### Option 2: Manual Step-by-Step

```bash
# Step 1: Validate files
node backend/scripts/validateMigrationFiles.js

# Step 2: Create backup
pg_dump -h localhost -U postgres -d goroomz > backup_$(date +%Y%m%d_%H%M%S).sql

# Step 3: Run schema migrations
cd backend
npx sequelize-cli db:migrate

# Step 4: Run data migration
node scripts/migrateExistingUsersForRoleSegregation.js

# Step 5: Validate results
node scripts/testRoleSegregationMigration.js
```

## Expected Output

### Successful Migration

```
╔═══════════════════════════════════════════════════════════╗
║     ROLE SEGREGATION MIGRATION RUNNER                     ║
╚═══════════════════════════════════════════════════════════╝

📦 Step 0: Database Backup
▶️  Creating database backup...
   ✅ Backup created: backend/backups/pre_role_segregation_2025-11-25T10-30-00.sql

📋 Step 1: Schema Migrations
▶️  Creating PropertyAssignment table...
   ✅ Successfully applied: 20251123000000-create-property-assignments.js
▶️  Adding assignedPropertyId to User table...
   ✅ Successfully applied: 20251124000000-add-assigned-property-id.js
▶️  Adding performance indexes...
   ✅ Successfully applied: 20251125000000-add-performance-indexes.js

📊 Step 2: Data Migration
✅ Migration completed successfully!

User Type Distribution:
  Platform Staff:    12
  Property Owners:   45
  Property Staff:    8
  External Users:    234

Property Assignments:
  Total Assignments: 15
  Agent Assignments: 15
  Staff Assignments: 0
  Manager Assignments: 0

🧪 Step 3: Validation Tests
✅ All tests passed!

═══════════════════════════════════════════════════════════
  MIGRATION COMPLETE
═══════════════════════════════════════════════════════════

✅ All migrations completed successfully!
```

## Post-Deployment Verification

### 1. Check Database Schema

```sql
-- Verify property_assignments table
SELECT * FROM property_assignments LIMIT 5;

-- Verify assigned_property_id column
SELECT id, name, assigned_property_id FROM users WHERE assigned_property_id IS NOT NULL LIMIT 5;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('property_assignments', 'users') ORDER BY tablename, indexname;
```

### 2. Test User Model Helpers

```javascript
// In Node.js console or test script
const User = require('./backend/models/User');

// Test platform staff
const platformStaff = await User.findOne({ where: { internalRole: 'agent' } });
console.log(platformStaff.isPlatformStaff()); // Should be true
console.log(platformStaff.getUserType()); // Should be 'platform_staff'

// Test property owner
const owner = await User.findOne({ where: { role: 'owner', internalRole: null } });
console.log(owner.isPropertyOwner()); // Should be true
console.log(owner.getUserType()); // Should be 'property_owner'
```

### 3. Run Validation Tests

```bash
node backend/scripts/testRoleSegregationMigration.js
```

Expected: All tests should pass (green checkmarks)

### 4. Test Application

- [ ] Login as property owner - verify data scoping works
- [ ] Login as platform staff - verify access to all properties
- [ ] Login as property staff - verify access to assigned property only
- [ ] Create new property assignment - verify it saves correctly
- [ ] Update user roles - verify validation works

## Rollback Procedure

If something goes wrong:

### Option 1: Restore from Backup

```bash
# Drop current database
dropdb goroomz

# Create new database
createdb goroomz

# Restore from backup
psql -d goroomz < backup_20251125_103000.sql
```

### Option 2: Rollback Migrations

```bash
# Rollback all role segregation migrations
cd backend
npx sequelize-cli db:migrate:undo --name 20251125000000-add-performance-indexes.js
npx sequelize-cli db:migrate:undo --name 20251124000000-add-assigned-property-id.js
npx sequelize-cli db:migrate:undo --name 20251123000000-create-property-assignments.js
```

**Note**: Data migrations cannot be automatically rolled back. Use backup restore instead.

## Troubleshooting

### Issue: Migration Already Applied

```bash
# Check migration status
psql -d goroomz -c "SELECT * FROM \"SequelizeMeta\";"

# If incorrectly marked as applied, remove entry
psql -d goroomz -c "DELETE FROM \"SequelizeMeta\" WHERE name = '20251123000000-create-property-assignments.js';"

# Re-run migration
npx sequelize-cli db:migrate
```

### Issue: Role Conflicts Found

The data migration will report users with conflicting roles. To fix:

```sql
-- View conflicting users
SELECT id, name, email, role, internal_role 
FROM users 
WHERE role IN ('owner', 'admin', 'category_owner') 
  AND internal_role IS NOT NULL;

-- Fix by choosing one role
UPDATE users SET internal_role = NULL WHERE id = 'user_id_here';
-- OR
UPDATE users SET role = 'user' WHERE id = 'user_id_here';
```

### Issue: Property Staff Without Assignments

```sql
-- View unassigned staff
SELECT id, name, email, staff_role 
FROM users 
WHERE staff_role IS NOT NULL 
  AND assigned_property_id IS NULL;

-- Assign to property
UPDATE users 
SET assigned_property_id = 'property_id_here' 
WHERE id = 'staff_user_id_here';
```

### Issue: Tests Failing

```bash
# Run tests with verbose output
node backend/scripts/testRoleSegregationMigration.js

# Check specific test failure
# Review error messages and fix accordingly
```

## Performance Impact

### Expected Query Performance

- **Property owner queries**: 10-20% faster (due to new indexes)
- **Platform staff queries**: 5-15% faster (due to composite indexes)
- **Property staff queries**: 15-25% faster (due to assigned_property_id index)

### Database Size Impact

- **New table**: ~1KB per property assignment
- **New indexes**: ~100-500KB depending on data size
- **Total increase**: <1% for typical databases

## Next Steps After Deployment

1. **Update Application Code**
   - Use User model helper methods in controllers
   - Apply data scoping middleware to routes
   - Update frontend to use role-based navigation

2. **Monitor Performance**
   - Check query execution times
   - Monitor index usage
   - Adjust indexes if needed

3. **User Training**
   - Document new role structure
   - Train staff on new features
   - Update user guides

4. **Ongoing Maintenance**
   - Regularly review role assignments
   - Monitor for role conflicts
   - Keep property assignments up to date

## Support Contacts

For issues during deployment:

1. **Check Documentation**
   - `ROLE_SEGREGATION_MIGRATIONS_README.md` - Complete guide
   - `ROLE_SEGREGATION_MIGRATIONS_SUMMARY.md` - Implementation details

2. **Run Diagnostics**
   - `node backend/scripts/validateMigrationFiles.js` - File validation
   - `node backend/scripts/testRoleSegregationMigration.js` - Database validation

3. **Review Logs**
   - Migration output logs
   - Database error logs
   - Application error logs

## Success Criteria

Migration is successful when:

- ✅ All schema migrations applied without errors
- ✅ Data migration completed with no critical issues
- ✅ All validation tests pass
- ✅ Application starts without errors
- ✅ Users can login and access appropriate data
- ✅ Role-based features work as expected

## Deployment Sign-off

- [ ] Pre-deployment checklist completed
- [ ] Backup created and verified
- [ ] Migrations tested on production copy
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled
- [ ] Rollback procedure documented
- [ ] Post-deployment verification plan ready

**Deployed By**: _______________  
**Date**: _______________  
**Time**: _______________  
**Result**: _______________

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025  
**Status**: Ready for Production Deployment
