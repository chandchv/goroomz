# Critical Column Name Fixes Required

## Status
The Properties Management page has been fixed. However, similar camelCase/snake_case issues exist across **13 other backend route files**.

## What Was Fixed
✅ `backend/routes/internal/superuser.js` - Properties Management
✅ `backend/routes/internal/analytics.js` - Analytics queries  
✅ `backend/routes/internal/audit.js` - Audit log queries

## What Still Needs Fixing

### Immediate Action Required (Breaks User Features)
These will cause 500 errors when users try to access these features:

1. **backend/routes/internal/users.js**
   - Internal user listing and management
   - Agent performance metrics
   - Fix: Lines 413, 622, 1037, 1043

2. **backend/routes/internal/dashboards.js**
   - All role-based dashboards (Agent, Regional Manager, Operations Manager)
   - Fix: Lines 119, 121, 135, 154, 326, 349, 843, 861

3. **backend/routes/internal/leads.js**
   - Lead filtering by date
   - Lead listing and sorting
   - Fix: Lines 45-51, 116, 911-917, 932

4. **backend/routes/internal/tickets.js**
   - Support ticket filtering and sorting
   - Fix: Lines 66-71, 124-125, 684

5. **backend/routes/internal/search.js**
   - Global search functionality
   - Fix: Lines 177, 286, 390, 394

### High Priority (Core Admin Features)
6. **backend/routes/internal/subscriptions.js** - Subscription management
7. **backend/routes/internal/staff.js** - Staff user management  
8. **backend/routes/internal/territories.js** - Territory management
9. **backend/routes/internal/notifications.js** - Notification system

### Medium Priority (Secondary Features)
10. **backend/routes/internal/targets.js** - Performance targets
11. **backend/routes/internal/roles.js** - Role management
12. **backend/routes/internal/commissions.js** - Commission tracking
13. **backend/routes/internal/maintenance.js** - Maintenance requests
14. **backend/routes/internal/health.js** - System health monitoring

## How to Fix

Replace all instances in database queries:
```javascript
// WRONG (will fail)
'createdAt'  → 'created_at'
'updatedAt'  → 'updated_at'
'lastLoginAt' → 'last_login_at'
order: [['createdAt', 'DESC']]  → order: [['created_at', 'DESC']]
where: { createdAt: {...} }  → where: { created_at: {...} }
```

**Important**: Response objects sent to frontend can keep camelCase for consistency, but all Sequelize queries (attributes, where, order) must use snake_case.

## Recommendation

Restart the backend after fixing the superuser route, then systematically fix the other routes as users encounter errors. The audit document `COLUMN_NAME_AUDIT_FINDINGS.md` contains the complete list of line numbers to fix.
