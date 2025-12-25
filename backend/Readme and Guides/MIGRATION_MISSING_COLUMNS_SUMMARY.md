# Missing Columns Migration Summary

## Overview

This document summarizes the comprehensive migration created to add all missing columns identified across the internal-management-system and internal-user-roles specifications.

## Migration File

**File:** `backend/migrations/20251120100000-fix-all-missing-columns.js`

## Columns Added

### 1. PaymentSchedule Table
- **status** (ENUM: 'pending', 'paid', 'overdue')
  - Default: 'pending'
  - Required for tracking payment schedule status

### 2. Payment Table
- **payment_method** (ENUM: 'cash', 'card', 'upi', 'bank_transfer')
  - Default: 'cash'
  - Required for recording how payment was made
- **payment_type** (ENUM: 'booking', 'monthly_rent', 'security_deposit')
  - Default: 'booking'
  - Required for categorizing payment types
- **status** (ENUM: 'pending', 'completed', 'failed', 'refunded')
  - Default: 'completed'
  - Required for tracking payment status

### 3. SecurityDeposit Table
- **payment_method** (ENUM: 'cash', 'card', 'upi', 'bank_transfer')
  - Default: 'cash'
  - Required for recording deposit payment method
- **status** (ENUM: 'collected', 'refunded', 'partially_refunded')
  - Default: 'collected'
  - Required for tracking deposit status

### 4. MaintenanceRequest Table
- **priority** (ENUM: 'low', 'medium', 'high', 'urgent')
  - Default: 'medium'
  - Required for prioritizing maintenance requests
- **status** (ENUM: 'pending', 'in_progress', 'completed', 'cancelled')
  - Default: 'pending'
  - Required for tracking request status

### 5. Booking Table
- **booking_source** (ENUM: 'online', 'offline')
  - Default: 'online'
  - Required for tracking booking origin
- **bed_id** (UUID, nullable)
  - Foreign key to bed_assignments
  - Required for bed-level booking tracking
- **actual_check_in_time** (DATE, nullable)
  - Required for recording actual check-in time
- **actual_check_out_time** (DATE, nullable)
  - Required for recording actual check-out time
- **security_deposit_id** (UUID, nullable)
  - Foreign key to security_deposits
  - Required for linking deposits to bookings
- **checked_in_by** (UUID, nullable)
  - Foreign key to users
  - Required for tracking who performed check-in
- **checked_out_by** (UUID, nullable)
  - Foreign key to users
  - Required for tracking who performed check-out

### 6. Room Table
- **sharing_type** (ENUM: 'single', '2_sharing', '3_sharing')
  - Nullable
  - Required for PG room type classification
- **current_status** (ENUM: 'occupied', 'vacant_clean', 'vacant_dirty')
  - Default: 'vacant_clean'
  - Required for housekeeping management
- **floor_number** (INTEGER, nullable)
  - Required for room location tracking
- **room_number** (STRING, nullable)
  - Required for room identification
- **total_beds** (INTEGER, nullable)
  - Required for bed capacity tracking
- **last_cleaned_at** (DATE, nullable)
  - Required for housekeeping scheduling
- **last_maintenance_at** (DATE, nullable)
  - Required for maintenance scheduling

### 7. User Table
- **staff_role** (ENUM: 'front_desk', 'housekeeping', 'maintenance', 'manager')
  - Nullable
  - Required for staff role management

### 8. Lead Table
- **property_type** (ENUM: 'hotel', 'pg')
  - Default: 'hotel'
  - Required for lead categorization
- **status** (ENUM: 'contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost')
  - Default: 'contacted'
  - Required for lead pipeline tracking

### 9. SupportTicket Table
- **category** (ENUM: 'technical', 'billing', 'operations', 'feature_request', 'other')
  - Default: 'other'
  - Required for ticket categorization
- **priority** (ENUM: 'low', 'medium', 'high', 'urgent')
  - Default: 'medium'
  - Required for ticket prioritization
- **status** (ENUM: 'new', 'in_progress', 'waiting_response', 'resolved', 'closed')
  - Default: 'new'
  - Required for ticket workflow tracking

### 10. Commission Table
- **status** (ENUM: 'earned', 'pending_payment', 'paid', 'cancelled')
  - Default: 'earned'
  - Required for commission payment tracking

### 11. AgentTarget Table
- **period** (ENUM: 'monthly', 'quarterly', 'yearly')
  - Default: 'monthly'
  - Required for target period definition

### 12. LeadCommunication Table
- **type** (ENUM: 'call', 'email', 'meeting', 'note')
  - Default: 'note'
  - Required for communication type tracking

### 13. Announcement Table
- **target_audience** (ENUM: 'all_property_owners', 'specific_region', 'specific_property_type')
  - Default: 'all_property_owners'
  - Required for announcement targeting

### 14. HousekeepingLog Table
- **time_taken** (INTEGER, nullable)
  - Required for tracking cleaning duration

## Migration Features

### Safety Features
1. **Column Existence Check**: Before adding any column, the migration checks if it already exists
2. **ENUM Type Check**: Before creating ENUM types, checks if they already exist
3. **Transaction Support**: All operations wrapped in a transaction for atomicity
4. **Rollback Support**: Complete down migration to reverse all changes

### ENUM Type Management
- Creates PostgreSQL ENUM types for all enumerated columns
- Properly handles existing ENUM types to avoid conflicts
- Drops ENUM types in down migration

### Foreign Key Constraints
- Properly sets up foreign key references where needed
- Uses appropriate ON DELETE actions (CASCADE, SET NULL)

## Running the Migration

### Apply Migration
```bash
npx sequelize-cli db:migrate
```

### Rollback Migration
```bash
npx sequelize-cli db:migrate:undo
```

## Validation

After running the migration, you can validate the schema using:
```bash
node backend/scripts/auditDatabaseSchema.js
```

This will compare the database schema with the model definitions and report any discrepancies.

## Notes

- All ENUM columns have sensible default values
- Nullable columns are marked appropriately based on business logic
- Foreign key constraints maintain referential integrity
- The migration is idempotent - can be run multiple times safely

## Related Files

- **Models**: All model files in `backend/models/`
- **Audit Script**: `backend/scripts/auditDatabaseSchema.js`
- **Requirements**: `.kiro/specs/internal-user-roles/requirements.md`
- **Design**: `.kiro/specs/internal-user-roles/design.md`
