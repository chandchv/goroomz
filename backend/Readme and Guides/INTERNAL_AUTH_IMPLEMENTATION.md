# Internal Management Authentication Implementation

## Overview
This document describes the implementation of authentication and authorization for the Internal Management System.

## Requirements Addressed
- **Requirement 32.1**: Internal management app authentication with backend API
- **Requirement 33.1**: Staff user accounts with role-based permissions
- **Requirement 33.2**: Front desk staff access control
- **Requirement 33.3**: Housekeeping staff access control
- **Requirement 33.4**: Maintenance staff access control
- **Requirement 33.5**: Manager access control

## Implementation Details

### 1. Internal Authentication Middleware (`backend/middleware/internalAuth.js`)

#### `protectInternal`
- Verifies JWT tokens for internal management users
- Ensures user has appropriate role (admin, owner, category_owner) or staffRole
- Rejects regular users without internal management access
- Returns 401 for invalid/missing tokens
- Returns 403 for users without internal access

#### `authorizeRoles(...roles)`
- Checks if user has one of the specified roles
- Used for role-based access control (e.g., admin, owner)
- Returns 403 if user role doesn't match

#### `authorizeStaffRoles(...staffRoles)`
- Checks if user has one of the specified staff roles
- Admins and owners bypass this check (have all staff permissions)
- Used for staff-specific endpoints (e.g., front_desk, housekeeping, maintenance, manager)
- Returns 403 if staff role doesn't match

#### `requirePermissions(...permissions)`
- Checks if user has specific permissions
- Admins bypass this check (have all permissions)
- Validates against user.permissions JSONB field
- Returns 403 with list of missing permissions

#### `requireSuperuser`
- Restricts access to admin users only
- Used for system-wide management (property owner management, etc.)
- Returns 403 for non-admin users

### 2. Internal Authentication Routes (`backend/routes/internal/auth.js`)

#### POST `/api/internal/auth/login`
- Authenticates staff users, property owners, and admins
- Validates email and password
- Checks for internal management access
- Returns JWT token and user info including role, staffRole, and permissions
- Rejects social login users (Firebase-only accounts)
- Rejects regular users without internal access

#### POST `/api/internal/auth/logout`
- Logs out the current user
- Client-side token removal (JWT-based)
- Can be extended for token blacklisting if needed

#### GET `/api/internal/auth/me`
- Returns current authenticated user information
- Includes internal management specific fields:
  - role
  - staffRole
  - permissions
- Protected by `protectInternal` middleware

#### GET `/api/internal/auth/verify`
- Verifies token validity
- Returns basic user info
- Useful for checking authentication status on app load

### 3. Server Configuration (`backend/server.js`)

Routes registered at:
- `/api/internal/auth/*` - Internal management authentication

## User Roles and Access

### Admin
- Full system access
- Can manage property owners
- Bypasses all permission checks
- Access to all internal management features

### Owner / Category Owner
- Property management access
- Can manage their properties
- Can create staff users
- Access to reports and financial data

### Staff Roles

#### Front Desk (`front_desk`)
- Check-in/check-out operations
- Booking management
- Payment recording
- Limited room management

#### Housekeeping (`housekeeping`)
- Room status updates
- Cleaning task management
- View room status

#### Maintenance (`maintenance`)
- Maintenance request viewing
- Status updates
- Work logging

#### Manager (`manager`)
- All staff functions
- Reports access
- Financial data access
- Staff management (if permission granted)

## Permission System

Permissions are stored in the `permissions` JSONB field on the User model:

```javascript
{
  canCheckIn: boolean,
  canCheckOut: boolean,
  canManageRooms: boolean,
  canRecordPayments: boolean,
  canViewReports: boolean,
  canManageStaff: boolean,
  canUpdateRoomStatus: boolean,
  canManageMaintenance: boolean
}
```

## Testing

Comprehensive test suite in `backend/tests/internalAuth.test.js`:
- ✅ 16 tests covering all middleware functions
- ✅ Token validation
- ✅ Role-based authorization
- ✅ Staff role authorization
- ✅ Permission-based authorization
- ✅ Superuser authorization

Run tests with:
```bash
npm test -- internalAuth.test.js
```

## Security Features

1. **JWT Token Verification**: All requests require valid JWT tokens
2. **Role-Based Access Control**: Multiple levels of authorization
3. **Permission Granularity**: Fine-grained permission system
4. **Internal Access Restriction**: Regular users cannot access internal endpoints
5. **Token Expiration**: Tokens expire after configured period (default 7 days)

## Usage Examples

### Protecting a Route
```javascript
const { protectInternal, authorizeRoles } = require('../middleware/internalAuth');

// Only authenticated internal users
router.get('/dashboard', protectInternal, getDashboard);

// Only admins and owners
router.post('/rooms', protectInternal, authorizeRoles('admin', 'owner'), createRoom);
```

### Staff Role Protection
```javascript
const { protectInternal, authorizeStaffRoles } = require('../middleware/internalAuth');

// Only front desk staff (admins/owners can also access)
router.post('/checkin', protectInternal, authorizeStaffRoles('front_desk', 'manager'), checkIn);

// Only housekeeping staff
router.put('/rooms/:id/clean', protectInternal, authorizeStaffRoles('housekeeping'), markClean);
```

### Permission-Based Protection
```javascript
const { protectInternal, requirePermissions } = require('../middleware/internalAuth');

// Requires specific permissions
router.post('/payments', protectInternal, requirePermissions('canRecordPayments'), recordPayment);
```

### Superuser Protection
```javascript
const { protectInternal, requireSuperuser } = require('../middleware/internalAuth');

// Only admins
router.post('/property-owners', protectInternal, requireSuperuser, createPropertyOwner);
```

## Next Steps

The following tasks will build upon this authentication foundation:
- Task 3: Core API endpoints for room management
- Task 4: Booking management endpoints
- Task 5: Payment management endpoints
- Task 6: Housekeeping and maintenance endpoints
- Task 7: Reporting endpoints
- Task 8: Dashboard and staff management
- Task 9: Superuser management

All these endpoints will use the authentication and authorization middleware implemented in this task.
