# Data Scoping Guide

This document explains how data scoping works in the GoRoomz platform to ensure users only access data they are authorized to see.

## Overview

Data scoping is the automatic filtering of database queries based on a user's role and assignments. It ensures:
- Property owners only see their own properties
- Property staff only see their assigned property
- Platform staff see data based on their role level (territory, assignments, or all data)

## How Data Scoping Works

### 1. Authentication Flow

```
User Request
    ↓
protectInternal middleware (verifies JWT token)
    ↓
applyScopingMiddleware (determines accessible properties)
    ↓
Route Handler (uses scoped queries)
    ↓
Response (only authorized data)
```

### 2. Middleware Chain

All internal routes use this middleware chain:

```javascript
router.get('/properties',
  protectInternal,           // Step 1: Verify authentication
  applyScopingMiddleware,    // Step 2: Calculate data scope
  async (req, res) => {      // Step 3: Use scoped queries
    // req.dataScope is now available
  }
);
```

## Data Scope Object

The `applyScopingMiddleware` attaches a `dataScope` object to the request:

```javascript
req.dataScope = {
  userType: 'property_owner' | 'platform_staff' | 'property_staff' | 'external_user',
  propertyIds: ['uuid1', 'uuid2', ...],  // Properties user can access
  canBypassScoping: boolean               // True for superuser/platform_admin
}
```

## User Type Scoping Rules

### Property Owner

**User Type**: `property_owner`

**Scoping Rule**: Can only access properties they own

**Example**:
```javascript
// User owns properties: ['prop-1', 'prop-2']
req.dataScope = {
  userType: 'property_owner',
  propertyIds: ['prop-1', 'prop-2'],
  canBypassScoping: false
}

// Query automatically filtered to:
// WHERE property_id IN ('prop-1', 'prop-2')
```

**Applies To**:
- Properties
- Rooms
- Bookings
- Payments
- Staff
- Reports
- Maintenance requests
- Housekeeping logs

### Platform Staff - Superuser

**User Type**: `platform_staff`

**Internal Role**: `superuser`

**Scoping Rule**: No scoping, can access all data

**Example**:
```javascript
req.dataScope = {
  userType: 'platform_staff',
  propertyIds: [],  // Empty, but canBypassScoping is true
  canBypassScoping: true
}

// No WHERE clause added, returns all data
```

### Platform Staff - Platform Admin

**User Type**: `platform_staff`

**Internal Role**: `platform_admin`

**Scoping Rule**: No scoping, can access all data

**Example**:
```javascript
req.dataScope = {
  userType: 'platform_staff',
  propertyIds: [],
  canBypassScoping: true
}
```

### Platform Staff - Operations Manager

**User Type**: `platform_staff`

**Internal Role**: `operations_manager`

**Scoping Rule**: No scoping, can access all data

**Example**:
```javascript
req.dataScope = {
  userType: 'platform_staff',
  propertyIds: [],
  canBypassScoping: true
}
```

### Platform Staff - Regional Manager

**User Type**: `platform_staff`

**Internal Role**: `regional_manager`

**Scoping Rule**: Can only access properties in their assigned territory

**Example**:
```javascript
// Regional manager assigned to territory 'north'
// Territory 'north' contains properties: ['prop-1', 'prop-2', 'prop-3']
req.dataScope = {
  userType: 'platform_staff',
  propertyIds: ['prop-1', 'prop-2', 'prop-3'],
  canBypassScoping: false
}

// Query automatically filtered to:
// WHERE property_id IN ('prop-1', 'prop-2', 'prop-3')
```

### Platform Staff - Agent

**User Type**: `platform_staff`

**Internal Role**: `agent`

**Scoping Rule**: Can only access properties explicitly assigned to them

**Example**:
```javascript
// Agent assigned to properties: ['prop-1', 'prop-5']
req.dataScope = {
  userType: 'platform_staff',
  propertyIds: ['prop-1', 'prop-5'],
  canBypassScoping: false
}

// Query automatically filtered to:
// WHERE property_id IN ('prop-1', 'prop-5')
```

### Property Staff

**User Type**: `property_staff`

**Staff Role**: `front_desk`, `housekeeping`, `maintenance`, or `manager`

**Scoping Rule**: Can only access their assigned property

**Example**:
```javascript
// Staff assigned to property 'prop-1'
req.dataScope = {
  userType: 'property_staff',
  propertyIds: ['prop-1'],
  canBypassScoping: false
}

// Query automatically filtered to:
// WHERE property_id = 'prop-1'
```

## Using Data Scoping in Routes

### Basic Usage

Use the `applyScopeToWhere` helper function to apply scoping to queries:

```javascript
const { applyScopeToWhere } = require('../middleware/dataScoping');

router.get('/properties', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Build base where clause
    const baseWhere = {};
    
    // Apply data scoping
    const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere);
    
    // Execute query with scoped where clause
    const properties = await Property.findAll({
      where: scopedWhere
    });
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### With Additional Filters

Scoping filters are merged with your query filters using AND logic:

```javascript
router.get('/properties', protectInternal, applyScopingMiddleware, async (req, res) => {
  // User wants to filter by status
  const baseWhere = {
    status: 'active'
  };
  
  // Apply scoping (merges with baseWhere)
  const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere);
  
  // Result: WHERE status = 'active' AND property_id IN (accessible_ids)
  const properties = await Property.findAll({
    where: scopedWhere
  });
  
  res.json({ success: true, data: properties });
});
```

### Custom Property ID Field

If your table uses a different field name for property ID:

```javascript
// For bookings table that uses 'property_id'
const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'propertyId');

// For rooms table that might use 'property_id'
const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'propertyId');

// For related queries through joins
const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'Property.id');
```

### Nested Queries with Includes

For queries with Sequelize includes:

```javascript
router.get('/bookings', protectInternal, applyScopingMiddleware, async (req, res) => {
  const baseWhere = {};
  const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere);
  
  const bookings = await Booking.findAll({
    where: scopedWhere,
    include: [
      {
        model: Room,
        include: [{ model: Property }]
      },
      {
        model: User,
        as: 'guest'
      }
    ]
  });
  
  res.json({ success: true, data: bookings });
});
```

## Scoping Bypass

### When to Bypass

Only superusers and platform admins can bypass scoping. This is useful for:
- System-wide reports
- Platform analytics
- Administrative tasks
- Audit log reviews

### How to Check

```javascript
if (req.dataScope.canBypassScoping) {
  // User can see all data
  const allProperties = await Property.findAll();
} else {
  // Apply scoping
  const scopedWhere = applyScopeToWhere(req.dataScope, {});
  const properties = await Property.findAll({ where: scopedWhere });
}
```

### Bypass Prevention

The system logs and blocks attempts to bypass scoping:

```javascript
// This will be logged and blocked
router.get('/properties', protectInternal, applyScopingMiddleware, async (req, res) => {
  // ❌ WRONG: Trying to bypass scoping
  const allProperties = await Property.findAll();  // Will return scoped data anyway
  
  // ✅ CORRECT: Use scoped queries
  const scopedWhere = applyScopeToWhere(req.dataScope, {});
  const properties = await Property.findAll({ where: scopedWhere });
});
```

## Performance Considerations

### Property ID Caching

Accessible property IDs are calculated once per request and cached in `req.dataScope`. This prevents multiple database queries.

### Database Indexes

Ensure indexes exist on property ID columns:

```sql
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_rooms_property_id ON rooms(property_id);
CREATE INDEX idx_payments_property_id ON payments(property_id);
```

### Query Optimization

For large datasets, use pagination:

```javascript
const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere);

const { count, rows } = await Property.findAndCountAll({
  where: scopedWhere,
  limit: req.query.limit || 20,
  offset: (req.query.page - 1) * (req.query.limit || 20),
  order: [['createdAt', 'DESC']]
});
```

## Security Considerations

### SQL Injection Prevention

The scoping middleware uses Sequelize's parameterized queries, preventing SQL injection:

```javascript
// Safe: Uses parameterized query
const scopedWhere = applyScopeToWhere(req.dataScope, {});
// Generates: WHERE property_id IN (?, ?, ?) with bound parameters
```

### Privilege Escalation Prevention

Users cannot bypass scoping by:
- Modifying request parameters
- Changing JWT token claims
- Manipulating query strings

The scoping is calculated server-side based on database records.

### Audit Logging

All scoping bypass attempts are logged:

```javascript
// Logged to audit_logs table
{
  userId: 'uuid',
  action: 'scoping_bypass_attempt',
  resourceType: 'property',
  details: {
    attemptedQuery: 'SELECT * FROM properties',
    userType: 'property_owner',
    accessibleProperties: ['prop-1', 'prop-2']
  },
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Testing Data Scoping

### Unit Tests

Test the scoping middleware:

```javascript
describe('Data Scoping Middleware', () => {
  it('should scope property owner to their properties', async () => {
    const req = {
      user: propertyOwner
    };
    
    await applyScopingMiddleware(req, res, next);
    
    expect(req.dataScope.userType).toBe('property_owner');
    expect(req.dataScope.propertyIds).toEqual(['prop-1', 'prop-2']);
    expect(req.dataScope.canBypassScoping).toBe(false);
  });
});
```

### Integration Tests

Test complete request flows:

```javascript
describe('GET /api/internal/properties', () => {
  it('should return only owned properties for property owner', async () => {
    const response = await request(app)
      .get('/api/internal/properties')
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data.every(p => p.ownerId === ownerId)).toBe(true);
  });
});
```

### Property-Based Tests

Test scoping across all user types:

```javascript
const fc = require('fast-check');

test('property owners only see their own data', async () => {
  await fc.assert(
    fc.asyncProperty(
      generators.propertyOwner(),
      generators.properties(),
      async (owner, allProperties) => {
        const ownedProperties = allProperties.filter(p => p.ownerId === owner.id);
        
        const req = { user: owner };
        await applyScopingMiddleware(req, {}, () => {});
        
        const scopedWhere = applyScopeToWhere(req.dataScope, {});
        const results = await Property.findAll({ where: scopedWhere });
        
        // Should only return owned properties
        expect(results.length).toBe(ownedProperties.length);
        expect(results.every(r => r.ownerId === owner.id)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Common Patterns

### Pattern 1: List Resources

```javascript
router.get('/resources', protectInternal, applyScopingMiddleware, async (req, res) => {
  const scopedWhere = applyScopeToWhere(req.dataScope, {});
  const resources = await Resource.findAll({ where: scopedWhere });
  res.json({ success: true, data: resources });
});
```

### Pattern 2: Get Single Resource

```javascript
router.get('/resources/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  const scopedWhere = applyScopeToWhere(req.dataScope, { id: req.params.id });
  const resource = await Resource.findOne({ where: scopedWhere });
  
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  
  res.json({ success: true, data: resource });
});
```

### Pattern 3: Create Resource

```javascript
router.post('/resources', protectInternal, applyScopingMiddleware, async (req, res) => {
  // Ensure user can only create resources for accessible properties
  if (!req.dataScope.propertyIds.includes(req.body.propertyId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const resource = await Resource.create(req.body);
  res.json({ success: true, data: resource });
});
```

### Pattern 4: Update Resource

```javascript
router.put('/resources/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  const scopedWhere = applyScopeToWhere(req.dataScope, { id: req.params.id });
  const resource = await Resource.findOne({ where: scopedWhere });
  
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  
  await resource.update(req.body);
  res.json({ success: true, data: resource });
});
```

### Pattern 5: Delete Resource

```javascript
router.delete('/resources/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  const scopedWhere = applyScopeToWhere(req.dataScope, { id: req.params.id });
  const resource = await Resource.findOne({ where: scopedWhere });
  
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  
  await resource.destroy();
  res.json({ success: true, message: 'Deleted successfully' });
});
```

## Troubleshooting

### Issue: User sees no data

**Cause**: User has no accessible properties

**Solution**: Check `req.dataScope.propertyIds` - if empty, user needs property assignments

### Issue: User sees too much data

**Cause**: Scoping not applied to query

**Solution**: Ensure `applyScopeToWhere` is used in all queries

### Issue: Performance degradation

**Cause**: Missing indexes on property_id columns

**Solution**: Add indexes to all tables with property_id foreign keys

### Issue: Scoping not working in tests

**Cause**: Middleware not applied in test setup

**Solution**: Ensure test requests include authentication and scoping middleware

## Related Documentation

- [Platform Routes API](./PLATFORM_ROUTES_API.md)
- [User Type Decision Tree](./USER_TYPE_DECISION_TREE.md)
- [Migration Strategy](./MIGRATION_STRATEGY.md)
- [Naming Conventions](./CONVENTIONS.md)
