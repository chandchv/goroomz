# Platform Routes API Documentation

This document describes the platform-specific routes available under the `/api/internal/platform/` prefix. These routes are accessible only to platform staff with appropriate `internalRole` permissions.

## Overview

Platform routes are segregated from property management routes to provide clear separation between:
- **Property Management**: Routes for property owners and their staff (e.g., `/api/internal/properties`)
- **Platform Management**: Routes for internal company staff (e.g., `/api/internal/platform/properties`)

## Authentication & Authorization

All platform routes require:
1. **Authentication**: Valid JWT token via `protectInternal` middleware
2. **Authorization**: User must have an `internalRole` (verified by `requirePlatformRole` middleware)
3. **Data Scoping**: Queries are automatically scoped based on role level (via `applyScopingMiddleware`)

### Access Levels

| Internal Role | Access Level | Description |
|--------------|--------------|-------------|
| `superuser` | Full Access | Can view and manage all platform data without restrictions |
| `platform_admin` | Full Access | Can view and manage all platform data without restrictions |
| `operations_manager` | Full Access | Can view and manage all platform data without restrictions |
| `regional_manager` | Territory-Scoped | Can only access properties within assigned territory |
| `agent` | Assignment-Scoped | Can only access properties explicitly assigned to them |

## Route Structure

```
/api/internal/platform/
├── properties/          # All properties management
├── owners/              # Property owner management
├── agents/              # Agent management
├── territories/         # Territory management (already exists at /api/internal/territories)
├── commissions/         # Commission tracking (already exists at /api/internal/commissions)
├── analytics/           # Platform analytics (already exists at /api/internal/analytics)
├── subscriptions/       # Subscription management (already exists at /api/internal/subscriptions)
├── audit-logs/          # Audit logs (already exists at /api/internal/audit)
└── settings/            # System settings (already exists at /api/internal/superuser)
```

## Platform Properties Routes

**Base Path**: `/api/internal/platform/properties`

### GET /api/internal/platform/properties

Get all properties across the platform (scoped by role).

**Authorization**: Requires `internalRole`

**Query Parameters**:
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by property status
- `territoryId` (UUID, optional): Filter by territory
- `ownerId` (UUID, optional): Filter by owner

**Response**:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "uuid",
        "name": "Property Name",
        "address": "123 Main St",
        "ownerId": "uuid",
        "ownerName": "John Doe",
        "territoryId": "uuid",
        "territoryName": "North Region",
        "status": "active",
        "totalRooms": 50,
        "occupiedRooms": 35,
        "occupancyRate": 70,
        "monthlyRevenue": 50000,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### GET /api/internal/platform/properties/:id

Get detailed information about a specific property.

**Authorization**: Requires `internalRole` and access to the property

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Property Name",
    "address": "123 Main St",
    "city": "City",
    "state": "State",
    "country": "Country",
    "pincode": "12345",
    "ownerId": "uuid",
    "owner": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234"
    },
    "territoryId": "uuid",
    "territory": {
      "id": "uuid",
      "name": "North Region",
      "regionalManagerId": "uuid"
    },
    "assignedAgents": [
      {
        "id": "uuid",
        "name": "Agent Name",
        "email": "agent@example.com",
        "assignedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "stats": {
      "totalRooms": 50,
      "occupiedRooms": 35,
      "occupancyRate": 70,
      "monthlyRevenue": 50000,
      "totalBookings": 120,
      "activeBookings": 35
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/internal/platform/properties/:id

Update property information (platform admin only).

**Authorization**: Requires `platform_admin` or `superuser` role

**Request Body**:
```json
{
  "name": "Updated Property Name",
  "territoryId": "uuid",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Property Name",
    "territoryId": "uuid",
    "status": "active",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Platform Owners Routes

**Base Path**: `/api/internal/platform/owners`

### GET /api/internal/platform/owners

Get all property owners.

**Authorization**: Requires `internalRole`

**Query Parameters**:
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `status` (string, optional): Filter by status (active, inactive)
- `territoryId` (UUID, optional): Filter by territory

**Response**:
```json
{
  "success": true,
  "data": {
    "owners": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-1234",
        "role": "owner",
        "isActive": true,
        "propertyCount": 3,
        "totalRooms": 150,
        "totalRevenue": 150000,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### GET /api/internal/platform/owners/:id

Get detailed information about a property owner.

**Authorization**: Requires `internalRole`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "role": "owner",
    "isActive": true,
    "properties": [
      {
        "id": "uuid",
        "name": "Property 1",
        "totalRooms": 50,
        "occupancyRate": 70,
        "monthlyRevenue": 50000
      }
    ],
    "stats": {
      "totalProperties": 3,
      "totalRooms": 150,
      "averageOccupancy": 75,
      "totalRevenue": 150000,
      "totalBookings": 500
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/internal/platform/owners

Create a new property owner account.

**Authorization**: Requires `platform_admin` or `superuser` role

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "password": "securePassword123",
  "address": "123 Main St",
  "city": "City",
  "state": "State",
  "country": "Country",
  "pincode": "12345"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "owner",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/internal/platform/owners/:id

Update property owner information.

**Authorization**: Requires `platform_admin` or `superuser` role

**Request Body**:
```json
{
  "name": "John Doe Updated",
  "phone": "555-5678",
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe Updated",
    "phone": "555-5678",
    "isActive": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /api/internal/platform/owners/:id

Deactivate a property owner account.

**Authorization**: Requires `superuser` role

**Response**:
```json
{
  "success": true,
  "message": "Property owner deactivated successfully"
}
```

## Platform Agents Routes

**Base Path**: `/api/internal/platform/agents`

### GET /api/internal/platform/agents

Get all agents.

**Authorization**: Requires `regional_manager`, `operations_manager`, `platform_admin`, or `superuser` role

**Query Parameters**:
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `territoryId` (UUID, optional): Filter by territory
- `status` (string, optional): Filter by status

**Response**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "uuid",
        "name": "Agent Name",
        "email": "agent@example.com",
        "internalRole": "agent",
        "territoryId": "uuid",
        "territoryName": "North Region",
        "managerId": "uuid",
        "managerName": "Manager Name",
        "assignedProperties": 5,
        "commissionRate": 5.5,
        "totalCommissions": 25000,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "pages": 2
    }
  }
}
```

### GET /api/internal/platform/agents/:id

Get detailed information about an agent.

**Authorization**: Requires `internalRole` with appropriate access

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com",
    "internalRole": "agent",
    "territoryId": "uuid",
    "territory": {
      "id": "uuid",
      "name": "North Region"
    },
    "managerId": "uuid",
    "manager": {
      "id": "uuid",
      "name": "Manager Name",
      "internalRole": "regional_manager"
    },
    "assignedProperties": [
      {
        "id": "uuid",
        "name": "Property Name",
        "assignedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "commissionRate": 5.5,
    "performance": {
      "totalCommissions": 25000,
      "propertiesOnboarded": 10,
      "activeProperties": 5,
      "monthlyTarget": 50000,
      "targetProgress": 50
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/internal/platform/agents

Create a new agent account.

**Authorization**: Requires `regional_manager`, `operations_manager`, `platform_admin`, or `superuser` role

**Request Body**:
```json
{
  "name": "Agent Name",
  "email": "agent@example.com",
  "password": "securePassword123",
  "phone": "555-1234",
  "territoryId": "uuid",
  "managerId": "uuid",
  "commissionRate": 5.5,
  "internalPermissions": {
    "canOnboardProperties": true,
    "canManageLeads": true,
    "canViewCommissions": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com",
    "internalRole": "agent",
    "territoryId": "uuid",
    "managerId": "uuid",
    "commissionRate": 5.5,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/internal/platform/agents/:id

Update agent information.

**Authorization**: Requires `regional_manager` (for their agents), `operations_manager`, `platform_admin`, or `superuser` role

**Request Body**:
```json
{
  "territoryId": "uuid",
  "commissionRate": 6.0,
  "internalPermissions": {
    "canOnboardProperties": true,
    "canManageLeads": true,
    "canViewCommissions": true,
    "canApproveOnboardings": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "territoryId": "uuid",
    "commissionRate": 6.0,
    "internalPermissions": {
      "canOnboardProperties": true,
      "canManageLeads": true,
      "canViewCommissions": true,
      "canApproveOnboardings": true
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/internal/platform/agents/:id/assign-property

Assign a property to an agent.

**Authorization**: Requires `regional_manager`, `operations_manager`, `platform_admin`, or `superuser` role

**Request Body**:
```json
{
  "propertyId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "propertyId": "uuid",
    "assignmentType": "agent",
    "assignedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /api/internal/platform/agents/:id/assign-property/:propertyId

Remove property assignment from an agent.

**Authorization**: Requires `regional_manager`, `operations_manager`, `platform_admin`, or `superuser` role

**Response**:
```json
{
  "success": true,
  "message": "Property assignment removed successfully"
}
```

## Error Responses

All platform routes return consistent error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Platform staff role required.",
  "requiredRole": "internalRole"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Data Scoping

All platform routes automatically apply data scoping based on the user's role:

- **Superuser/Platform Admin**: No scoping, can access all data
- **Operations Manager**: No scoping, can access all data
- **Regional Manager**: Scoped to properties in their assigned territory
- **Agent**: Scoped to properties explicitly assigned to them

See [DATA_SCOPING.md](./DATA_SCOPING.md) for detailed information about data scoping behavior.

## Rate Limiting

Platform routes are subject to rate limiting:
- **Standard Users**: 100 requests per minute
- **Platform Admin**: 500 requests per minute
- **Superuser**: 1000 requests per minute

## Audit Logging

All platform route actions are automatically logged to the audit log system, including:
- User who performed the action
- Action type (create, read, update, delete)
- Resource affected
- Timestamp
- IP address
- Changes made (for updates)

## Related Documentation

- [Data Scoping Guide](./DATA_SCOPING.md)
- [User Type Decision Tree](./USER_TYPE_DECISION_TREE.md)
- [Migration Strategy](./MIGRATION_STRATEGY.md)
- [Naming Conventions](./CONVENTIONS.md)
