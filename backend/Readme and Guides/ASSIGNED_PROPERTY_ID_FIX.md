# Assigned Property ID Column Fix

## Issue
Database sync was failing with error:
```
column "assigned_property_id" does not exist
```

## Root Cause
The `assigned_property_id` column was defined in the User model but the migration to create it hadn't been run properly. Additionally, several other migrations had issues with non-existent columns.

## Fixes Applied

### 1. Fixed Foreign Key Migration (20251121000000-fix-missing-foreign-keys.js)
- Added check to skip foreign keys if they already exist
- Removed references to non-existent columns:
  - `alerts.created_for` (Alert model uses `ownerId` and `resolvedBy`)
  - `discounts.property_owner_id` (Discount model uses `createdBy`)

### 2. Fixed Performance Indexes Migration (20251125000000-add-performance-indexes.js)
- Changed `bookings.property_id` to `bookings.room_id` (Booking model uses `roomId`)
- Removed `audit_logs.property_id` index (column doesn't exist)
- Added `audit_logs.resource_type_id_idx` index instead

### 3. Re-ran Assigned Property ID Migration
- Undid and re-ran migration `20251124000000-add-assigned-property-id.js`
- Successfully added `assigned_property_id` column to users table
- Created index `users_assigned_property_id_idx`

### 4. Updated User Model
- Removed duplicate index definition for `assigned_property_id` (handled by migration)
- Added explicit `field: 'assigned_property_id'` mapping

## Verification
✅ All migrations now run successfully
✅ Database connection works
✅ User model syncs without errors
✅ Server should start normally

## Migration Status
All migrations are now up and running:
- 20251121000000-fix-missing-foreign-keys.js ✅
- 20251123000000-create-property-assignments.js ✅
- 20251124000000-add-assigned-property-id.js ✅
- 20251125000000-add-performance-indexes.js ✅
