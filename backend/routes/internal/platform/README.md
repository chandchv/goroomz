# Platform Routes

This directory contains routes that are accessible **only to platform staff** (users with `internalRole`).

## Requirements

These routes implement Requirements 6.1, 6.2, 6.3, 6.4, and 6.5 from the role-segregation-optimization spec:
- 6.1: All platform staff routes are organized under `/platform/` prefix
- 6.2: Property owners attempting to access `/platform/` routes receive 403 Forbidden
- 6.3: Platform staff access to `/platform/` routes requires `internalRole` verification
- 6.4: Property management routes remain at root level (`/properties`, `/rooms`, `/bookings`)
- 6.5: Route guards enforce platform route access restrictions

## Route Structure

```
/api/internal/platform/
├── properties/     # All-properties view for platform staff
├── owners/         # Property owner management
└── agents/         # Agent management
```

## Access Control

All routes in this directory:
1. Require authentication via `protectInternal` middleware
2. Require platform role via `requirePlatformRole()` middleware
3. Apply data scoping based on user's internal role (superuser, platform_admin, regional_manager, etc.)

### Middleware Chain

```javascript
router.get('/endpoint',
  protectInternal,           // Step 1: Verify authentication
  requirePlatformRole(),     // Step 2: Verify platform staff role
  applyScopingMiddleware,    // Step 3: Apply data scoping
  handler                    // Step 4: Execute route logic
);
```

## Route Files

### properties.js
Platform-wide property management for platform staff.

**Key Endpoints:**
- `GET /` - Get all properties (with scoping)
- `GET /:id` - Get property details
- `GET /statistics/overview` - Platform-wide property statistics
- `PUT /:id/status` - Activate/deactivate properties

**Access Levels:**
- All platform staff can view properties (scoped by role)
- Superuser, platform_admin, operations_manager can modify properties

### owners.js
Property owner management for platform staff.

**Key Endpoints:**
- `GET /` - Get all property owners
- `POST /` - Create new property owner
- `GET /:id` - Get owner details
- `PUT /:id` - Update owner
- `PUT /:id/deactivate` - Deactivate owner account
- `PUT /:id/activate` - Reactivate owner account
- `GET /statistics/overview` - Platform-wide owner statistics

**Access Levels:**
- All platform staff can view owners
- Superuser, platform_admin, operations_manager can create/modify owners
- Only superuser and platform_admin can deactivate/activate owners

### agents.js
Agent management for platform staff.

**Key Endpoints:**
- `GET /` - Get all agents
- `POST /` - Create new agent
- `GET /:id` - Get agent details
- `PUT /:id` - Update agent
- `PUT /:id/deactivate` - Deactivate agent account
- `PUT /:id/activate` - Reactivate agent account
- `GET /statistics/overview` - Platform-wide agent statistics

**Access Levels:**
- All platform staff can view agents (regional managers see only their territory)
- Superuser, platform_admin, operations_manager, regional_manager can create/modify agents
- Only superuser, platform_admin, operations_manager can deactivate/activate agents

## Data Scoping

Platform routes automatically apply data scoping based on the user's role:

- **Superuser/Platform Admin**: See all data without filtering
- **Operations Manager**: See all data without filtering
- **Regional Manager**: See only data in their assigned territory
- **Agent**: See only data they are assigned to

This is handled by the `applyScopingMiddleware` and `applyScopeToWhere` functions from `backend/middleware/dataScoping.js`.

## Error Responses

### 401 Unauthorized
User is not authenticated.

### 403 Forbidden
User does not have platform staff role (no `internalRole`).

```json
{
  "success": false,
  "message": "Access denied. This endpoint is for platform staff only.",
  "userType": "property_owner"
}
```

### 404 Not Found
Resource not found or access denied due to scoping.

## Testing

To test platform routes:

1. Authenticate as a platform staff user (with `internalRole`)
2. Include the JWT token in the Authorization header
3. Make requests to `/api/internal/platform/*` endpoints

Example:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/internal/platform/properties
```

## Migration from Existing Routes

Some functionality previously in `/api/internal/superuser` has been moved to platform routes:
- Property owner management → `/api/internal/platform/owners`
- All-properties view → `/api/internal/platform/properties`

The `/api/internal/superuser` route still exists for backward compatibility but new features should use platform routes.
