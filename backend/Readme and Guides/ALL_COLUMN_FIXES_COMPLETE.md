# All Database Column Name Fixes Complete

## Summary
Fixed all camelCase to snake_case column name mismatches in raw SQL queries across the backend.

## Files Fixed

### 1. backend/models/Room.js
- Added `timestamps: true` and `underscored: true` configuration
- Updated indexes to use snake_case column names

### 2. backend/routes/internal/analytics.js
Fixed multiple raw SQL queries:
- **Capacity stats**: `currentStatus` → `current_status`
- **Room status enums**: Changed from `'available'`, `'maintenance'` to `'vacant_clean'`, `'vacant_dirty'`
- **Territory performance**: 
  - `territoryId` → `territory_id`
  - `internalRole` → `internal_role`
  - `isActive` → `is_active`
  - `agentId` → `agent_id`
  - `createdAt` → `created_at`
  - `leadId` → `lead_id`
- **Platform trends**:
  - `l."createdAt"` → `l."created_at"`
  - `p."paymentDate"` → `p."payment_date"`
  - `c."earnedDate"` → `c."earned_date"`
  - `b."createdAt"` → `b."created_at"`

### 3. backend/routes/internal/health.js
- Changed `currentStatus` → `current_status` in room stats query
- Fixed enum values to match Room model
- Updated response to include `vacantCleanRooms` and `vacantDirtyRooms`

### 4. backend/routes/internal/dashboards.js
- Changed `currentStatus` → `current_status` in occupancy queries

### 5. backend/routes/internal/leads.js
- Changed ORDER BY from `createdAt` to `created_at`

### 6. backend/routes/internal/audit.js
- Changed all ORDER BY clauses from `createdAt` to `created_at` (4 instances)

## Key Learnings

### When to Use Snake Case
Always use snake_case in:
- Raw SQL queries (`sequelize.query()`)
- `sequelize.literal()` statements
- Database migrations
- Direct column references in SQL

### When to Use Camel Case
Use camelCase in:
- Model field definitions
- JavaScript object properties
- Sequelize WHERE clauses (auto-converted)
- Sequelize ORDER BY arrays (auto-converted when not in literals)

### Room Status Enum Values
The correct enum values for `currentStatus` are:
- `'occupied'` - Room is occupied
- `'vacant_clean'` - Room is vacant and clean
- `'vacant_dirty'` - Room is vacant and needs cleaning

❌ Invalid values: `'available'`, `'maintenance'`, `'reserved'`

## Verification Steps

After restarting the backend, verify:
1. ✅ Analytics dashboard loads without errors
2. ✅ Leads page displays correctly
3. ✅ Platform health check works
4. ✅ Room capacity metrics show correctly
5. ✅ Territory performance data loads
6. ✅ Historical trends display properly

## Status
🟢 **All fixes complete** - Ready for backend restart
