# Design Document

## Overview

This design establishes a clear, maintainable role-based access control (RBAC) system for the GoRoomz platform. The system supports three distinct user ecosystems within a single internal-management application: external users (website visitors), property owners with their staff, and platform staff (internal company employees). The design ensures proper data isolation, role-based navigation, and automatic query scoping while maintaining code simplicity and developer experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internal Management App                   │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Property      │  │  Platform      │  │  Property     │ │
│  │  Owner View    │  │  Staff View    │  │  Staff View   │ │
│  │  (Sidebar)     │  │  (Internal     │  │  (Sidebar)    │ │
│  │                │  │   Sidebar)     │  │               │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│           │                   │                   │          │
│           └───────────────────┴───────────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │  Auth Context     │                    │
│                    │  Role Detection   │                    │
│                    └─────────┬─────────┘                    │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        Backend API                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Authentication Middleware                     │ │
│  │  - protectInternal (all internal-management routes)    │ │
│  │  - requirePlatformRole (platform/* routes)             │ │
│  │  - requirePropertyOwner (owner-specific routes)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Data Scoping Middleware                       │ │
│  │  - Property Owner: filter by owned properties          │ │
│  │  - Platform Staff: filter by territory/role            │ │
│  │  - Property Staff: filter by assigned property         │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Database Layer                         │ │
│  │  - User Model with role helpers                        │ │
│  │  - Sequelize with underscored: true                    │ │
│  │  - Automatic camelCase ↔ snake_case conversion        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### User Type Determination Flow

```
User Login
    │
    ▼
Check internalRole field
    │
    ├─ Has internalRole? ──→ Platform Staff
    │                         (agent, regional_manager, etc.)
    │
    ▼
Check role field
    │
    ├─ role = 'owner' or 'admin'? ──→ Property Owner
    │
    ├─ role = 'user'? ──→ External User (redirect to main site)
    │
    ▼
Check staffRole field
    │
    └─ Has staffRole? ──→ Property Staff
                          (front_desk, housekeeping, etc.)
```

## Components and Interfaces

### 1. User Model Enhancement

The User model will be enhanced with helper methods and clear field organization:

```javascript
// backend/models/User.js

// Field Organization:
// 1. Base Role (for property ecosystem)
role: ENUM('user', 'owner', 'category_owner', 'admin')

// 2. Platform Role (for internal staff)
internalRole: STRING (agent, regional_manager, operations_manager, platform_admin, superuser)

// 3. Property Role (for property staff)
staffRole: ENUM('front_desk', 'housekeeping', 'maintenance', 'manager')

// Helper Methods:
User.prototype.isPropertyOwner = function() {
  return (this.role === 'owner' || this.role === 'admin' || this.role === 'category_owner') 
    && !this.internalRole;
}

User.prototype.isPlatformStaff = function() {
  return !!this.internalRole;
}

User.prototype.isPropertyStaff = function() {
  return !!this.staffRole && !this.internalRole;
}

User.prototype.getUserType = function() {
  if (this.isPlatformStaff()) return 'platform_staff';
  if (this.isPropertyOwner()) return 'property_owner';
  if (this.isPropertyStaff()) return 'property_staff';
  return 'external_user';
}

User.prototype.getAccessiblePropertyIds = async function() {
  const userType = this.getUserType();
  
  if (userType === 'platform_staff') {
    // Superuser and platform_admin see all
    if (this.internalRole === 'superuser' || this.internalRole === 'platform_admin') {
      const properties = await Property.findAll({ attributes: ['id'] });
      return properties.map(p => p.id);
    }
    
    // Regional manager sees properties in their territory
    if (this.internalRole === 'regional_manager' && this.territoryId) {
      const properties = await Property.findAll({
        where: { territoryId: this.territoryId },
        attributes: ['id']
      });
      return properties.map(p => p.id);
    }
    
    // Agent sees assigned properties
    if (this.internalRole === 'agent') {
      const assignments = await PropertyAssignment.findAll({
        where: { agentId: this.id },
        attributes: ['propertyId']
      });
      return assignments.map(a => a.propertyId);
    }
  }
  
  if (userType === 'property_owner') {
    const properties = await Property.findAll({
      where: { ownerId: this.id },
      attributes: ['id']
    });
    return properties.map(p => p.id);
  }
  
  if (userType === 'property_staff') {
    // Staff assigned to specific property
    return this.assignedPropertyId ? [this.assignedPropertyId] : [];
  }
  
  return [];
}
```

### 2. Data Scoping Middleware

```javascript
// backend/middleware/dataScoping.js

/**
 * Middleware that automatically scopes database queries based on user type
 * Attaches scoping filters to req.dataScope for use in route handlers
 */
exports.applyScopingMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for data scoping'
      });
    }

    const userType = req.user.getUserType();
    const scope = {
      userType,
      propertyIds: [],
      canBypassScoping: false
    };

    // Superusers can bypass scoping
    if (req.user.internalRole === 'superuser') {
      scope.canBypassScoping = true;
      req.dataScope = scope;
      return next();
    }

    // Get accessible property IDs
    scope.propertyIds = await req.user.getAccessiblePropertyIds();

    // Attach scope to request
    req.dataScope = scope;
    next();
  } catch (error) {
    console.error('Data scoping middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying data scoping'
    });
  }
};

/**
 * Helper function to apply scoping to Sequelize queries
 * Usage: const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'propertyId');
 */
exports.applyScopeToWhere = (dataScope, baseWhere = {}, propertyIdField = 'propertyId') => {
  // If can bypass, return base where unchanged
  if (dataScope.canBypassScoping) {
    return baseWhere;
  }

  // If no accessible properties, return impossible condition
  if (!dataScope.propertyIds || dataScope.propertyIds.length === 0) {
    return {
      ...baseWhere,
      [propertyIdField]: null // Will match nothing
    };
  }

  // Add property scoping
  return {
    ...baseWhere,
    [propertyIdField]: {
      [Op.in]: dataScope.propertyIds
    }
  };
};
```

### 3. Route Organization

Routes will be organized with clear prefixes:

```
/api/internal/
├── auth/                    # Authentication (all users)
├── dashboard/               # Role-based dashboards
├── properties/              # Property management (scoped)
├── rooms/                   # Room management (scoped)
├── bookings/                # Booking management (scoped)
├── staff/                   # Property staff management (scoped)
├── reports/                 # Reports (scoped)
│
└── platform/                # Platform staff only
    ├── properties/          # All properties view
    ├── owners/              # Property owner management
    ├── agents/              # Agent management
    ├── territories/         # Territory management
    ├── commissions/         # Commission tracking
    ├── analytics/           # Platform analytics
    ├── subscriptions/       # Subscription management
    ├── audit-logs/          # Audit logs
    └── settings/            # System settings
```

### 4. Frontend Route Guards

```typescript
// internal-management/app/components/PlatformRoute.tsx

interface PlatformRouteProps {
  children: ReactNode;
  requiredRoles?: InternalRole[];
}

export function PlatformRoute({ children, requiredRoles }: PlatformRouteProps) {
  const { user, isLoading } = useAuth();
  const { hasAnyInternalRole } = useRole();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Must have internal role
  if (!user?.internalRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific role requirements
  if (requiredRoles && !hasAnyInternalRole(requiredRoles)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
```

## Data Models

### User Model Fields (Organized)

```javascript
// Base Information
id: UUID
name: STRING
email: STRING (unique)
password: STRING
phone: STRING
avatar: STRING

// Address Information
address: TEXT
country: STRING
state: STRING
city: STRING
landmark: STRING
pincode: STRING

// Role Fields (Primary Classification)
role: ENUM('user', 'owner', 'category_owner', 'admin')
  // 'user' = external website user
  // 'owner' = property owner
  // 'category_owner' = property owner with multiple properties
  // 'admin' = property owner with admin privileges

internalRole: STRING
  // Platform staff roles: agent, regional_manager, operations_manager, platform_admin, superuser
  // NULL for non-platform users

staffRole: ENUM('front_desk', 'housekeeping', 'maintenance', 'manager')
  // Property staff roles
  // NULL for non-staff users

// Permission Fields
permissions: JSONB
  // Property staff permissions
  // {canCheckIn, canCheckOut, canManageRooms, canRecordPayments, etc.}

internalPermissions: JSONB
  // Platform staff permissions
  // {canOnboardProperties, canApproveOnboardings, canManageAgents, etc.}

// Assignment Fields
territoryId: UUID (for platform staff)
managerId: UUID (for platform staff hierarchy)
assignedPropertyId: UUID (for property staff)
commissionRate: DECIMAL (for agents)

// Status Fields
isActive: BOOLEAN
isVerified: BOOLEAN
lastLoginAt: DATE

// Timestamps
createdAt: DATE
updatedAt: DATE
```

### Property Assignment Model (New)

```javascript
// backend/models/PropertyAssignment.js
// Tracks which agents/staff are assigned to which properties

PropertyAssignment {
  id: UUID
  userId: UUID (references User)
  propertyId: UUID (references Property)
  assignmentType: ENUM('agent', 'staff', 'manager')
  assignedAt: DATE
  assignedBy: UUID (references User)
  isActive: BOOLEAN
  createdAt: DATE
  updatedAt: DATE
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: User type classification

*For any* user with role fields set, the system should correctly classify them as property_owner, platform_staff, property_staff, or external_user based on their role field values.

**Validates: Requirements 1.1, 8.3**

### Property 2: Role priority enforcement

*For any* user with multiple role types, when determining access level, the system should prioritize internalRole over role over staffRole.

**Validates: Requirements 1.2**

### Property 3: Permission set selection

*For any* user, when evaluating permissions, the system should use internalPermissions if they have internalRole, otherwise use permissions if they have staffRole.

**Validates: Requirements 1.3**

### Property 4: Role conflict prevention

*For any* user creation or update attempt, if both internalRole and owner role are set, the system should reject the operation.

**Validates: Requirements 1.5, 8.4**

### Property 5: Property owner data scoping

*For any* property owner querying properties, bookings, rooms, staff, or reports, the system should return only data associated with properties they own.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 12.1**

### Property 6: Superuser bypass

*For any* user with superuser or platform_admin internalRole, queries should return all data without property filtering.

**Validates: Requirements 3.1, 4.4, 12.5**

### Property 7: Territory-based scoping

*For any* regional_manager with assigned territory, queries should return only properties within their territory.

**Validates: Requirements 3.2, 4.3, 12.2**

### Property 8: Agent assignment scoping

*For any* agent, queries should return only properties they are explicitly assigned to.

**Validates: Requirements 3.3**

### Property 9: Platform route protection

*For any* user without internalRole attempting to access /platform/ routes, the system should return 403 Forbidden.

**Validates: Requirements 3.4, 6.2, 6.3, 6.5**

### Property 10: Scoping bypass prevention

*For any* query attempting to bypass data scoping filters, the system should block the query and log the attempt.

**Validates: Requirements 4.5**

### Property 11: Navigation reactivity

*For any* user whose role changes, the navigation menu should update to reflect new permissions without requiring re-login.

**Validates: Requirements 5.3**

### Property 12: Unauthorized route redirect

*For any* user accessing a route not authorized for their role, the system should redirect them to their default dashboard.

**Validates: Requirements 5.4**

### Property 13: Sidebar component selection

*For any* user, the system should render Sidebar component for property owners/staff and InternalSidebar for platform staff.

**Validates: Requirements 5.5**

### Property 14: Property staff scoping

*For any* property staff member, queries should return only data for their assigned property.

**Validates: Requirements 7.2, 7.3, 12.3**

### Property 15: Property staff assignment

*For any* property owner creating staff, the system should automatically assign the staff to one of the owner's properties.

**Validates: Requirements 7.4, 10.1**

### Property 16: Self-permission modification prevention

*For any* property staff attempting to modify their own permissions, the system should reject the operation.

**Validates: Requirements 7.5**

### Property 17: Staff permission scope validation

*For any* property owner updating staff permissions, the system should validate that permissions are within the allowed scope for property staff.

**Validates: Requirements 10.2**

### Property 18: Staff deactivation access revocation

*For any* property staff that is deactivated, the system should immediately prevent their authentication and data access.

**Validates: Requirements 10.3**

### Property 19: Platform role creation prevention

*For any* property owner attempting to create or assign internalRole to a user, the system should reject the operation.

**Validates: Requirements 10.4**

### Property 20: Owner audit log access

*For any* property owner querying audit logs, the system should return only logs for actions performed by their property staff.

**Validates: Requirements 10.5**

### Property 21: Accessible property IDs calculation

*For any* user, the getAccessiblePropertyIds() method should return the correct set of property IDs based on their user type and assignments.

**Validates: Requirements 11.5**

### Property 22: Filter merging

*For any* query with explicit property filters, the system should combine them with scoping filters using AND logic, not replace them.

**Validates: Requirements 12.4**

### Property 23: Sequelize case conversion

*For any* database operation, Sequelize should automatically convert between camelCase (JavaScript) and snake_case (database) for all field names.

**Validates: Requirements 13.3**

### Property 24: API response case format

*For any* API response, all JSON field names should be in camelCase format.

**Validates: Requirements 13.4**

## Error Handling

### Authentication Errors

1. **No Token Provided**: Return 401 with clear message
2. **Invalid Token**: Return 401 with token expiration info
3. **User Not Found**: Return 401 with account status message
4. **Inactive Account**: Return 403 with deactivation reason

### Authorization Errors

1. **Insufficient Permissions**: Return 403 with required permission list
2. **Wrong User Type**: Return 403 with explanation of user type mismatch
3. **Territory Mismatch**: Return 403 for regional managers accessing out-of-territory data
4. **Property Access Denied**: Return 403 when accessing properties outside scope

### Data Scoping Errors

1. **No Accessible Properties**: Return empty array with 200 status
2. **Scoping Middleware Failure**: Return 500 with error logged
3. **Invalid Property ID**: Return 404 with property not found message

### Validation Errors

1. **Role Conflict**: Return 400 with explanation of conflicting roles
2. **Invalid Permission**: Return 400 with list of valid permissions
3. **Self-Permission Modification**: Return 403 with explanation
4. **Invalid Role Assignment**: Return 400 when property owner tries to assign internalRole

## Testing Strategy

### Unit Testing

Unit tests will cover:
- User model helper methods (isPropertyOwner, isPlatformStaff, etc.)
- Data scoping utility functions (applyScopeToWhere)
- Permission validation logic
- Role conflict detection
- Case conversion utilities

### Property-Based Testing

We will use **fast-check** (JavaScript property-based testing library) configured to run a minimum of 100 iterations per property.

Each property-based test will be tagged with a comment referencing the design document:
```javascript
/**
 * Feature: role-segregation-optimization, Property 5: Property owner data scoping
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 12.1
 */
test('property owners only see their own data', async () => {
  await fc.assert(
    fc.asyncProperty(
      generators.user({ userType: 'property_owner' }),
      generators.properties(),
      async (owner, allProperties) => {
        // Test implementation
      }
    ),
    { numRuns: 100 }
  );
});
```

Property tests will cover:
- User type classification across all role combinations
- Data scoping for all user types and query types
- Permission evaluation logic
- Route protection for all route types
- Filter merging logic
- Case conversion round-trips

### Integration Testing

Integration tests will verify:
- Complete authentication → authorization → data scoping flow
- Multi-user scenarios (owner + staff + platform staff)
- Role changes and their effects
- Cross-boundary access attempts
- Audit log generation for all user types

### Test Data Generators

We will create smart generators that produce realistic test data:

```javascript
// Generators for property-based tests
const generators = {
  user: (options = {}) => {
    // Generate users with specific characteristics
    // Ensures valid role combinations
  },
  
  propertyOwner: () => {
    // Generate property owner with owned properties
  },
  
  platformStaff: (role) => {
    // Generate platform staff with appropriate permissions
  },
  
  propertyStaff: () => {
    // Generate property staff with assignment
  },
  
  properties: () => {
    // Generate properties with various owners
  },
  
  territory: () => {
    // Generate territory with assigned properties
  }
};
```

## Implementation Notes

### Database Migration Strategy

1. **Phase 1**: Add helper methods to User model (no schema changes)
2. **Phase 2**: Create PropertyAssignment table
3. **Phase 3**: Add assignedPropertyId to User model for property staff
4. **Phase 4**: Migrate existing data to new structure
5. **Phase 5**: Add validation constraints

### Backward Compatibility

- Existing routes will continue to work
- New /platform/ routes will be added alongside existing routes
- Data scoping will be opt-in initially, then enforced
- Migration scripts will handle existing user data

### Performance Considerations

1. **Property ID Caching**: Cache accessible property IDs in user session
2. **Query Optimization**: Use database indexes on property_id, territory_id
3. **Middleware Ordering**: Place data scoping after auth but before business logic
4. **Lazy Loading**: Only calculate accessible properties when needed

### Security Considerations

1. **SQL Injection**: Use parameterized queries via Sequelize
2. **Privilege Escalation**: Validate role changes server-side
3. **Data Leakage**: Ensure scoping applies to all query types (find, count, aggregate)
4. **Audit Trail**: Log all permission checks and access denials
5. **Session Security**: Invalidate sessions on role change

## Deployment Strategy

### Rollout Plan

1. **Week 1**: Deploy User model enhancements and helper methods
2. **Week 2**: Deploy data scoping middleware (logging only, not enforcing)
3. **Week 3**: Analyze logs, fix edge cases
4. **Week 4**: Enable enforcement for property owners
5. **Week 5**: Enable enforcement for platform staff
6. **Week 6**: Enable enforcement for property staff
7. **Week 7**: Deploy /platform/ routes
8. **Week 8**: Update frontend navigation and route guards

### Rollback Plan

- Feature flags for data scoping enforcement
- Ability to disable scoping per user type
- Database migration rollback scripts
- Frontend route fallbacks

### Monitoring

- Track data scoping performance impact
- Monitor 403 error rates
- Log scoping bypass attempts
- Alert on role conflict attempts
- Dashboard for access patterns by user type
