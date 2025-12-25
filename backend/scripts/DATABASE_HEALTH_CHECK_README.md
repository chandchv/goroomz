# Database Health Check Script

## Overview

The `checkDatabaseHealth.js` script provides a comprehensive health check of the GoRoomz database. It validates the database structure, integrity, and data consistency.

## What It Checks

### 1. Table Existence
- Verifies all required tables exist in the database
- Checks tables from both internal-user-roles and internal-management-system specs
- Reports any missing tables

### 2. Column Definitions
- Compares model definitions with actual database columns
- Checks data types match between models and database
- Validates nullability constraints
- Identifies missing columns
- Reports extra columns in database

### 3. Foreign Key Constraints
- Validates all foreign key relationships are properly defined
- Checks constraints for:
  - User relationships (bookings, rooms, leads, etc.)
  - Internal role relationships (agents, territories, commissions)
  - Support system relationships (tickets, responses)
  - Subscription and billing relationships
  - API key relationships

### 4. Orphaned Records
- Detects records with invalid foreign key references
- Checks critical relationships:
  - Bookings with invalid users or rooms
  - Leads with invalid agents
  - Commissions with invalid agents or leads
  - Support tickets with invalid owners
  - Ticket responses with invalid tickets

## Usage

### Prerequisites

1. PostgreSQL database must be running
2. Database credentials configured in `backend/.env`
3. All models properly defined in `backend/models/`

### Running the Health Check

```bash
# From the project root
node backend/scripts/checkDatabaseHealth.js

# Or from the backend directory
cd backend
node scripts/checkDatabaseHealth.js
```

### Exit Codes

- `0` - Database is healthy (all checks passed)
- `1` - Database has issues (one or more checks failed)

## Output

The script provides detailed, color-coded output:

- ✅ **Green** - Check passed
- ❌ **Red** - Critical issue found
- ⚠️ **Yellow** - Warning or non-critical issue
- ℹ️ **Blue** - Informational message

### Sample Output

```
████████████████████████████████████████████████████████████████████████████████
DATABASE HEALTH CHECK
Comprehensive database validation and integrity check
████████████████████████████████████████████████████████████████████████████████

Testing database connection...
✅ Database connection successful

================================================================================
1. CHECKING TABLE EXISTENCE
================================================================================

Found 35 tables in database

✅ User → users
✅ Room → rooms
✅ Booking → bookings
...

================================================================================
2. VERIFYING COLUMN DEFINITIONS
================================================================================

📋 Checking User (users)
  ✅ id
  ✅ email
  ✅ internalRole
  ...

================================================================================
3. VALIDATING FOREIGN KEY CONSTRAINTS
================================================================================

Checking 50 foreign key relationships...

✅ bookings.user_id → users.id
✅ leads.agent_id → users.id
...

================================================================================
4. CHECKING FOR ORPHANED RECORDS
================================================================================

Checking 9 relationships for orphaned records...

✅ Bookings with invalid user: No orphaned records
✅ Leads with invalid agent: No orphaned records
...

================================================================================
FINAL HEALTH REPORT
================================================================================

Health check completed in 2.34 seconds
Timestamp: 2025-01-15T10:30:00.000Z

────────────────────────────────────────────────────────────────────────────────
Component Status:
────────────────────────────────────────────────────────────────────────────────
Tables:          ✅ PASS
Columns:         ✅ PASS
Foreign Keys:    ✅ PASS
Orphaned Records: ✅ PASS
────────────────────────────────────────────────────────────────────────────────

🎉 DATABASE IS HEALTHY! 🎉
All checks passed. Database is in good condition.
```

## Troubleshooting

### Connection Errors

If you see database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   pg_ctl status
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Check database credentials in `backend/.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=goroomz
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. Test connection manually:
   ```bash
   psql -h localhost -U postgres -d goroomz
   ```

### Missing Tables

If tables are missing:

```bash
# Run migrations
npm run migrate

# Or using sequelize-cli
npx sequelize-cli db:migrate
```

### Missing Columns

If columns are missing:

```bash
# Run the fix-all-missing-columns migration
npx sequelize-cli db:migrate

# Or run specific migration
npx sequelize-cli db:migrate --name 20251120100000-fix-all-missing-columns.js
```

### Foreign Key Issues

If foreign key constraints are missing:

1. Review the missing constraints in the output
2. Create a migration to add the constraints
3. Ensure no orphaned records exist before adding constraints

### Orphaned Records

If orphaned records are found:

1. Review the orphaned records
2. Either delete them or fix the references
3. Run the health check again to verify

## Integration with CI/CD

You can integrate this script into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Check Database Health
  run: node backend/scripts/checkDatabaseHealth.js
  env:
    DB_HOST: localhost
    DB_USER: postgres
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## Related Scripts

- `auditDatabaseSchema.js` - Audits schema consistency
- `validateIndexes.js` - Validates database indexes
- `verifyModelDefinitions.js` - Verifies model definitions
- `testDatabaseSync.js` - Tests database sync

## Requirements Validated

This script validates all data model requirements from:
- Internal User Roles specification
- Internal Management System specification

Including models for:
- User management and internal roles
- Property onboarding and leads
- Commission tracking
- Territory management
- Support tickets
- Audit logging
- Announcements and notifications
- Subscriptions and billing
- API key management

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed output from the script
3. Consult the database migration documentation
4. Check the model definitions in `backend/models/`
