# Superuser Role Query Fix

## Issue
The `/api/internal/superuser/property-owners` endpoint was returning a 500 Internal Server Error when trying to fetch property owners.

## Root Cause
Multiple Sequelize queries in the superuser routes were using incorrect syntax for querying with multiple role values:

```javascript
// INCORRECT - This causes a SQL error
where: { role: ['owner', 'category_owner'] }
```

Sequelize requires the `Op.in` operator when querying with an array of values:

```javascript
// CORRECT
where: { role: { [Op.in]: ['owner', 'category_owner'] } }
```

## Affected Endpoints

All of these endpoints had the same issue:

1. `GET /api/internal/superuser/property-owners` - List all property owners
2. `GET /api/internal/superuser/property-owners/:id` - Get property owner details
3. `PUT /api/internal/superuser/property-owners/:id` - Update property owner
4. `PUT /api/internal/superuser/property-owners/:id/deactivate` - Deactivate property owner
5. `POST /api/internal/superuser/properties` - Create property (validates owner)
6. `PUT /api/internal/superuser/properties/:id/transfer-ownership` - Transfer property ownership

## Fix Applied

### 1. Role Query Fix
Updated all queries from:
```javascript
{ role: ['owner', 'category_owner'] }
```

To:
```javascript
{ role: { [Op.in]: ['owner', 'category_owner'] } }
```

### 2. Column Name Fix
Updated property attributes from:
```javascript
attributes: ['id', 'name', 'type', 'location', 'isActive', 'createdAt']
```

To:
```javascript
attributes: ['id', 'name', 'type', 'location', 'isActive', 'created_at']
```

And updated the property mapping from:
```javascript
createdAt: property.createdAt
```

To:
```javascript
createdAt: property.created_at
```

## Files Changed
- `backend/routes/internal/superuser.js` - Fixed 6 role query occurrences + 3 column name occurrences

## Testing

### Before Fix:
- Opening Property Owners page resulted in 500 error
- Console showed: "Failed to load resource: the server responded with a status of 500"
- Property creation modal couldn't load owner list

### After Fix:
- Property Owners page loads successfully
- Owner dropdown in property creation modal populates correctly
- All property owner CRUD operations work as expected

## SQL Generated

### Before (Incorrect):
```sql
SELECT * FROM users WHERE role = ARRAY['owner', 'category_owner']
-- This fails because role is a string column, not an array
```

### After (Correct):
```sql
SELECT * FROM users WHERE role IN ('owner', 'category_owner')
-- This correctly checks if role matches any value in the list
```

## Related Issues
This is a common Sequelize mistake. When querying with multiple possible values for a field, always use:
- `Op.in` for "value is one of these"
- `Op.notIn` for "value is not one of these"
- `Op.or` for complex OR conditions

## Prevention
Consider adding ESLint rules or code review checklist items to catch this pattern:
- Any `where` clause with an array value should use `Op.in`
- Review all Sequelize queries for proper operator usage
