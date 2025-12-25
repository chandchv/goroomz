# Dashboard and Staff Management API Documentation

## Overview

This document describes the Dashboard and Staff Management endpoints for the Internal Management System.

## Dashboard Endpoints

### GET /api/internal/dashboard/kpis

Get key performance indicators for the dashboard.

**Requirements:** 31.1

**Authentication:** Required (Internal Management)

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property ID to fetch KPIs for

**Response:**
```json
{
  "success": true,
  "data": {
    "occupancy": {
      "rate": 75.00,
      "totalRooms": 100,
      "occupiedRooms": 75,
      "vacantRooms": 25
    },
    "revenue": {
      "currentMonth": 50000.00,
      "currency": "INR"
    },
    "payments": {
      "pendingCount": 10,
      "pendingAmount": 15000.00
    },
    "roomStatus": {
      "occupied": 75,
      "vacant_clean": 20,
      "vacant_dirty": 5
    }
  }
}
```

### GET /api/internal/dashboard/activities

Get today's activities (check-ins, check-outs, payments due).

**Requirements:** 31.3

**Authentication:** Required (Internal Management)

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property ID to fetch activities for

**Response:**
```json
{
  "success": true,
  "data": {
    "checkIns": [
      {
        "id": "booking-id",
        "guestName": "John Doe",
        "guestPhone": "1234567890",
        "roomNumber": "101",
        "floorNumber": 1,
        "checkInTime": "2024-01-15T14:00:00Z",
        "guests": 2,
        "status": "confirmed"
      }
    ],
    "checkOuts": [
      {
        "id": "booking-id",
        "guestName": "Jane Smith",
        "guestPhone": "0987654321",
        "roomNumber": "102",
        "floorNumber": 1,
        "checkOutTime": "2024-01-15T11:00:00Z",
        "guests": 1,
        "status": "confirmed"
      }
    ],
    "paymentsDue": [
      {
        "id": "schedule-id",
        "bookingId": "booking-id",
        "guestName": "John Doe",
        "roomNumber": "101",
        "amount": 5000.00,
        "dueDate": "2024-01-15",
        "status": "pending"
      }
    ]
  }
}
```

### GET /api/internal/dashboard/alerts

Get alerts for overdue payments, maintenance, and dirty rooms.

**Requirements:** 31.4

**Authentication:** Required (Internal Management)

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property ID to fetch alerts for

**Response:**
```json
{
  "success": true,
  "data": {
    "overduePayments": [
      {
        "id": "schedule-id",
        "bookingId": "booking-id",
        "guestName": "John Doe",
        "guestPhone": "1234567890",
        "roomNumber": "101",
        "amount": 5000.00,
        "dueDate": "2024-01-08",
        "daysOverdue": 7
      }
    ],
    "pendingMaintenance": [
      {
        "id": "request-id",
        "roomNumber": "102",
        "floorNumber": 1,
        "title": "Broken AC",
        "priority": "urgent",
        "status": "pending",
        "reportedDate": "2024-01-14T10:00:00Z"
      }
    ],
    "dirtyRooms": [
      {
        "id": "room-id",
        "roomNumber": "103",
        "floorNumber": 1,
        "title": "Room 103",
        "hoursDirty": 30,
        "lastCleanedAt": "2024-01-14T08:00:00Z"
      }
    ]
  }
}
```

## Staff Management Endpoints

### GET /api/internal/staff

Get all staff users for a property.

**Requirements:** 33.1

**Authentication:** Required (Internal Management with `canManageStaff` permission)

**Query Parameters:**
- `role` (optional): Filter by staff role (front_desk, housekeeping, maintenance, manager)
- `active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "staff-id",
      "name": "Front Desk Staff",
      "email": "frontdesk@example.com",
      "phone": "1234567890",
      "role": "user",
      "staffRole": "front_desk",
      "permissions": {
        "canCheckIn": true,
        "canCheckOut": true,
        "canManageRooms": false,
        "canRecordPayments": true,
        "canViewReports": false,
        "canManageStaff": false,
        "canUpdateRoomStatus": false,
        "canManageMaintenance": false
      },
      "avatar": null,
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/internal/staff

Create a new staff user.

**Requirements:** 33.1, 33.2, 33.3, 33.4, 33.5

**Authentication:** Required (Internal Management with `canManageStaff` permission)

**Request Body:**
```json
{
  "name": "New Staff",
  "email": "newstaff@example.com",
  "phone": "1234567890",
  "staffRole": "front_desk",
  "permissions": {
    "canCheckIn": true,
    "canCheckOut": true
  },
  "generatePasswordFlag": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff user created successfully. Please save the generated password securely.",
  "generatedPassword": "a1b2c3d4e5f6g7h8",
  "data": {
    "id": "staff-id",
    "name": "New Staff",
    "email": "newstaff@example.com",
    "phone": "1234567890",
    "role": "user",
    "staffRole": "front_desk",
    "permissions": {
      "canCheckIn": true,
      "canCheckOut": true,
      "canManageRooms": false,
      "canRecordPayments": false,
      "canViewReports": false,
      "canManageStaff": false,
      "canUpdateRoomStatus": false,
      "canManageMaintenance": false
    },
    "isVerified": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### PUT /api/internal/staff/:id

Update a staff user.

**Requirements:** 33.1, 33.2, 33.3, 33.4, 33.5

**Authentication:** Required (Internal Management with `canManageStaff` permission)

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "0987654321",
  "staffRole": "manager",
  "permissions": {
    "canCheckIn": true,
    "canCheckOut": true,
    "canManageRooms": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff user updated successfully.",
  "data": {
    "id": "staff-id",
    "name": "Updated Name",
    "email": "updated@example.com",
    "phone": "0987654321",
    "role": "user",
    "staffRole": "manager",
    "permissions": {
      "canCheckIn": true,
      "canCheckOut": true,
      "canManageRooms": true,
      "canRecordPayments": true,
      "canViewReports": true,
      "canManageStaff": true,
      "canUpdateRoomStatus": true,
      "canManageMaintenance": true
    },
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### DELETE /api/internal/staff/:id

Delete a staff user.

**Requirements:** 33.1

**Authentication:** Required (Internal Management with `canManageStaff` permission)

**Response:**
```json
{
  "success": true,
  "message": "Staff user deleted successfully.",
  "data": {
    "id": "staff-id",
    "name": "Deleted Staff",
    "email": "deleted@example.com"
  }
}
```

### PUT /api/internal/staff/:id/permissions

Update staff user permissions.

**Requirements:** 33.2, 33.3, 33.4, 33.5

**Authentication:** Required (Internal Management with `canManageStaff` permission)

**Request Body:**
```json
{
  "permissions": {
    "canCheckIn": true,
    "canCheckOut": true,
    "canRecordPayments": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff permissions updated successfully.",
  "data": {
    "id": "staff-id",
    "name": "Staff Name",
    "staffRole": "front_desk",
    "permissions": {
      "canCheckIn": true,
      "canCheckOut": true,
      "canManageRooms": false,
      "canRecordPayments": true,
      "canViewReports": false,
      "canManageStaff": false,
      "canUpdateRoomStatus": false,
      "canManageMaintenance": false
    },
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

## Staff Roles and Default Permissions

### Front Desk
- `canCheckIn`: true
- `canCheckOut`: true
- `canRecordPayments`: true
- All others: false

### Housekeeping
- `canUpdateRoomStatus`: true
- All others: false

### Maintenance
- `canManageMaintenance`: true
- All others: false

### Manager
- All permissions: true

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Property ID is required for staff users."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Staff user not found."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch dashboard KPIs.",
  "error": "Error details (only in development mode)"
}
```

## Implementation Notes

1. **Property Access Control**: The dashboard endpoints automatically determine the property owner ID based on the user's role:
   - Admin users can specify any `propertyId` in the query
   - Owner/Category Owner users use their own ID
   - Staff users must provide `propertyId` in the query

2. **Password Generation**: When creating staff users with `generatePasswordFlag: true`, a secure random password is generated and returned in the response. This password should be saved securely and communicated to the staff member.

3. **Permission Inheritance**: When changing a staff member's role, their permissions are automatically updated to match the default permissions for that role unless custom permissions are explicitly provided.

4. **Deletion Protection**: The system prevents deletion of:
   - Admin accounts
   - Owner accounts
   - The user's own account

5. **Dashboard Auto-Refresh**: The dashboard is designed to be refreshed every 60 seconds (as per Requirement 31.5) to maintain real-time accuracy.
