# Superuser Route Column Name Fix

## Issue
The superuser route was failing with a database error:
```
error: column properties.createdAt does not exist
```

## Root Cause
The Property model uses `underscored: true` which converts camelCase field names to snake_case in the database. However, the superuser route was explicitly requesting `createdAt` in the attributes array, which doesn't exist - the actual column name is `created_at`.

## Fix Applied
Updated all instances in `backend/routes/internal/superuser.js`:

1. **Line 36**: Changed `'createdAt'` to `'created_at'` in Property attributes
2. **Line 68**: Changed `property.createdAt` to `property.created_at` in response mapping
3. **Line 146**: Changed `'createdAt'` to `'created_at'` in Property attributes  
4. **Line 184**: Changed `property.createdAt` to `property.created_at` in response mapping

## Files Modified
- `backend/routes/internal/superuser.js`

## Status
✅ **FIXED** - All column name mismatches in superuser route resolved

The property owner endpoints should now work correctly without database column errors.