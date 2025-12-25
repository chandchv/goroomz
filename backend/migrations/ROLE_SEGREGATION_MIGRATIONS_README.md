# Role Segregation Migrations

This directory contains database migrations for implementing the role segregation optimization system in GoRoomz.

## Overview

The role segregation system establishes clear boundaries between three user types:
1. **Property Owners** - Users who own and manage properties
2. **Platform Staff** - Internal company employees (agents, managers, admins)
3. **Property Staff** - Staff hired by property owners (front desk, housekeeping, etc.)

## Migration Files

### Schema Migrations

1. **20251123000000-create-property-assignments.js**
   - Creates the `property_assignments` table
   - Tracks which users (agents/staff) are assigned to which properties
   - Includes indexes for performance optimization
   - **Status**: ✅ Complete

2. **20251124000000-add-assigned-property-id.js**
   - Adds `assigned_property_id` column to `users` table
   - Allows property staff to be assigned to a specific property
   - Includes foreign key constraint and index
   - **Status**: ✅ Complete

3. **20251125000000-add-performance-indexes.js**
   - Adds composite indexes for role-based queries
   - Optimizes data scoping operations
   - Improves query performance for large datasets
   - **Status**: ✅ Complete

### Data Migration Scripts

4. **migrateExistingUsersForRoleSegregation.js**
   - Migrates existing user data to work with new role system
   - Identifies and reports role conflicts
   - Creates property assignments for agents with leads
   - Validates permission scopes
   - Generates comprehensive migration report

5. **testRoleSegregationMigration.js**
   - Validates that migrations were applied correctly
   - Tests database schema and indexes
   - Validates User model helper methods
   - Checks data integrity
   - Runs sample queries for each user type

6. **runRoleSegregationMigrations.js**
   - Master script that runs all migrations in correct order
   - Creates database backup before starting
   - Runs schema migrations
   - Executes data migration
   - Runs validation tests
   - Provides comprehensive status reporting

## Running Migrations

### Option 1: Run All Migrations (Recommended)

This is the easiest and safest way to apply all migrations:

```bash
cd backend
node scripts/runRoleSegregationMigrations.js
```

This script will:
1. Create a database backup
2. Apply all schema migrations
3. Migrate existing user data
4. Run validation tests
5. Provide a detailed report

### Option 2: Run Migrations Individually

If you prefer more control, you can run migrations step by step:

```bash
# Step 1: Run schema migrations
cd backend
npx sequelize-cli db:migrate

# Step 2: Run data migration
node scripts/migrateExistingUsersForRoleSegregation.js

# Step 3: Run validation tests
node scripts/testRoleSegregationMigration.js
```

### Option 3: Use Existing Migration Scripts

For the PropertyAssignment table specifically:

```bash
cd backend
node scripts/runPropertyAssignmentMigration.js
```

## Testing on Production Data Copy

**IMPORTANT**: Always test migrations on a copy of production data first!

### Create a Database Copy

```bash
# Create a backup of production database
pg_dump -h production_host -U username -d goroomz > production_backup.sql

# Create a test database
createdb goroomz_test

# Restore backup to test database
psql -d goroomz_test < production_backup.sql

# Update .env to point to test database
DATABASE_NAME=goroomz_test

# Run migrations on test database
node scripts/runRoleSegregationMigrations.js
```

### Validate Results

After running migrations on test data:

1. Check the migration report for any warnings
2. Review users with conflicting roles
3. Verify property assignments were created correctly
4. Test the application with different user types
5. Run the validation test suite

```bash
node scripts/testRoleSegregationMigration.js
```

## Migration Output

### Expected Output

The migration scripts provide detailed output:

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
🔄 Starting user data migration for role segregation...

Step 1: Checking for role conflicts...
✅ No role conflicts found

Step 2: Creating property assignments for agents with leads...
   Found 15 agent-property relationships to create
✅ Created 15 property assignments for agents

Step 3: Checking property staff assignments...
✅ All property staff have assigned properties

Step 4: Validating permission scopes...
✅ All permission scopes are valid

═══════════════════════════════════════════════════════════
                   MIGRATION SUMMARY                       
═══════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════

✅ Migration completed successfully!
```

## Troubleshooting

### Common Issues

#### 1. Role Conflicts

**Issue**: Users have both property owner role and internalRole

**Solution**: 
```sql
-- Identify conflicting users
SELECT id, name, email, role, internal_role 
FROM users 
WHERE role IN ('owner', 'admin', 'category_owner') 
  AND internal_role IS NOT NULL;

-- Fix by removing one of the roles
UPDATE users 
SET internal_role = NULL 
WHERE id = 'user_id_here';
```

#### 2. Property Staff Without Assignments

**Issue**: Property staff don't have assigned_property_id set

**Solution**:
```sql
-- Assign staff to a property
UPDATE users 
SET assigned_property_id = 'property_id_here' 
WHERE id = 'staff_user_id_here';
```

#### 3. Migration Already Applied

**Issue**: Migration shows as already applied but table doesn't exist

**Solution**:
```sql
-- Check SequelizeMeta table
SELECT * FROM "SequelizeMeta";

-- Remove incorrect entry
DELETE FROM "SequelizeMeta" 
WHERE name = '20251123000000-create-property-assignments.js';

-- Re-run migration
npx sequelize-cli db:migrate
```

## Rollback

If you need to rollback migrations:

```bash
# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback specific migration
npx sequelize-cli db:migrate:undo --name 20251125000000-add-performance-indexes.js

# Rollback all role segregation migrations
npx sequelize-cli db:migrate:undo --name 20251123000000-create-property-assignments.js
```

**Note**: Data migrations cannot be automatically rolled back. You'll need to restore from backup.

## Post-Migration Steps

After successfully running migrations:

1. **Update Application Code**
   - Use User model helper methods (isPropertyOwner, isPlatformStaff, etc.)
   - Apply data scoping middleware to routes
   - Update frontend to use role-based navigation

2. **Test Each User Type**
   - Login as property owner and verify data scoping
   - Login as platform staff and verify access levels
   - Login as property staff and verify property assignment

3. **Monitor Performance**
   - Check query performance with new indexes
   - Monitor data scoping overhead
   - Adjust indexes if needed

4. **Update Documentation**
   - Document new role structure for team
   - Update API documentation
   - Create user guides for each role type

## Related Documentation

- [Role Segregation Design Document](../../.kiro/specs/role-segregation-optimization/design.md)
- [Role Segregation Requirements](../../.kiro/specs/role-segregation-optimization/requirements.md)
- [User Model Documentation](../models/User.js)
- [PropertyAssignment Model Documentation](../models/PropertyAssignment.js)
- [Data Scoping Middleware](../middleware/dataScoping.js)

## Support

If you encounter issues with migrations:

1. Check the migration output for specific error messages
2. Review the troubleshooting section above
3. Run the validation test suite: `node scripts/testRoleSegregationMigration.js`
4. Check database logs for constraint violations
5. Restore from backup if necessary

## Migration Checklist

Before running in production:

- [ ] Create full database backup
- [ ] Test migrations on production data copy
- [ ] Review migration output for warnings
- [ ] Validate all tests pass
- [ ] Document any manual fixes needed
- [ ] Plan rollback strategy
- [ ] Schedule maintenance window
- [ ] Notify team of changes
- [ ] Update application code to use new features
- [ ] Monitor application after deployment

## Version History

- **v1.0** (2025-11-25): Initial role segregation migrations
  - PropertyAssignment table creation
  - assignedPropertyId column addition
  - Performance indexes
  - Data migration script
  - Validation test suite
