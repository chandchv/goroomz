# Database Column Name and Enum Fix Summary

## Issues
1. `column Lead.createdAt does not exist` (should be `created_at`)
2. `column "currentStatus" does not exist` (should be `current_status`)
3. `invalid input value for enum enum_rooms_current_status: "available"` - enum values didn't match

## Root Causes
1. When using `sequelize.literal()` for raw SQL in queries, Sequelize doesn't automatically convert camelCase field names to snake_case database column names
2. Analytics and health routes were using incorrect enum values (`'available'`, `'maintenance'`, `'reserved'`) that don't exist in the Room model

## Actual Room Status Enum Values
The Room model defines `currentStatus` with these values:
- `'occupied'` - Room is currently occupied
- `'vacant_clean'` - Room is vacant and clean, ready for new guest
- `'vacant_dirty'` - Room is vacant but needs cleaning

## Fixes Applied

### 1. Room Model (backend/models/Room.js)
- Added `timestamps: true` and `underscored: true` to model options
- Updated indexes to use snake_case column names

### 2. Analytics Route (backend/routes/internal/analytics.js)
- Changed `"currentStatus"` to `"current_status"` in raw SQL literals
- Fixed enum values: replaced `'available'` and `'maintenance'` with `'vacant_clean'` and `'vacant_dirty'`
- Calculate `availableRooms` as sum of `vacantCleanRooms + vacantDirtyRooms`

### 3. Health Route (backend/routes/internal/health.js)
- Changed `"currentStatus"` to `"current_status"` in raw SQL literals
- Fixed enum values: replaced `'available'`, `'maintenance'`, and `'reserved'` with `'vacant_clean'` and `'vacant_dirty'`
- Updated response to include `vacantCleanRooms` and `vacantDirtyRooms` separately
- Calculate `availableRooms` as sum of vacant rooms

### 4. Dashboards Route (backend/routes/internal/dashboards.js)
- Changed `currentStatus` to `current_status` in raw SQL literals
- Fixed occupancy calculation queries

## Important Notes

### When to Use Snake Case
Always use snake_case column names in:
- `sequelize.literal()` statements
- Raw SQL queries
- Database migrations
- Direct SQL in HAVING clauses

### When to Use Camel Case
Use camelCase in:
- Model field definitions
- JavaScript object properties
- WHERE clauses (Sequelize converts automatically)
- ORDER BY arrays (Sequelize converts automatically)

## Verification
After restarting the backend, verify:
1. Leads page loads without errors
2. Analytics dashboard displays correctly
3. Platform health check works
4. Room status queries execute successfully

## Files Modified
- `backend/models/Room.js`
- `backend/routes/internal/analytics.js`
- `backend/routes/internal/health.js`
- `backend/routes/internal/dashboards.js`
