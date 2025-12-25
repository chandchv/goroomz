# Internal User Roles API Documentation

## Overview

This document provides comprehensive API documentation for the Internal User Role Management System. This system enables a hierarchy of internal staff roles (Marketing/Sales Agents, Regional Managers, Operations Managers, Platform Administrators, and Superusers) to manage the GoRoomz platform.

## Base URL

```
/api/internal
```

## Authentication

All endpoints require JWT authentication with an internal user role. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Role Hierarchy

- **Agent**: Marketing/Sales Agent who onboards properties
- **Regional Manager**: Oversees agents and territories
- **Operations Manager**: Manages platform-wide operations
- **Platform Admin**: Configures system settings
- **Superuser**: Complete platform access

## Common Response Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Internal Role Management

### Get All Roles

```
GET /api/internal/roles
```

**Permissions**: All internal users

**Response**:
```json
{
  "success": true,
  "roles": [
    {
      "id": "uuid",
      "name": "agent",
      "displayName": "Marketing/Sales Agent",
      "description": "Onboards new properties",
      "defaultPermissions": {
        "canOnboardProperties": true,
        "canApproveOnboardings": false
      },
      "isCustom": false
    }
  ]
}
```

### Create Custom Role

```
POST /api/internal/roles
```

**Permissions**: Superuser only

**Request Body**:
```json
{
  "name": "custom_role_name",
  "displayName": "Custom Role Display Name",
  "description": "Role description",
  "defaultPermissions": {
    "canOnboardProperties": true,
    "canManageAgents": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "role": {
    "id": "uuid",
    "name": "custom_role_name",
    "displayName": "Custom Role Display Name",
    "isCustom": true
  }
}
```

### Update Role Permissions

```
PUT /api/internal/roles/:id
```

**Permissions**: Superuser only

**Request Body**:
```json
{
  "defaultPermissions": {
    "canOnboardProperties": true,
    "canManageAgents": true
  }
}
```

### Delete Custom Role

```
DELETE /api/internal/roles/:id
```

**Permissions**: Superuser only

**Response**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

### Get Users with Role

```
GET /api/internal/roles/:id/users
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true
    }
  ]
}
```

---

## Internal User Management

### Get All Internal Users

```
GET /api/internal/users
```

**Permissions**: Platform Admin, Superuser

**Query Parameters**:
- `role`: Filter by role (agent, regional_manager, etc.)
- `isActive`: Filter by active status (true/false)
- `territoryId`: Filter by territory

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "internalRole": "agent",
      "territoryId": "uuid",
      "isActive": true,
      "lastLoginAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

### Create Internal User

```
POST /api/internal/users
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "internalRole": "agent",
  "territoryId": "uuid",
  "managerId": "uuid",
  "commissionRate": 5.0,
  "sendCredentials": true
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "internalRole": "agent",
    "temporaryPassword": "temp123" // Only if sendCredentials is false
  }
}
```

### Get User Details

```
GET /api/internal/users/:id
```

**Permissions**: Platform Admin, Superuser, or self

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "internalRole": "agent",
    "internalPermissions": {
      "canOnboardProperties": true
    },
    "territoryId": "uuid",
    "managerId": "uuid",
    "commissionRate": 5.0,
    "isActive": true,
    "lastLoginAt": "2025-11-20T10:00:00Z"
  }
}
```

### Update User

```
PUT /api/internal/users/:id
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "name": "John Doe Updated",
  "phone": "+1234567890",
  "territoryId": "uuid",
  "commissionRate": 6.0
}
```

### Deactivate User

```
DELETE /api/internal/users/:id
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### Update User Permissions

```
PUT /api/internal/users/:id/permissions
```

**Permissions**: Superuser only

**Request Body**:
```json
{
  "internalPermissions": {
    "canOnboardProperties": true,
    "canManageAgents": false
  }
}
```

### Assign Territory

```
PUT /api/internal/users/:id/territory
```

**Permissions**: Regional Manager (for their territory), Platform Admin, Superuser

**Request Body**:
```json
{
  "territoryId": "uuid"
}
```

### Get User Performance

```
GET /api/internal/users/:id/performance
```

**Permissions**: Regional Manager (for their agents), Platform Admin, Superuser, or self

**Query Parameters**:
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)

**Response**:
```json
{
  "success": true,
  "performance": {
    "propertiesOnboarded": 15,
    "conversionRate": 75.5,
    "commissionEarned": 5000.00,
    "averageOnboardingTime": 7.5
  }
}
```

---

## Lead Management

### Get All Leads

```
GET /api/internal/leads
```

**Permissions**: All internal users (filtered by role/territory)

**Query Parameters**:
- `status`: Filter by status (contacted, in_progress, pending_approval, approved, rejected, lost)
- `agentId`: Filter by agent
- `territoryId`: Filter by territory
- `startDate`: Filter by creation date
- `endDate`: Filter by creation date

**Response**:
```json
{
  "success": true,
  "leads": [
    {
      "id": "uuid",
      "propertyOwnerName": "ABC Hotels",
      "email": "owner@abchotels.com",
      "phone": "+1234567890",
      "businessName": "ABC Hotels Pvt Ltd",
      "propertyType": "hotel",
      "city": "Mumbai",
      "status": "in_progress",
      "agentId": "uuid",
      "agentName": "John Doe",
      "createdAt": "2025-11-15T10:00:00Z"
    }
  ]
}
```

### Create Lead

```
POST /api/internal/leads
```

**Permissions**: Agent, Regional Manager, Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "propertyOwnerName": "ABC Hotels",
  "email": "owner@abchotels.com",
  "phone": "+1234567890",
  "businessName": "ABC Hotels Pvt Ltd",
  "propertyType": "hotel",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "estimatedRooms": 50,
  "source": "referral",
  "notes": "Interested in premium listing"
}
```

**Response**:
```json
{
  "success": true,
  "lead": {
    "id": "uuid",
    "propertyOwnerName": "ABC Hotels",
    "status": "contacted",
    "agentId": "uuid"
  }
}
```

### Get Lead Details

```
GET /api/internal/leads/:id
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "lead": {
    "id": "uuid",
    "propertyOwnerName": "ABC Hotels",
    "email": "owner@abchotels.com",
    "phone": "+1234567890",
    "businessName": "ABC Hotels Pvt Ltd",
    "propertyType": "hotel",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "estimatedRooms": 50,
    "status": "in_progress",
    "source": "referral",
    "agentId": "uuid",
    "agentName": "John Doe",
    "territoryId": "uuid",
    "notes": "Interested in premium listing",
    "createdAt": "2025-11-15T10:00:00Z",
    "updatedAt": "2025-11-16T14:30:00Z"
  }
}
```

### Update Lead

```
PUT /api/internal/leads/:id
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "phone": "+1234567891",
  "estimatedRooms": 60,
  "notes": "Updated room count"
}
```

### Delete Lead

```
DELETE /api/internal/leads/:id
```

**Permissions**: Regional Manager, Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

### Update Lead Status

```
PUT /api/internal/leads/:id/status
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "status": "in_progress",
  "notes": "Follow-up scheduled"
}
```

### Add Communication

```
POST /api/internal/leads/:id/communications
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "type": "call",
  "subject": "Initial contact",
  "content": "Discussed property details and platform benefits",
  "scheduledAt": "2025-11-20T15:00:00Z",
  "completedAt": "2025-11-20T15:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "communication": {
    "id": "uuid",
    "type": "call",
    "subject": "Initial contact",
    "createdAt": "2025-11-20T15:30:00Z"
  }
}
```

### Get Communication History

```
GET /api/internal/leads/:id/communications
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "communications": [
    {
      "id": "uuid",
      "type": "call",
      "subject": "Initial contact",
      "content": "Discussed property details",
      "userId": "uuid",
      "userName": "John Doe",
      "completedAt": "2025-11-20T15:30:00Z",
      "createdAt": "2025-11-20T15:30:00Z"
    }
  ]
}
```

### Submit for Approval

```
POST /api/internal/leads/:id/submit-approval
```

**Permissions**: Agent (own leads)

**Response**:
```json
{
  "success": true,
  "message": "Lead submitted for approval",
  "lead": {
    "id": "uuid",
    "status": "pending_approval"
  }
}
```

### Approve Onboarding

```
POST /api/internal/leads/:id/approve
```

**Permissions**: Regional Manager (territory leads), Platform Admin, Superuser

**Request Body**:
```json
{
  "notes": "All documents verified, approved for onboarding"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Onboarding approved",
  "lead": {
    "id": "uuid",
    "status": "approved",
    "approvedAt": "2025-11-20T16:00:00Z"
  },
  "propertyOwner": {
    "id": "uuid",
    "email": "owner@abchotels.com",
    "credentialsSent": true
  }
}
```

### Reject Onboarding

```
POST /api/internal/leads/:id/reject
```

**Permissions**: Regional Manager (territory leads), Platform Admin, Superuser

**Request Body**:
```json
{
  "rejectionReason": "Incomplete documentation - missing business license"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Onboarding rejected",
  "lead": {
    "id": "uuid",
    "status": "rejected",
    "rejectionReason": "Incomplete documentation - missing business license"
  }
}
```

---

## Commission Management

### Get Commissions

```
GET /api/internal/commissions
```

**Permissions**: Agent (own commissions), Regional Manager (territory commissions), Platform Admin, Superuser

**Query Parameters**:
- `agentId`: Filter by agent
- `status`: Filter by status (earned, pending_payment, paid, cancelled)
- `startDate`: Filter by earned date
- `endDate`: Filter by earned date

**Response**:
```json
{
  "success": true,
  "commissions": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "agentName": "John Doe",
      "leadId": "uuid",
      "propertyName": "ABC Hotels",
      "amount": 500.00,
      "rate": 5.0,
      "status": "earned",
      "earnedDate": "2025-11-20T00:00:00Z"
    }
  ],
  "summary": {
    "totalEarned": 5000.00,
    "totalPending": 2000.00,
    "totalPaid": 3000.00
  }
}
```

### Get Commission Details

```
GET /api/internal/commissions/:id
```

**Permissions**: Agent (own commission), Regional Manager (territory commissions), Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "commission": {
    "id": "uuid",
    "agentId": "uuid",
    "agentName": "John Doe",
    "leadId": "uuid",
    "propertyId": "uuid",
    "propertyName": "ABC Hotels",
    "amount": 500.00,
    "rate": 5.0,
    "status": "paid",
    "earnedDate": "2025-11-20T00:00:00Z",
    "paymentDate": "2025-11-30T00:00:00Z",
    "paymentMethod": "bank_transfer",
    "transactionReference": "TXN123456",
    "notes": "Monthly commission payment"
  }
}
```

### Update Commission

```
PUT /api/internal/commissions/:id
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "amount": 550.00,
  "notes": "Adjusted for bonus"
}
```

### Mark Commission as Paid

```
POST /api/internal/commissions/:id/mark-paid
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "paymentDate": "2025-11-30T00:00:00Z",
  "paymentMethod": "bank_transfer",
  "transactionReference": "TXN123456",
  "notes": "November commission payment"
}
```

**Response**:
```json
{
  "success": true,
  "commission": {
    "id": "uuid",
    "status": "paid",
    "paymentDate": "2025-11-30T00:00:00Z"
  }
}
```

### Get Agent Commissions

```
GET /api/internal/commissions/agent/:agentId
```

**Permissions**: Agent (self), Regional Manager (territory agents), Platform Admin, Superuser

**Query Parameters**:
- `period`: Filter by period (monthly, quarterly, yearly)
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "commissions": [...],
  "summary": {
    "totalEarned": 5000.00,
    "totalPending": 2000.00,
    "totalPaid": 3000.00,
    "propertiesOnboarded": 10
  }
}
```

### Get Pending Commissions

```
GET /api/internal/commissions/pending
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "commissions": [...],
  "totalAmount": 15000.00
}
```

### Process Bulk Payments

```
POST /api/internal/commissions/bulk-pay
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "commissionIds": ["uuid1", "uuid2", "uuid3"],
  "paymentDate": "2025-11-30T00:00:00Z",
  "paymentMethod": "bank_transfer",
  "notes": "November bulk payment"
}
```

**Response**:
```json
{
  "success": true,
  "processed": 3,
  "totalAmount": 1500.00
}
```

### Configure Commission Rates

```
PUT /api/internal/commissions/rates
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "defaultRate": 5.0,
  "premiumRate": 7.5,
  "customRates": {
    "agentId1": 6.0,
    "agentId2": 8.0
  }
}
```

---

## Territory Management

### Get All Territories

```
GET /api/internal/territories
```

**Permissions**: All internal users

**Response**:
```json
{
  "success": true,
  "territories": [
    {
      "id": "uuid",
      "name": "Mumbai Zone",
      "description": "Covers Mumbai and surrounding areas",
      "regionalManagerId": "uuid",
      "regionalManagerName": "Jane Smith",
      "cities": ["Mumbai", "Navi Mumbai", "Thane"],
      "states": ["Maharashtra"],
      "isActive": true,
      "agentCount": 5,
      "propertyCount": 45
    }
  ]
}
```

### Create Territory

```
POST /api/internal/territories
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "name": "Mumbai Zone",
  "description": "Covers Mumbai and surrounding areas",
  "regionalManagerId": "uuid",
  "boundaries": {
    "type": "Polygon",
    "coordinates": [[...]]
  },
  "cities": ["Mumbai", "Navi Mumbai", "Thane"],
  "states": ["Maharashtra"]
}
```

**Response**:
```json
{
  "success": true,
  "territory": {
    "id": "uuid",
    "name": "Mumbai Zone",
    "isActive": true
  }
}
```

### Get Territory Details

```
GET /api/internal/territories/:id
```

**Permissions**: All internal users

**Response**:
```json
{
  "success": true,
  "territory": {
    "id": "uuid",
    "name": "Mumbai Zone",
    "description": "Covers Mumbai and surrounding areas",
    "regionalManagerId": "uuid",
    "regionalManagerName": "Jane Smith",
    "boundaries": {...},
    "cities": ["Mumbai", "Navi Mumbai", "Thane"],
    "states": ["Maharashtra"],
    "isActive": true,
    "statistics": {
      "agentCount": 5,
      "propertyCount": 45,
      "occupancyRate": 78.5,
      "monthlyRevenue": 150000.00
    }
  }
}
```

### Update Territory

```
PUT /api/internal/territories/:id
```

**Permissions**: Regional Manager (own territory), Platform Admin, Superuser

**Request Body**:
```json
{
  "description": "Updated description",
  "cities": ["Mumbai", "Navi Mumbai", "Thane", "Pune"],
  "boundaries": {...}
}
```

### Delete Territory

```
DELETE /api/internal/territories/:id
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Territory deleted successfully"
}
```

### Get Territory Agents

```
GET /api/internal/territories/:id/agents
```

**Permissions**: Regional Manager (own territory), Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "commissionRate": 5.0,
      "isActive": true,
      "performance": {
        "propertiesOnboarded": 10,
        "conversionRate": 75.5
      }
    }
  ]
}
```

### Assign Agent to Territory

```
POST /api/internal/territories/:id/assign-agent
```

**Permissions**: Regional Manager (own territory), Platform Admin, Superuser

**Request Body**:
```json
{
  "agentId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Agent assigned to territory successfully"
}
```

### Get Territory Properties

```
GET /api/internal/territories/:id/properties
```

**Permissions**: Regional Manager (own territory), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "properties": [
    {
      "id": "uuid",
      "name": "ABC Hotels",
      "city": "Mumbai",
      "propertyType": "hotel",
      "roomCount": 50,
      "occupancyRate": 85.0,
      "status": "active"
    }
  ]
}
```

### Get Territory Statistics

```
GET /api/internal/territories/:id/statistics
```

**Permissions**: Regional Manager (own territory), Operations Manager, Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date for statistics
- `endDate`: End date for statistics

**Response**:
```json
{
  "success": true,
  "statistics": {
    "agentCount": 5,
    "propertyCount": 45,
    "totalRooms": 2250,
    "occupancyRate": 78.5,
    "monthlyRevenue": 150000.00,
    "leadsInProgress": 12,
    "leadsConverted": 8
  }
}
```

---

## Agent Target Management

### Get Targets

```
GET /api/internal/targets
```

**Permissions**: Agent (own targets), Regional Manager (territory targets), Platform Admin, Superuser

**Query Parameters**:
- `agentId`: Filter by agent
- `period`: Filter by period (monthly, quarterly, yearly)
- `startDate`: Filter by start date
- `endDate`: Filter by end date

**Response**:
```json
{
  "success": true,
  "targets": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "agentName": "John Doe",
      "period": "monthly",
      "startDate": "2025-11-01",
      "endDate": "2025-11-30",
      "targetProperties": 5,
      "actualProperties": 3,
      "targetRevenue": 50000.00,
      "actualRevenue": 32000.00,
      "progressPercentage": 60.0
    }
  ]
}
```

### Set Target for Agent

```
POST /api/internal/targets
```

**Permissions**: Regional Manager (territory agents), Platform Admin, Superuser

**Request Body**:
```json
{
  "agentId": "uuid",
  "period": "monthly",
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "targetProperties": 5,
  "targetRevenue": 50000.00
}
```

**Response**:
```json
{
  "success": true,
  "target": {
    "id": "uuid",
    "agentId": "uuid",
    "period": "monthly",
    "targetProperties": 5
  }
}
```

### Get Target Details

```
GET /api/internal/targets/:id
```

**Permissions**: Agent (own target), Regional Manager (territory targets), Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "target": {
    "id": "uuid",
    "agentId": "uuid",
    "agentName": "John Doe",
    "period": "monthly",
    "startDate": "2025-11-01",
    "endDate": "2025-11-30",
    "targetProperties": 5,
    "actualProperties": 3,
    "targetRevenue": 50000.00,
    "actualRevenue": 32000.00,
    "progressPercentage": 60.0,
    "setBy": "uuid",
    "setByName": "Jane Smith"
  }
}
```

### Update Target

```
PUT /api/internal/targets/:id
```

**Permissions**: Regional Manager (territory targets), Platform Admin, Superuser

**Request Body**:
```json
{
  "targetProperties": 6,
  "targetRevenue": 60000.00
}
```

### Delete Target

```
DELETE /api/internal/targets/:id
```

**Permissions**: Regional Manager (territory targets), Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Target deleted successfully"
}
```

### Get Agent Targets

```
GET /api/internal/targets/agent/:agentId
```

**Permissions**: Agent (self), Regional Manager (territory agents), Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "targets": [...],
  "summary": {
    "currentTarget": {...},
    "overallProgress": 65.0,
    "targetsAchieved": 8,
    "targetsMissed": 2
  }
}
```

---

## Support Ticket Management

### Get All Tickets

```
GET /api/internal/tickets
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Query Parameters**:
- `status`: Filter by status (new, in_progress, waiting_response, resolved, closed)
- `priority`: Filter by priority (low, medium, high, urgent)
- `category`: Filter by category
- `assignedTo`: Filter by assigned user
- `propertyOwnerId`: Filter by property owner

**Response**:
```json
{
  "success": true,
  "tickets": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-001234",
      "title": "Payment gateway issue",
      "category": "technical",
      "priority": "high",
      "status": "in_progress",
      "propertyOwnerName": "ABC Hotels",
      "assignedToName": "Support Agent",
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

### Create Ticket

```
POST /api/internal/tickets
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "propertyOwnerId": "uuid",
  "propertyId": "uuid",
  "title": "Payment gateway issue",
  "description": "Property owner unable to process payments",
  "category": "technical",
  "priority": "high"
}
```

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticketNumber": "TKT-001234",
    "status": "new"
  }
}
```

### Get Ticket Details

```
GET /api/internal/tickets/:id
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticketNumber": "TKT-001234",
    "propertyOwnerId": "uuid",
    "propertyOwnerName": "ABC Hotels",
    "propertyId": "uuid",
    "propertyName": "ABC Hotels Mumbai",
    "title": "Payment gateway issue",
    "description": "Property owner unable to process payments",
    "category": "technical",
    "priority": "high",
    "status": "in_progress",
    "assignedTo": "uuid",
    "assignedToName": "Support Agent",
    "createdBy": "uuid",
    "createdByName": "Operations Manager",
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T14:30:00Z"
  }
}
```

### Update Ticket

```
PUT /api/internal/tickets/:id
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "priority": "urgent",
  "description": "Updated description with more details"
}
```

### Update Ticket Status

```
PUT /api/internal/tickets/:id/status
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "status": "in_progress",
  "notes": "Started investigating the issue"
}
```

### Assign Ticket

```
PUT /api/internal/tickets/:id/assign
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "assignedTo": "uuid"
}
```

### Add Response

```
POST /api/internal/tickets/:id/responses
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "message": "We have identified the issue and are working on a fix",
  "isInternal": false,
  "attachments": ["url1", "url2"]
}
```

**Response**:
```json
{
  "success": true,
  "response": {
    "id": "uuid",
    "message": "We have identified the issue...",
    "createdAt": "2025-11-20T15:00:00Z"
  }
}
```

### Get Responses

```
GET /api/internal/tickets/:id/responses
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "responses": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Support Agent",
      "message": "We have identified the issue...",
      "isInternal": false,
      "attachments": [],
      "createdAt": "2025-11-20T15:00:00Z"
    }
  ]
}
```

### Resolve Ticket

```
POST /api/internal/tickets/:id/resolve
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "resolution": "Payment gateway configuration updated. Issue resolved."
}
```

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "status": "resolved",
    "resolvedAt": "2025-11-20T16:00:00Z"
  }
}
```

### Close Ticket

```
POST /api/internal/tickets/:id/close
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "status": "closed"
  }
}
```

---

## Document Management

### Upload Document

```
POST /api/internal/documents/upload
```

**Permissions**: Agent, Regional Manager, Operations Manager, Platform Admin, Superuser

**Request**: Multipart form data
- `file`: Document file (PDF, JPG, PNG)
- `leadId`: Lead ID (optional)
- `propertyOwnerId`: Property owner ID (optional)
- `documentType`: Type (business_license, property_photos, owner_id, tax_certificate, other)

**Response**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "fileName": "business_license.pdf",
    "fileUrl": "https://storage.example.com/docs/...",
    "documentType": "business_license",
    "status": "pending_review"
  }
}
```

### Get Document

```
GET /api/internal/documents/:id
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "leadId": "uuid",
    "propertyOwnerId": "uuid",
    "documentType": "business_license",
    "fileName": "business_license.pdf",
    "fileUrl": "https://storage.example.com/docs/...",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "uploadedBy": "uuid",
    "uploadedByName": "John Doe",
    "status": "approved",
    "reviewedBy": "uuid",
    "reviewedByName": "Jane Smith",
    "reviewNotes": "Document verified",
    "createdAt": "2025-11-20T10:00:00Z"
  }
}
```

### Delete Document

```
DELETE /api/internal/documents/:id
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### Review Document

```
PUT /api/internal/documents/:id/review
```

**Permissions**: Regional Manager, Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "status": "approved",
  "reviewNotes": "Document verified and approved"
}
```

**Response**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "status": "approved",
    "reviewedAt": "2025-11-20T16:00:00Z"
  }
}
```

### Get Lead Documents

```
GET /api/internal/documents/lead/:leadId
```

**Permissions**: Agent (own leads), Regional Manager (territory leads), Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "documentType": "business_license",
      "fileName": "business_license.pdf",
      "status": "approved",
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

---

## Audit Log

### Get Audit Logs

```
GET /api/internal/audit
```

**Permissions**: Platform Admin, Superuser

**Query Parameters**:
- `userId`: Filter by user
- `action`: Filter by action type
- `resourceType`: Filter by resource type
- `isCritical`: Filter critical actions (true/false)
- `startDate`: Filter by date
- `endDate`: Filter by date
- `page`: Page number
- `limit`: Results per page

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "action": "approve_onboarding",
      "resourceType": "lead",
      "resourceId": "uuid",
      "changes": {
        "before": {"status": "pending_approval"},
        "after": {"status": "approved"}
      },
      "ipAddress": "192.168.1.1",
      "isCritical": true,
      "createdAt": "2025-11-20T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250
  }
}
```

### Get Specific Audit Entry

```
GET /api/internal/audit/:id
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "log": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "John Doe",
    "userRole": "regional_manager",
    "action": "approve_onboarding",
    "resourceType": "lead",
    "resourceId": "uuid",
    "changes": {
      "before": {"status": "pending_approval"},
      "after": {"status": "approved", "approvedAt": "2025-11-20T16:00:00Z"}
    },
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "isCritical": true,
    "createdAt": "2025-11-20T16:00:00Z"
  }
}
```

### Get User Activity

```
GET /api/internal/audit/user/:userId
```

**Permissions**: Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Filter by date
- `endDate`: Filter by date
- `page`: Page number
- `limit`: Results per page

**Response**:
```json
{
  "success": true,
  "logs": [...],
  "summary": {
    "totalActions": 150,
    "criticalActions": 12,
    "mostFrequentAction": "update_lead"
  }
}
```

### Get Resource History

```
GET /api/internal/audit/resource/:resourceType/:resourceId
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "action": "update_lead",
      "changes": {...},
      "createdAt": "2025-11-20T14:00:00Z"
    }
  ]
}
```

### Export Audit Logs

```
POST /api/internal/audit/export
```

**Permissions**: Superuser

**Request Body**:
```json
{
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "format": "csv",
  "filters": {
    "userId": "uuid",
    "isCritical": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "downloadUrl": "https://storage.example.com/exports/audit_logs_2025-11.csv",
  "expiresAt": "2025-11-21T00:00:00Z"
}
```

---

## Dashboard Endpoints

### Get Agent Dashboard

```
GET /api/internal/dashboard/agent
```

**Permissions**: Agent (self)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "kpis": {
      "propertiesOnboarded": 15,
      "pendingLeads": 8,
      "commissionEarned": 5000.00,
      "conversionRate": 75.5
    },
    "leadPipeline": {
      "contacted": 3,
      "in_progress": 5,
      "pending_approval": 2,
      "approved": 15,
      "rejected": 1
    },
    "recentActivities": [...],
    "commissionSummary": {
      "earned": 5000.00,
      "pending": 2000.00,
      "paid": 3000.00
    },
    "currentTarget": {
      "targetProperties": 5,
      "actualProperties": 3,
      "progressPercentage": 60.0
    }
  }
}
```

### Get Regional Manager Dashboard

```
GET /api/internal/dashboard/regional-manager
```

**Permissions**: Regional Manager (self)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "teamOverview": {
      "agentCount": 5,
      "totalPropertiesOnboarded": 45,
      "averageConversionRate": 72.3
    },
    "regionalStatistics": {
      "propertyCount": 45,
      "occupancyRate": 78.5,
      "monthlyRevenue": 150000.00
    },
    "pendingApprovals": 3,
    "teamPerformance": [...],
    "territoryStats": {...}
  }
}
```

### Get Operations Manager Dashboard

```
GET /api/internal/dashboard/operations-manager
```

**Permissions**: Operations Manager (self)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "platformHealth": {
      "totalProperties": 250,
      "totalBookings": 1500,
      "occupancyRate": 75.0,
      "activeUsers": 180
    },
    "supportTickets": {
      "new": 5,
      "in_progress": 12,
      "high_priority": 3
    },
    "propertyHealthAlerts": [...],
    "platformTrends": {...},
    "alerts": [...]
  }
}
```

### Get Platform Admin Dashboard

```
GET /api/internal/dashboard/platform-admin
```

**Permissions**: Platform Admin (self)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "userManagement": {
      "totalInternalUsers": 25,
      "totalPropertyOwners": 200,
      "activeUsers": 180
    },
    "systemConfiguration": {...},
    "subscriptionManagement": {
      "activeSubscriptions": 180,
      "expiringThisMonth": 12
    },
    "apiUsage": {...}
  }
}
```

### Get Superuser Dashboard

```
GET /api/internal/dashboard/superuser
```

**Permissions**: Superuser (self)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "platformOverview": {
      "totalProperties": 250,
      "totalRevenue": 500000.00,
      "totalUsers": 225,
      "systemHealth": "healthy"
    },
    "recentAuditLogs": [...],
    "financialSummary": {
      "monthlyRevenue": 150000.00,
      "commissionsEarned": 15000.00,
      "commissionsPaid": 10000.00
    },
    "systemHealth": {...},
    "criticalAlerts": [...]
  }
}
```

---

## Performance & Analytics

### Get Agent Performance

```
GET /api/internal/analytics/agent/:agentId
```

**Permissions**: Agent (self), Regional Manager (territory agents), Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "analytics": {
    "propertiesOnboarded": 15,
    "conversionRate": 75.5,
    "averageOnboardingTime": 7.5,
    "commissionEarned": 5000.00,
    "leadsByStatus": {...},
    "performanceTrend": [...],
    "topPerformingMonths": [...]
  }
}
```

### Get Team Performance

```
GET /api/internal/analytics/team/:territoryId
```

**Permissions**: Regional Manager (own territory), Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "analytics": {
    "totalPropertiesOnboarded": 45,
    "averageConversionRate": 72.3,
    "totalCommissionEarned": 25000.00,
    "agentPerformance": [...],
    "teamTrends": [...],
    "topPerformers": [...]
  }
}
```

### Get Platform Analytics

```
GET /api/internal/analytics/platform
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "analytics": {
    "totalProperties": 250,
    "totalBookings": 1500,
    "occupancyRate": 75.0,
    "totalRevenue": 500000.00,
    "bookingTrends": [...],
    "revenueTrends": [...],
    "propertyTypeBreakdown": {...},
    "regionalComparison": [...]
  }
}
```

### Get Regional Analytics

```
GET /api/internal/analytics/regional/:territoryId
```

**Permissions**: Regional Manager (own territory), Operations Manager, Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "analytics": {
    "propertyCount": 45,
    "occupancyRate": 78.5,
    "monthlyRevenue": 150000.00,
    "growthRate": 12.5,
    "trends": [...],
    "cityBreakdown": {...}
  }
}
```

### Export Analytics Report

```
POST /api/internal/analytics/export
```

**Permissions**: Regional Manager, Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "reportType": "team_performance",
  "territoryId": "uuid",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "format": "pdf"
}
```

**Response**:
```json
{
  "success": true,
  "downloadUrl": "https://storage.example.com/reports/team_performance_2025-11.pdf",
  "expiresAt": "2025-11-21T00:00:00Z"
}
```

---

## Announcement Management

### Get All Announcements

```
GET /api/internal/announcements
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "announcements": [
    {
      "id": "uuid",
      "title": "Platform Maintenance Scheduled",
      "targetAudience": "all_property_owners",
      "scheduledAt": "2025-11-25T00:00:00Z",
      "sentAt": null,
      "status": "scheduled",
      "createdBy": "uuid",
      "createdByName": "Operations Manager"
    }
  ]
}
```

### Create Announcement

```
POST /api/internal/announcements
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "title": "Platform Maintenance Scheduled",
  "content": "We will be performing scheduled maintenance on November 25th from 2 AM to 4 AM IST.",
  "targetAudience": "all_property_owners",
  "targetFilters": {
    "regions": [],
    "propertyTypes": []
  },
  "deliveryMethod": ["email", "in_app"],
  "scheduledAt": "2025-11-25T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "announcement": {
    "id": "uuid",
    "title": "Platform Maintenance Scheduled",
    "status": "scheduled"
  }
}
```

### Get Announcement Details

```
GET /api/internal/announcements/:id
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "announcement": {
    "id": "uuid",
    "title": "Platform Maintenance Scheduled",
    "content": "We will be performing scheduled maintenance...",
    "targetAudience": "all_property_owners",
    "targetFilters": {...},
    "deliveryMethod": ["email", "in_app"],
    "scheduledAt": "2025-11-25T00:00:00Z",
    "sentAt": null,
    "readCount": 0,
    "totalRecipients": 0,
    "createdBy": "uuid",
    "createdByName": "Operations Manager",
    "createdAt": "2025-11-20T10:00:00Z"
  }
}
```

### Update Announcement

```
PUT /api/internal/announcements/:id
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Request Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "scheduledAt": "2025-11-26T00:00:00Z"
}
```

### Delete Announcement

```
DELETE /api/internal/announcements/:id
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

### Send Announcement

```
POST /api/internal/announcements/:id/send
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "Announcement sent successfully",
  "totalRecipients": 200
}
```

### Get Announcement Statistics

```
GET /api/internal/announcements/:id/statistics
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "statistics": {
    "totalRecipients": 200,
    "readCount": 150,
    "readPercentage": 75.0,
    "deliveryStatus": {
      "email": {
        "sent": 200,
        "delivered": 198,
        "failed": 2
      },
      "in_app": {
        "delivered": 200
      }
    }
  }
}
```

---

## Subscription Management

### Get All Subscriptions

```
GET /api/internal/subscriptions
```

**Permissions**: Platform Admin, Superuser

**Query Parameters**:
- `status`: Filter by status (active, expired, cancelled)
- `plan`: Filter by plan type

**Response**:
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "uuid",
      "propertyOwnerId": "uuid",
      "propertyOwnerName": "ABC Hotels",
      "plan": "premium",
      "status": "active",
      "billingCycle": "monthly",
      "amount": 999.00,
      "startDate": "2025-11-01",
      "endDate": "2025-12-01",
      "autoRenew": true
    }
  ]
}
```

### Get Owner Subscription

```
GET /api/internal/subscriptions/:ownerId
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "propertyOwnerId": "uuid",
    "plan": "premium",
    "status": "active",
    "billingCycle": "monthly",
    "amount": 999.00,
    "startDate": "2025-11-01",
    "endDate": "2025-12-01",
    "autoRenew": true,
    "features": [...]
  }
}
```

### Upgrade Subscription

```
PUT /api/internal/subscriptions/:id/upgrade
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "newPlan": "enterprise",
  "billingCycle": "yearly"
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "plan": "enterprise",
    "proratedCharge": 500.00,
    "nextBillingDate": "2026-11-01"
  }
}
```

### Apply Discount

```
PUT /api/internal/subscriptions/:id/discount
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "discountType": "percentage",
  "discountValue": 20,
  "expiresAt": "2026-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "originalAmount": 999.00,
    "discountedAmount": 799.20,
    "discountApplied": true
  }
}
```

### Get Billing History

```
GET /api/internal/subscriptions/:id/billing-history
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "billingHistory": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-001234",
      "amount": 999.00,
      "status": "paid",
      "billingDate": "2025-11-01",
      "paymentMethod": "credit_card",
      "transactionId": "TXN123456"
    }
  ]
}
```

---

## Search

### Global Search

```
GET /api/internal/search
```

**Permissions**: All internal users

**Query Parameters**:
- `q`: Search query
- `type`: Filter by type (property, owner, lead)
- `limit`: Results limit (default: 20)

**Response**:
```json
{
  "success": true,
  "results": {
    "properties": [
      {
        "id": "uuid",
        "name": "ABC Hotels",
        "city": "Mumbai",
        "propertyType": "hotel",
        "ownerName": "John Doe",
        "status": "active"
      }
    ],
    "owners": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "propertyCount": 2
      }
    ],
    "leads": [
      {
        "id": "uuid",
        "propertyOwnerName": "XYZ Hotels",
        "status": "in_progress",
        "agentName": "Jane Smith"
      }
    ]
  }
}
```

---

## API Key Management

### Create API Key

```
POST /api/internal/api-keys
```

**Permissions**: Platform Admin, Superuser

**Request Body**:
```json
{
  "name": "Third Party Integration",
  "permissions": ["read_properties", "read_bookings"],
  "expiresAt": "2026-11-20"
}
```

**Response**:
```json
{
  "success": true,
  "apiKey": {
    "id": "uuid",
    "name": "Third Party Integration",
    "key": "sk_live_abc123...",
    "permissions": ["read_properties", "read_bookings"],
    "expiresAt": "2026-11-20"
  }
}
```

### Get All API Keys

```
GET /api/internal/api-keys
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "apiKeys": [
    {
      "id": "uuid",
      "name": "Third Party Integration",
      "permissions": ["read_properties", "read_bookings"],
      "isActive": true,
      "lastUsedAt": "2025-11-20T10:00:00Z",
      "expiresAt": "2026-11-20"
    }
  ]
}
```

### Revoke API Key

```
DELETE /api/internal/api-keys/:id
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

### Get API Usage

```
GET /api/internal/api-keys/:id/usage
```

**Permissions**: Platform Admin, Superuser

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date

**Response**:
```json
{
  "success": true,
  "usage": {
    "totalRequests": 15000,
    "successfulRequests": 14850,
    "failedRequests": 150,
    "averageResponseTime": 120,
    "requestsByEndpoint": {...},
    "requestsByDay": [...]
  }
}
```

---

## Platform Health

### Get Health Metrics

```
GET /api/internal/health/metrics
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "metrics": {
    "apiResponseTime": 120,
    "errorRate": 0.5,
    "uptime": 99.9,
    "activeConnections": 150
  }
}
```

### Get Capacity Metrics

```
GET /api/internal/health/capacity
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "capacity": {
    "totalProperties": 250,
    "totalRooms": 12500,
    "currentBookingLoad": 9375,
    "capacityUtilization": 75.0
  }
}
```

### Get Activity Metrics

```
GET /api/internal/health/activity
```

**Permissions**: Operations Manager, Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "activity": {
    "activeUsers": 180,
    "concurrentSessions": 45,
    "peakUsageTime": "18:00-20:00",
    "dailyActiveUsers": 200
  }
}
```

### Get Infrastructure Metrics

```
GET /api/internal/health/infrastructure
```

**Permissions**: Platform Admin, Superuser

**Response**:
```json
{
  "success": true,
  "infrastructure": {
    "databaseSize": "5.2 GB",
    "storageUsage": "15.8 GB",
    "lastBackup": "2025-11-20T02:00:00Z",
    "backupStatus": "healthy"
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "email": "Invalid email format",
    "phone": "Phone number is required"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide a valid JWT token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "You do not have permission to perform this action",
  "requiredRole": "platform_admin"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found",
  "message": "Lead with ID 'uuid' not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Rate Limiting

All API endpoints are rate limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Search endpoints**: 30 requests per minute per user
- **Export endpoints**: 10 requests per hour per user

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1637424000
```

---

## Pagination

List endpoints support pagination using query parameters:

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

Paginated responses include:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhooks

The system supports webhooks for real-time notifications of events:

### Supported Events

- `lead.created`
- `lead.status_changed`
- `lead.approved`
- `lead.rejected`
- `commission.earned`
- `commission.paid`
- `ticket.created`
- `ticket.resolved`
- `announcement.sent`

### Webhook Payload

```json
{
  "event": "lead.approved",
  "timestamp": "2025-11-20T16:00:00Z",
  "data": {
    "leadId": "uuid",
    "propertyOwnerName": "ABC Hotels",
    "agentId": "uuid",
    "approvedBy": "uuid"
  }
}
```

Configure webhooks in the Platform Admin dashboard.

---

## Best Practices

1. **Authentication**: Always include JWT token in Authorization header
2. **Error Handling**: Check `success` field in response before processing data
3. **Rate Limiting**: Implement exponential backoff for rate limit errors
4. **Pagination**: Use pagination for large datasets to improve performance
5. **Caching**: Cache frequently accessed data (roles, territories) on client side
6. **Validation**: Validate data on client side before sending to API
7. **Security**: Never expose API keys or JWT tokens in client-side code
8. **Logging**: Log all API errors for debugging and monitoring

---

## Support

For API support or questions, contact:
- Email: api-support@goroomz.com
- Documentation: https://docs.goroomz.com/api
- Status Page: https://status.goroomz.com
