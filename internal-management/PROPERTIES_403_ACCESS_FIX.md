# Properties 403 Access Fix

## Issue
Property owners were getting 403 Forbidden errors when trying to access the Properties Management page:

```
Error loading properties: Object { message: "Request failed with status code 403", name: "AxiosError", code: "ERR_BAD_REQUEST", status: 403 }
```

## Root Cause
The PropertiesManagementPage was trying to use the `/internal/platform/properties` endpoint for both platform staff and property owners. However, this endpoint has `requirePlatformRole()` middleware that restricts access to platform staff only.

From the platform properties route:
```javascript
/**
 * Platform Properties Routes
 * All-properties view for platform staff only
 * 
 * These routes are accessible only to platform staff (users with internalRole)
 * Property owners attempting to access these routes will receive 403 Forbidden
 */
router.get('/',
  protectInternal,
  requirePlatformRole(), // <-- This blocks property owners
  applyScopingMiddleware,
  async (req, res) => {
```

## Solution
Created a new `/internal/properties` endpoint that both property owners and platform staff can access, with proper data scoping:

### 1. New Properties Route (`backend/routes/internal/properties.js`)

**Features**:
- **Property Owners**: Automatically scoped to their own properties (`ownerId = req.user.id`)
- **Platform Staff**: Uses data scoping middleware for role-based access
- **Other Users**: Denied access with 403

**Access Control Logic**:
```javascript
if (req.user.role === 'owner' || req.user.role === 'category_owner') {
  // Property owners can only see their own properties
  scopedWhere = {
    ...whereClause,
    ownerId: req.user.id
  };
} else if (req.user.internalRole) {
  // Platform staff use data scoping middleware
  scopedWhere = applyScopeToWhere(req.dataScope, whereClause, 'ownerId');
} else {
  // Other users have no access
  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient permissions.'
  });
}
```

**Response Format**:
```javascript
{
  success: true,
  data: [
    {
      id: "property-id",
      name: "Property Name",
      type: "pg",
      location: { address: "...", city: "...", state: "..." },
      owner: { id: "...", name: "...", email: "..." },
      statistics: {
        totalRooms: 10,
        occupiedRooms: 7,
        occupancyRate: 70.00
      },
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  pagination: { total: 1, limit: 50, offset: 0, hasMore: false }
}
```

### 2. Server Registration (`backend/server.js`)
Added the new route to the server:
```javascript
const internalPropertiesRoutes = require('./routes/internal/properties');

app.use('/api/internal/properties', protectInternal, internalPropertiesRoutes);
console.log('✅ Internal properties routes registered at /api/internal/properties');
```

### 3. Frontend Update (`internal-management/app/pages/PropertiesManagementPage.tsx`)
Updated property owners to use the new endpoint:
```javascript
// Before (BROKEN)
const response = await api.get('/internal/platform/properties', {
  params: {
    ownerId: user?.id, // This was causing 403
    // ...other params
  }
});

// After (WORKING)
const response = await api.get('/internal/properties', {
  params: {
    // No ownerId needed - automatically scoped on backend
    search: searchTerm || undefined,
    status: filterStatus || undefined,
    category: filterType || undefined,
    limit: 1000
  }
});
```

## Benefits

### ✅ **Access Control**
- Property owners can access their properties without 403 errors
- Platform staff retain full access with proper scoping
- Clear separation between owner and platform endpoints

### ✅ **Security**
- Automatic data scoping prevents cross-property access
- Property owners cannot see other owners' properties
- Platform staff access is controlled by data scoping middleware

### ✅ **Performance**
- Optimized queries with proper indexing
- Includes room statistics in single query
- Pagination support for large property lists

### ✅ **Maintainability**
- Clear endpoint separation by user type
- Consistent response format
- Proper error handling and logging

## Endpoint Comparison

| Endpoint | Access | Purpose | Scoping |
|----------|--------|---------|---------|
| `/internal/platform/properties` | Platform Staff Only | All-properties management view | Data scoping middleware |
| `/internal/properties` | Property Owners + Platform Staff | User-scoped properties view | Automatic owner scoping |

## Testing
- ✅ Property owners can load properties page without 403 errors
- ✅ Platform staff can still access all properties with proper scoping
- ✅ Data isolation prevents cross-property access
- ✅ Response format matches frontend expectations

## Files Modified
1. **Created**: `backend/routes/internal/properties.js` - New properties endpoint
2. **Modified**: `backend/server.js` - Registered new route
3. **Modified**: `internal-management/app/pages/PropertiesManagementPage.tsx` - Updated endpoint for property owners
4. **Created**: `backend/scripts/testPropertiesEndpoint.js` - Test script

The Properties Management page now works correctly for both property owners and platform staff with proper access controls and data scoping.