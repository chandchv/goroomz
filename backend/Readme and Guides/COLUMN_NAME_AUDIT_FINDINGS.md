# Column Name Audit Findings

## Summary
Found multiple instances where backend routes use camelCase column names (createdAt, updatedAt, lastLoginAt, etc.) but the database uses snake_case (created_at, updated_at, last_login_at).

## Critical Issues Found

### 1. **users.js** - Multiple timestamp references
- Line 413, 622: `'createdAt'` and `'updatedAt'` in attributes
- Line 1037, 1043: `createdAt` in where clause and attributes for Lead queries
- **Impact**: User listing and agent performance queries will fail

### 2. **tickets.js** - Date filtering and ordering
- Lines 66-71: `whereClause.createdAt` for date range filtering
- Lines 124-125: `order: [['createdAt', 'DESC']]`
- Line 684: `order: [['createdAt', 'ASC']]`
- **Impact**: Ticket filtering and sorting will fail

### 3. **territories.js** - Agent listing
- Line 411: `'createdAt'` in attributes
- **Impact**: Territory agent listing will fail

### 4. **targets.js** - Target ordering
- Lines 98-99, 553-554: `['createdAt', 'DESC']` in order clauses
- **Impact**: Target listing will fail

### 5. **subscriptions.js** - Multiple issues
- Line 21: `sortBy = 'createdAt'` default parameter
- Lines 127, 453: `order: [['createdAt', 'DESC']]`
- Lines 432-437: `where.createdAt` for date filtering
- **Impact**: Subscription queries will fail

### 6. **staff.js** - Staff user queries
- Lines 116-117: `'createdAt', 'updatedAt'` in attributes
- Lines 216, 324, 489: `createdAt` and `updatedAt` in response objects
- **Impact**: Staff listing will fail

### 7. **search.js** - Search results
- Lines 177, 394: `order: [['createdAt', 'DESC']]`
- Lines 286, 390: `'createdAt'` in attributes
- **Impact**: Search functionality will fail

### 8. **roles.js** - Role user listing
- Line 485: `'createdAt'` in attributes
- **Impact**: Role user listing will fail

### 9. **notifications.js** - Notification queries
- Line 48: `order: [['createdAt', 'DESC']]`
- **Impact**: Notification listing will fail

### 10. **maintenance.js** - Response objects
- Lines 166-167, 338, 528-529, 616-617: `createdAt` and `updatedAt` in response
- **Impact**: Maintenance request responses may have missing fields

### 11. **leads.js** - Date filtering and ordering
- Lines 45-51, 911-917: `whereClause.createdAt` for date filtering
- Lines 116, 932: `order: [['createdAt', 'DESC']]` (one already fixed to created_at)
- **Impact**: Lead filtering will fail

### 12. **health.js** - Recent activity queries
- Lines 66-68, 83-85, 449: `createdAt` in where clauses
- **Impact**: Health check metrics will fail

### 13. **dashboards.js** - Multiple dashboard queries
- Lines 119, 326: `order: [['updatedAt', 'DESC']]`
- Lines 135, 843, 861: `order: [['createdAt', 'DESC']]`
- Lines 121, 154, 349: `'updatedAt'` in attributes and response
- **Impact**: Dashboard data will fail to load

### 14. **commissions.js** - Commission ordering
- Lines 77, 433, 529: `['createdAt', 'DESC/ASC']` in order clauses
- **Impact**: Commission listing will fail

## Files Already Fixed
- ✅ backend/routes/internal/superuser.js - Fixed to use `created_at`
- ✅ backend/routes/internal/analytics.js - Fixed in previous session
- ✅ backend/routes/internal/audit.js - Fixed in previous session

## Recommended Fix Strategy

1. **Immediate Priority** (User-facing features):
   - users.js
   - tickets.js
   - leads.js
   - dashboards.js
   - search.js

2. **High Priority** (Core functionality):
   - subscriptions.js
   - staff.js
   - territories.js
   - notifications.js

3. **Medium Priority** (Admin features):
   - targets.js
   - roles.js
   - commissions.js
   - maintenance.js
   - health.js

## Solution Approach

For each file, replace:
- `'createdAt'` → `'created_at'`
- `'updatedAt'` → `'updated_at'`
- `'lastLoginAt'` → `'last_login_at'`
- `whereClause.createdAt` → `whereClause.created_at`
- `order: [['createdAt', ...]]` → `order: [['created_at', ...]]`

**Note**: Response objects can keep camelCase for frontend compatibility, but database queries must use snake_case.
