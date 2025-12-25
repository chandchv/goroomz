# User Type Decision Tree

This document provides a visual decision tree and flowchart for determining user types and their access levels in the GoRoomz platform.

## Quick Reference Table

| User Type | Role Field | Internal Role | Staff Role | Access Level | Dashboard |
|-----------|-----------|---------------|------------|--------------|-----------|
| **External User** | `user` | `null` | `null` | Public website only | N/A (redirected to main site) |
| **Property Owner** | `owner`, `admin`, `category_owner` | `null` | `null` | Own properties only | Property Dashboard |
| **Property Staff** | `user` | `null` | `front_desk`, `housekeeping`, `maintenance`, `manager` | Assigned property only | Property Dashboard (limited) |
| **Agent** | Any | `agent` | `null` | Assigned properties | Agent Dashboard |
| **Regional Manager** | Any | `regional_manager` | `null` | Territory properties | Regional Manager Dashboard |
| **Operations Manager** | Any | `operations_manager` | `null` | All properties | Operations Dashboard |
| **Platform Admin** | Any | `platform_admin` | `null` | All properties | Platform Admin Dashboard |
| **Superuser** | Any | `superuser` | `null` | All properties + system settings | Superuser Dashboard |

## Decision Tree Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Login                              │
│                    (JWT Token Verified)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Has internalRole? │
                    └────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
               YES                       NO
                │                         │
                ▼                         ▼
    ┌───────────────────────┐   ┌──────────────────┐
    │   PLATFORM STAFF      │   │  Check role field │
    │   (Internal Employee) │   └────────┬─────────┘
    └───────────┬───────────┘            │
                │              ┌──────────┴──────────┐
                │              │                     │
                │         role = owner/admin    role = user
                │              │                     │
                │              ▼                     ▼
                │    ┌──────────────────┐   ┌──────────────┐
                │    │ PROPERTY OWNER   │   │ Has staffRole? │
                │    │ (Owns properties)│   └──────┬─────────┘
                │    └──────────────────┘          │
                │                         ┌────────┴────────┐
                │                        YES               NO
                │                         │                 │
                │                         ▼                 ▼
                │              ┌──────────────────┐  ┌─────────────┐
                │              │ PROPERTY STAFF   │  │ EXTERNAL    │
                │              │ (Works at property)│  │ USER        │
                │              └──────────────────┘  │ (Website)   │
                │                                    └─────────────┘
                │
                ▼
    ┌───────────────────────────────────────────────┐
    │     Determine Platform Staff Level            │
    └───────────────┬───────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┬───────────┬───────────┐
        │           │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼           ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Superuser│ │Platform│ │Operations│ │Regional│ │ Agent  │ │ Other  │
    │        │ │ Admin  │ │ Manager │ │Manager │ │        │ │        │
    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
        │           │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼           ▼
    All Data   All Data   All Data   Territory  Assigned  Custom
    + System   + Config   + Reports   Properties Properties Access
    Settings
```

## Detailed Decision Flow

### Step 1: Check Internal Role

```javascript
function determineUserType(user) {
  // Priority 1: Check for internal role (platform staff)
  if (user.internalRole) {
    return {
      userType: 'platform_staff',
      role: user.internalRole,
      accessLevel: getPlatformStaffAccessLevel(user.internalRole)
    };
  }
  
  // Continue to Step 2
  return checkPropertyRole(user);
}
```

### Step 2: Check Property Role

```javascript
function checkPropertyRole(user) {
  // Priority 2: Check for property owner role
  if (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner') {
    return {
      userType: 'property_owner',
      role: user.role,
      accessLevel: 'owned_properties'
    };
  }
  
  // Priority 3: Check for property staff role
  if (user.staffRole) {
    return {
      userType: 'property_staff',
      role: user.staffRole,
      accessLevel: 'assigned_property'
    };
  }
  
  // Default: External user
  return {
    userType: 'external_user',
    role: user.role || 'user',
    accessLevel: 'public_only'
  };
}
```

### Step 3: Determine Access Level

```javascript
function getPlatformStaffAccessLevel(internalRole) {
  switch (internalRole) {
    case 'superuser':
      return {
        scope: 'all',
        canBypassScoping: true,
        permissions: 'full_system_access'
      };
      
    case 'platform_admin':
      return {
        scope: 'all',
        canBypassScoping: true,
        permissions: 'platform_management'
      };
      
    case 'operations_manager':
      return {
        scope: 'all',
        canBypassScoping: true,
        permissions: 'operations_management'
      };
      
    case 'regional_manager':
      return {
        scope: 'territory',
        canBypassScoping: false,
        permissions: 'regional_management'
      };
      
    case 'agent':
      return {
        scope: 'assigned',
        canBypassScoping: false,
        permissions: 'agent_operations'
      };
      
    default:
      return {
        scope: 'custom',
        canBypassScoping: false,
        permissions: 'custom_permissions'
      };
  }
}
```

## Access Level Matrix

### Platform Staff Access Levels

```
┌──────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│                  │  Superuser   │Platform Admin│Operations Mgr│Regional Mgr  │
├──────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ All Properties   │      ✓       │      ✓       │      ✓       │      ✗       │
│ Territory Props  │      ✓       │      ✓       │      ✓       │      ✓       │
│ Assigned Props   │      ✓       │      ✓       │      ✓       │      ✓       │
│ System Settings  │      ✓       │      ✗       │      ✗       │      ✗       │
│ User Management  │      ✓       │      ✓       │      ✓       │      ✓*      │
│ Role Management  │      ✓       │      ✓       │      ✗       │      ✗       │
│ Audit Logs       │      ✓       │      ✓       │      ✓       │      ✓*      │
│ Analytics        │      ✓       │      ✓       │      ✓       │      ✓*      │
│ Commissions      │      ✓       │      ✓       │      ✓       │      ✓*      │
└──────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘

* = Scoped to their territory

┌──────────────────┬──────────────┐
│                  │    Agent     │
├──────────────────┼──────────────┤
│ All Properties   │      ✗       │
│ Territory Props  │      ✗       │
│ Assigned Props   │      ✓       │
│ System Settings  │      ✗       │
│ User Management  │      ✗       │
│ Role Management  │      ✗       │
│ Audit Logs       │      ✓*      │
│ Analytics        │      ✓*      │
│ Commissions      │      ✓*      │
└──────────────────┴──────────────┘

* = Scoped to their assigned properties
```

### Property Ecosystem Access Levels

```
┌──────────────────┬──────────────┬──────────────┐
│                  │Property Owner│Property Staff│
├──────────────────┼──────────────┼──────────────┤
│ Own Properties   │      ✓       │      ✗       │
│ Assigned Property│      ✓       │      ✓       │
│ Property Rooms   │      ✓       │      ✓       │
│ Bookings         │      ✓       │      ✓       │
│ Payments         │      ✓       │      ✓*      │
│ Staff Management │      ✓       │      ✗       │
│ Reports          │      ✓       │      ✓*      │
│ Settings         │      ✓       │      ✗       │
└──────────────────┴──────────────┴──────────────┘

* = Limited based on staffRole permissions
```

## Navigation Routing

### Route Determination Flow

```
User Authenticated
    │
    ▼
┌─────────────────────────────────────────┐
│ Determine User Type                     │
│ (using decision tree above)             │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┬────────────┬────────────┐
    │                 │            │            │
    ▼                 ▼            ▼            ▼
External User    Property Owner  Property Staff  Platform Staff
    │                 │            │            │
    ▼                 ▼            ▼            ▼
Redirect to      Property      Property      Platform
Main Website     Dashboard     Dashboard     Dashboard
                 (Sidebar)     (Sidebar)     (InternalSidebar)
```

### Dashboard Routes by User Type

| User Type | Default Route | Sidebar Component |
|-----------|--------------|-------------------|
| External User | `/` (main website) | None (redirected) |
| Property Owner | `/dashboard` | `Sidebar.tsx` |
| Property Staff | `/dashboard` | `Sidebar.tsx` (filtered) |
| Agent | `/agent-dashboard` | `InternalSidebar.tsx` |
| Regional Manager | `/regional-dashboard` | `InternalSidebar.tsx` |
| Operations Manager | `/operations-dashboard` | `InternalSidebar.tsx` |
| Platform Admin | `/platform-admin-dashboard` | `InternalSidebar.tsx` |
| Superuser | `/superuser-dashboard` | `InternalSidebar.tsx` |

## Role Conflict Prevention

### Invalid Role Combinations

The system prevents these invalid combinations:

```
❌ INVALID: internalRole + owner role
   Example: { role: 'owner', internalRole: 'agent' }
   Reason: Cannot be both property owner and platform staff

❌ INVALID: internalRole + staffRole
   Example: { internalRole: 'agent', staffRole: 'front_desk' }
   Reason: Platform staff cannot also be property staff

❌ INVALID: owner role + staffRole
   Example: { role: 'owner', staffRole: 'manager' }
   Reason: Property owners cannot also be property staff

✅ VALID: role='user' + staffRole
   Example: { role: 'user', staffRole: 'front_desk' }
   Reason: Property staff are users with staff role

✅ VALID: role='user' + internalRole
   Example: { role: 'user', internalRole: 'agent' }
   Reason: Platform staff can have base user role

✅ VALID: role='owner' only
   Example: { role: 'owner', internalRole: null, staffRole: null }
   Reason: Pure property owner

✅ VALID: internalRole only
   Example: { role: 'user', internalRole: 'agent', staffRole: null }
   Reason: Pure platform staff
```

### Validation Logic

```javascript
function validateRoleCombination(user) {
  const hasOwnerRole = ['owner', 'admin', 'category_owner'].includes(user.role);
  const hasInternalRole = !!user.internalRole;
  const hasStaffRole = !!user.staffRole;
  
  // Check for invalid combinations
  if (hasOwnerRole && hasInternalRole) {
    throw new Error('User cannot have both owner role and internal role');
  }
  
  if (hasInternalRole && hasStaffRole) {
    throw new Error('User cannot have both internal role and staff role');
  }
  
  if (hasOwnerRole && hasStaffRole) {
    throw new Error('User cannot have both owner role and staff role');
  }
  
  return true;
}
```

## Permission Set Selection

### Decision Logic

```javascript
function getPermissionSet(user) {
  // Platform staff use internalPermissions
  if (user.internalRole) {
    return user.internalPermissions || {};
  }
  
  // Property staff use permissions
  if (user.staffRole) {
    return user.permissions || {};
  }
  
  // Property owners have implicit full permissions for their properties
  if (['owner', 'admin', 'category_owner'].includes(user.role)) {
    return {
      canManageProperties: true,
      canManageRooms: true,
      canManageBookings: true,
      canManagePayments: true,
      canManageStaff: true,
      canViewReports: true
    };
  }
  
  // External users have no internal permissions
  return {};
}
```

## Code Examples

### Complete User Type Determination

```javascript
// backend/models/User.js

User.prototype.getUserType = function() {
  // Priority 1: Platform staff (has internalRole)
  if (this.internalRole) {
    return 'platform_staff';
  }
  
  // Priority 2: Property owner
  if (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') {
    return 'property_owner';
  }
  
  // Priority 3: Property staff (has staffRole)
  if (this.staffRole) {
    return 'property_staff';
  }
  
  // Default: External user
  return 'external_user';
};

User.prototype.isPropertyOwner = function() {
  return (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') 
    && !this.internalRole;
};

User.prototype.isPlatformStaff = function() {
  return !!this.internalRole;
};

User.prototype.isPropertyStaff = function() {
  return !!this.staffRole && !this.internalRole;
};

User.prototype.canBypassScoping = function() {
  return this.internalRole === 'superuser' 
    || this.internalRole === 'platform_admin'
    || this.internalRole === 'operations_manager';
};
```

### Frontend Route Guard

```typescript
// internal-management/app/components/PlatformRoute.tsx

export function PlatformRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Must have internal role to access platform routes
  if (!user?.internalRole) {
    // Redirect based on user type
    const userType = getUserType(user);
    
    switch (userType) {
      case 'property_owner':
      case 'property_staff':
        return <Navigate to="/dashboard" replace />;
      case 'external_user':
      default:
        return <Navigate to="/" replace />;
    }
  }
  
  return <>{children}</>;
}

function getUserType(user: User | null): string {
  if (!user) return 'external_user';
  
  if (user.internalRole) return 'platform_staff';
  if (user.role === 'owner' || user.role === 'admin') return 'property_owner';
  if (user.staffRole) return 'property_staff';
  
  return 'external_user';
}
```

## Testing User Type Determination

### Unit Test Example

```javascript
describe('User Type Determination', () => {
  it('should identify platform staff', () => {
    const user = { role: 'user', internalRole: 'agent', staffRole: null };
    expect(getUserType(user)).toBe('platform_staff');
  });
  
  it('should identify property owner', () => {
    const user = { role: 'owner', internalRole: null, staffRole: null };
    expect(getUserType(user)).toBe('property_owner');
  });
  
  it('should identify property staff', () => {
    const user = { role: 'user', internalRole: null, staffRole: 'front_desk' };
    expect(getUserType(user)).toBe('property_staff');
  });
  
  it('should identify external user', () => {
    const user = { role: 'user', internalRole: null, staffRole: null };
    expect(getUserType(user)).toBe('external_user');
  });
});
```

## Related Documentation

- [Data Scoping Guide](./DATA_SCOPING.md)
- [Platform Routes API](./PLATFORM_ROUTES_API.md)
- [Migration Strategy](./MIGRATION_STRATEGY.md)
- [Naming Conventions](./CONVENTIONS.md)
