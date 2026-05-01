# Dual-Mode Properties Management Page

## Overview
The PropertiesManagementPage now supports both platform staff and property owners by detecting the user type and using the appropriate API endpoint.

## Problem
Property owners were getting 403 Forbidden errors when trying to access `/properties` because the page was hardcoded to use the platform staff endpoint `/api/internal/platform/properties`, which requires an `internalRole`.

## Solution
Implemented dual-mode functionality that detects user type and adapts accordingly:

### Mode 1: Platform Staff (with internalRole)
**Users:** regional_manager, operations_manager, platform_admin, superuser

**Endpoint:** `GET /api/internal/platform/properties`

**Features:**
- View all properties across the platform
- Server-side filtering (search, status, category)
- Change property ownership
- View any property owner's details
- Data scoping applied (regional managers see only their territory)

**Data Structure:**
```typescript
{
  id: string,
  title: string,
  category: string,
  location: { city, state, address },
  owner: { id, name, email },
  statistics: { totalRooms, occupiedRooms },
  isActive: boolean
}
```

### Mode 2: Property Owners (no internalRole)
**Users:** Property owners with role 'owner', 'admin', or 'category_owner'

**Endpoint:** `GET /api/internal/rooms`

**Features:**
- View only their own properties
- Client-side filtering (search, status, type)
- Cannot change ownership
- Properties grouped by title (room title = property name)

**Data Structure:**
Rooms are grouped by `title` field to create property aggregations with calculated statistics.

## Implementation Details

### User Type Detection
```typescript
const isPlatformStaff = !!user?.internalRole;
```

### API Call Logic
```typescript
if (isPlatformStaff) {
  // Use platform endpoint with server-side filtering
  const response = await api.get('/internal/platform/properties', {
    params: { search, status, category, limit: 1000 }
  });
} else {
  // Use rooms endpoint and group by property
  const response = await api.get('/internal/rooms');
  // Group rooms by title to create properties
  // Calculate statistics from room data
}
```

### Feature Visibility
- **Change Owner Button:** Only visible to platform staff (`user?.internalRole`)
- **Owner Column:** Shows "You" for property owners, actual owner name for platform staff
- **Manage Owners Button:** Available to all (navigates to property owners page)

## Routes

### `/properties`
- Accessible to: All authenticated users
- Uses: ProtectedRoute
- Behavior: Adapts based on user type

### `/platform/properties`
- Accessible to: Platform staff only
- Uses: PlatformRoute with role requirements
- Behavior: Always uses platform API

## Data Mapping

### Platform Staff Response
```typescript
{
  id: prop.id,
  name: prop.title,
  type: prop.category,
  city: prop.location?.city,
  totalRooms: prop.statistics?.totalRooms,
  occupiedRooms: prop.statistics?.occupiedRooms,
  owner: prop.owner,
  status: prop.isActive ? 'active' : 'inactive'
}
```

### Property Owner Response
```typescript
// Group rooms by title
const propertyMap = new Map();
rooms.forEach(room => {
  if (!propertyMap.has(room.title)) {
    propertyMap.set(room.title, {
      id: room.id,
      name: room.title,
      type: room.category,
      rooms: [],
      owner: { id: user.id, name: 'You', email: user.email }
    });
  }
  propertyMap.get(room.title).rooms.push(room);
});

// Calculate statistics
properties = Array.from(propertyMap.values()).map(prop => ({
  ...prop,
  totalRooms: prop.rooms.length,
  occupiedRooms: prop.rooms.filter(r => r.currentStatus === 'occupied').length,
  occupancyRate: (occupiedRooms / totalRooms) * 100
}));
```

## Filtering

### Platform Staff
- **Server-side:** search, status, category
- **Performance:** Better for large datasets
- **Implementation:** Query parameters passed to API

### Property Owners
- **Client-side:** search, status, type
- **Performance:** Suitable for smaller datasets (owner's properties only)
- **Implementation:** Array filter methods

## Benefits

1. **Single Component:** One page serves both user types
2. **Appropriate Access:** Each user sees only what they should
3. **Optimized Performance:** Server-side filtering for platform staff
4. **Consistent UX:** Same interface for both user types
5. **Security:** Proper role-based access control maintained

## Testing

### As Platform Staff
1. Login with internalRole (e.g., superuser)
2. Navigate to `/platform/properties` or `/properties`
3. Verify all properties visible
4. Test search, filters
5. Verify "Change Owner" button visible
6. Test changing property owner

### As Property Owner
1. Login as property owner (no internalRole)
2. Navigate to `/properties`
3. Verify only own properties visible
4. Test search, filters
5. Verify "Change Owner" button hidden
6. Verify owner column shows "You"

## Files Modified

- `internal-management/app/pages/PropertiesManagementPage.tsx`
  - Added user type detection
  - Implemented dual API logic
  - Added conditional feature visibility
  - Added property grouping for owners

## Related Documentation

- Platform routes: `backend/routes/internal/platform/properties.js`
- Rooms endpoint: `backend/routes/internal/rooms.js`
- Role-based routing: `internal-management/ROUTE_GUARDS_IMPLEMENTATION.md`
