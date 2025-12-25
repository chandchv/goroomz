# Internal Management System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization & Permissions](#authorization--permissions)
4. [Common Response Formats](#common-response-formats)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Room Management Endpoints](#room-management-endpoints)
7. [Category Management Endpoints](#category-management-endpoints)
8. [Bed Management Endpoints](#bed-management-endpoints)
9. [Booking Management Endpoints](#booking-management-endpoints)
10. [Payment Management Endpoints](#payment-management-endpoints)
11. [Security Deposit Endpoints](#security-deposit-endpoints)
12. [Housekeeping Endpoints](#housekeeping-endpoints)
13. [Maintenance Endpoints](#maintenance-endpoints)
14. [Reporting Endpoints](#reporting-endpoints)
15. [Dashboard Endpoints](#dashboard-endpoints)
16. [Staff Management Endpoints](#staff-management-endpoints)
17. [Superuser Management Endpoints](#superuser-management-endpoints)

---

## Overview

The Internal Management System API provides comprehensive endpoints for property owners, administrators, and staff to manage day-to-day operations of Hotels and PGs (Paying Guests) on the GoRoomz platform.

**Base URL:** `http://localhost:5000/api/internal`

**API Version:** 1.0

**Technology Stack:**
- Node.js + Express
- PostgreSQL with Sequelize ORM
- JWT for authentication
- RESTful architecture

---

## Authentication

All internal management endpoints require authentication using JWT (JSON Web Token).

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Obtaining a Token

Use the login endpoint to obtain a JWT token:

```http
POST /api/internal/auth/login
```

The token should be included in all subsequent requests in the Authorization header.

### Token Expiration

Tokens expire after 7 days by default. The frontend should handle token refresh or re-authentication.

---

## Authorization & Permissions

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrator | Full access to all features including superuser functions |
| `owner` | Property owner | Full access to their properties |
| `category_owner` | Category owner | Access to their properties |
| `front_desk` | Front desk staff | Check-in/check-out, bookings, payments |
| `housekeeping` | Housekeeping staff | Room status updates, cleaning tasks |
| `maintenance` | Maintenance staff | Maintenance requests and updates |
| `manager` | Property manager | All staff functions plus reports |

### Permission System

Permissions are stored in the `permissions` JSONB field:

```json
{
  "canCheckIn": boolean,
  "canCheckOut": boolean,
  "canManageRooms": boolean,
  "canRecordPayments": boolean,
  "canViewReports": boolean,
  "canManageStaff": boolean,
  "canUpdateRoomStatus": boolean,
  "canManageMaintenance": boolean
}
```

### Middleware Functions

- `protectInternal` - Verifies JWT and internal access
- `authorizeRoles(...roles)` - Checks user role
- `authorizeStaffRoles(...staffRoles)` - Checks staff role
- `requirePermissions(...permissions)` - Checks specific permissions
- `requireSuperuser` - Restricts to admin only

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server error |

---

## Authentication Endpoints

### POST /api/internal/auth/login

Authenticate staff users, property owners, and admins.

**Requirements:** 32.1, 33.1

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "staffRole": null,
    "permissions": {
      "canCheckIn": true,
      "canCheckOut": true,
      "canManageRooms": true,
      "canRecordPayments": true,
      "canViewReports": true,
      "canManageStaff": true,
      "canUpdateRoomStatus": true,
      "canManageMaintenance": true
    }
  }
}
```

**Validation:**
- Rejects social login users (Firebase-only accounts)
- Rejects regular users without internal access
- Validates email and password

---

### POST /api/internal/auth/logout

Logout the current user.

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Client-side token removal (JWT-based)

---

### GET /api/internal/auth/me

Get current authenticated user information.

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "staffRole": null,
    "permissions": { /* permissions object */ }
  }
}
```

---

### GET /api/internal/auth/verify

Verify token validity.

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

## Room Management Endpoints

### GET /api/internal/rooms/status

Get all rooms with current status for a property.

**Requirements:** 1.1, 1.2

**Authentication Required:** Yes

**Query Parameters:**
- `propertyId` (optional for owners, required for staff)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "roomNumber": "101",
      "floorNumber": 1,
      "title": "Deluxe Room",
      "category": "Suite",
      "customCategoryId": "uuid",
      "roomType": "PG",
      "sharingType": "2_sharing",
      "totalBeds": 2,
      "currentStatus": "vacant_clean",
      "lastCleanedAt": "2024-01-15T10:30:00Z",
      "lastMaintenanceAt": "2024-01-10T14:00:00Z",
      "beds": [
        {
          "id": "uuid",
          "bedNumber": 1,
          "status": "occupied",
          "bookingId": "uuid",
          "occupantId": "uuid"
        }
      ],
      "occupiedBeds": 1,
      "availableBeds": 1
    }
  ]
}
```

---

### PUT /api/internal/rooms/:id/status

Update room status.

**Requirements:** 7.1

**Authentication Required:** Yes

**Permissions Required:** `canUpdateRoomStatus`

**Request Body:**
```json
{
  "status": "vacant_clean",
  "notes": "Cleaned after checkout"
}
```

**Valid Statuses:** `occupied`, `vacant_clean`, `vacant_dirty`

**Response:**
```json
{
  "success": true,
  "message": "Room status updated successfully.",
  "data": {
    "id": "uuid",
    "roomNumber": "101",
    "previousStatus": "vacant_dirty",
    "currentStatus": "vacant_clean",
    "lastCleanedAt": "2024-01-15T10:30:00Z",
    "updatedBy": "uuid",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /api/internal/rooms/floor/:floorNumber

Get all rooms on a specific floor.

**Requirements:** 1.1, 1.4

**Authentication Required:** Yes

**Query Parameters:**
- `propertyId` (optional for owners, required for staff)

**Response:**
```json
{
  "success": true,
  "floorNumber": 1,
  "count": 5,
  "data": [
    /* Same format as /status endpoint */
  ]
}
```

---

## Category Management Endpoints

### GET /api/internal/categories

Get all custom categories for a property.

**Requirements:** 2.1

**Authentication Required:** Yes

**Query Parameters:**
- `propertyId` (optional for owners, required for staff)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "name": "Suite",
      "description": "Luxury suite rooms",
      "isActive": true,
      "roomCount": 5,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/internal/categories

Create a new custom category.

**Requirements:** 2.1

**Authentication Required:** Yes

**Permissions Required:** `canManageRooms`

**Request Body:**
```json
{
  "name": "Deluxe",
  "description": "Deluxe rooms with premium amenities"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": {
    "id": "uuid",
    "name": "Deluxe",
    "description": "Deluxe rooms with premium amenities",
    "isActive": true,
    "roomCount": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### PUT /api/internal/categories/:id

Update a category.

**Requirements:** 2.4

**Authentication Required:** Yes

**Permissions Required:** `canManageRooms`

**Request Body:**
```json
{
  "name": "Premium Deluxe",
  "description": "Updated description",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category updated successfully.",
  "data": {
    "id": "uuid",
    "name": "Premium Deluxe",
    "description": "Updated description",
    "isActive": true,
    "roomCount": 5,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### DELETE /api/internal/categories/:id

Delete a category (with validation).

**Requirements:** 2.5

**Authentication Required:** Yes

**Permissions Required:** `canManageRooms`

**Response (Success):**
```json
{
  "success": true,
  "message": "Category deleted successfully."
}
```

**Response (Error - rooms assigned):**
```json
{
  "success": false,
  "message": "Cannot delete category. 5 room(s) are currently assigned to this category.",
  "roomCount": 5
}
```

---

### POST /api/internal/categories/rooms/:id/assign-category

Assign a category to a room.

**Requirements:** 2.2

**Authentication Required:** Yes

**Permissions Required:** `canManageRooms`

**Request Body:**
```json
{
  "categoryId": "uuid"
}
```

**To remove category:**
```json
{
  "categoryId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category assigned to room successfully.",
  "data": {
    "id": "uuid",
    "roomNumber": "101",
    "customCategoryId": "uuid",
    "categoryName": "Deluxe"
  }
}
```

---

## Bed Management Endpoints

### GET /api/internal/rooms/:id/beds

Get all beds for a room.

**Requirements:** 6.1

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "roomId": "uuid",
  "roomNumber": "101",
  "sharingType": "2_sharing",
  "totalBeds": 2,
  "count": 2,
  "data": [
    {
      "id": "uuid",
      "bedNumber": 1,
      "status": "occupied",
      "bookingId": "uuid",
      "booking": {
        "id": "uuid",
        "checkInDate": "2024-01-01",
        "checkOutDate": "2024-02-01",
        "status": "active"
      },
      "occupant": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      }
    }
  ]
}
```

---

### POST /api/internal/rooms/:id/beds

Create bed assignments when sharing type is set.

**Requirements:** 5.2

**Authentication Required:** Yes

**Permissions Required:** `canManageRooms`

**Response:**
```json
{
  "success": true,
  "message": "Successfully created 2 bed assignments for room 101.",
  "data": {
    "roomId": "uuid",
    "roomNumber": "101",
    "sharingType": "2_sharing",
    "totalBeds": 2,
    "beds": [
      {
        "id": "uuid",
        "bedNumber": 1,
        "status": "vacant"
      },
      {
        "id": "uuid",
        "bedNumber": 2,
        "status": "vacant"
      }
    ]
  }
}
```

---

### PUT /api/internal/beds/:id/status

Update bed status.

**Requirements:** 5.3

**Authentication Required:** Yes

**Permissions Required:** `canUpdateRoomStatus`

**Request Body:**
```json
{
  "status": "occupied",
  "bookingId": "uuid",
  "occupantId": "uuid"
}
```

**Valid Statuses:** `occupied`, `vacant`

**Response:**
```json
{
  "success": true,
  "message": "Bed status updated successfully.",
  "data": {
    "id": "uuid",
    "bedNumber": 1,
    "roomId": "uuid",
    "roomNumber": "101",
    "previousStatus": "vacant",
    "currentStatus": "occupied",
    "bookingId": "uuid",
    "occupantId": "uuid",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /api/internal/beds/:id/occupant

Get occupant info for a bed.

**Requirements:** 6.3

**Authentication Required:** Yes

**Response (Occupied):**
```json
{
  "success": true,
  "data": {
    "bedId": "uuid",
    "bedNumber": 1,
    "roomNumber": "101",
    "floorNumber": 1,
    "status": "occupied",
    "occupant": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "booking": {
      "id": "uuid",
      "checkInDate": "2024-01-01",
      "checkOutDate": "2024-02-01",
      "status": "active",
      "totalAmount": 5000.00
    }
  }
}
```

**Response (Vacant):**
```json
{
  "success": true,
  "data": {
    "bedId": "uuid",
    "bedNumber": 1,
    "roomNumber": "101",
    "status": "vacant",
    "occupant": null,
    "booking": null,
    "message": "Bed is currently vacant."
  }
}
```

---

## Booking Management Endpoints

### POST /api/internal/bookings

Create a new offline booking (walk-in or phone reservation).

**Requirements:** 10.1, 10.2, 10.3, 10.4, 10.5, 17.2

**Authentication Required:** Yes

**Request Body:**
```json
{
  "roomId": "uuid",
  "bedId": "uuid (optional, for PG shared rooms)",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "guests": 1,
  "totalAmount": 5000.00,
  "specialRequests": "Early check-in requested",
  "paymentStatus": "pending"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offline booking created successfully",
  "data": {
    "id": "uuid",
    "roomId": "uuid",
    "bedId": "uuid or null",
    "userId": "uuid",
    "checkIn": "2024-01-15",
    "checkOut": "2024-01-20",
    "status": "confirmed",
    "bookingSource": "offline",
    "room": { /* room details */ },
    "user": { /* user details */ },
    "bed": { /* bed details if applicable */ }
  }
}
```

**Features:**
- Validates room availability
- Prevents double-booking
- Creates user account if guest doesn't exist
- Supports bed-level booking for PG shared rooms

---

### POST /api/internal/bookings/:id/checkin

Process guest check-in for a booking.

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

**Authentication Required:** Yes

**Permissions Required:** `canCheckIn`

**Request Body:**
```json
{
  "securityDepositAmount": 1000.00,
  "securityDepositMethod": "cash",
  "notes": "Guest arrived early"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in completed successfully",
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "actualCheckInTime": "2024-01-15T14:30:00Z",
    "checkedInBy": "uuid",
    "room": {
      "currentStatus": "occupied"
    },
    "securityDeposit": {
      "id": "uuid",
      "amount": 1000.00,
      "status": "collected"
    }
  }
}
```

---

### POST /api/internal/bookings/:id/checkout

Process guest check-out for a booking.

**Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5

**Authentication Required:** Yes

**Permissions Required:** `canCheckOut`

**Request Body:**
```json
{
  "notes": "Guest checked out on time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-out completed successfully",
  "data": {
    "id": "uuid",
    "status": "completed",
    "actualCheckOutTime": "2024-01-20T11:00:00Z",
    "checkedOutBy": "uuid",
    "room": {
      "currentStatus": "vacant_dirty"
    }
  }
}
```

---

### GET /api/internal/bookings

Retrieve all bookings with optional filtering and search.

**Requirements:** 11.3, 11.4, 11.5

**Authentication Required:** Yes

**Query Parameters:**
- `status` - Filter by status (pending, confirmed, completed, cancelled)
- `bookingSource` - Filter by source (online, offline)
- `startDate` - Filter from this date
- `endDate` - Filter until this date
- `search` - Search by guest name, email, phone, or room number
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "id": "uuid",
      "checkIn": "2024-01-15",
      "checkOut": "2024-01-20",
      "status": "confirmed",
      "bookingSource": "offline",
      "room": { /* room details */ },
      "user": { /* user details */ },
      "bed": { /* bed details if applicable */ }
    }
  ]
}
```

---

### GET /api/internal/bookings/pending-checkin

Get all bookings scheduled for check-in today.

**Requirements:** 8.1

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "checkIn": "2024-01-15",
      "status": "confirmed",
      "actualCheckInTime": null,
      "room": { /* room details */ },
      "user": { /* user details */ }
    }
  ]
}
```

---

### GET /api/internal/bookings/pending-checkout

Get all bookings scheduled for check-out today.

**Requirements:** 9.1

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "checkOut": "2024-01-15",
      "status": "confirmed",
      "actualCheckInTime": "2024-01-10T14:00:00Z",
      "actualCheckOutTime": null,
      "room": { /* room details */ },
      "user": { /* user details */ }
    }
  ]
}
```

---

## Payment Management Endpoints

### GET /api/internal/payments

Get all payments for a property.

**Requirements:** 21.1, 21.2

**Authentication Required:** Yes

**Query Parameters:**
- `propertyId` (optional for owners, required for staff)
- `bookingId` (optional) - Filter by booking
- `status` (optional) - Filter by status
- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter to date

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "amount": 5000.00,
      "paymentDate": "2024-01-15",
      "paymentMethod": "cash",
      "transactionReference": "TXN123456",
      "paymentType": "booking",
      "status": "completed",
      "recordedBy": "uuid",
      "notes": "Full payment received",
      "booking": { /* booking details */ }
    }
  ]
}
```

---

### POST /api/internal/payments

Record a payment.

**Requirements:** 21.1, 21.2, 21.3

**Authentication Required:** Yes

**Permissions Required:** `canRecordPayments`

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 5000.00,
  "paymentMethod": "cash",
  "transactionReference": "TXN123456",
  "paymentType": "booking",
  "notes": "Full payment received"
}
```

**Valid Payment Methods:** `cash`, `card`, `upi`, `bank_transfer`

**Valid Payment Types:** `booking`, `monthly_rent`, `security_deposit`

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": 5000.00,
    "paymentDate": "2024-01-15",
    "paymentMethod": "cash",
    "status": "completed",
    "recordedBy": "uuid"
  }
}
```

---

### PUT /api/internal/payments/:id

Update a payment.

**Requirements:** 21.4

**Authentication Required:** Yes

**Permissions Required:** `canRecordPayments`

**Request Body:**
```json
{
  "amount": 5500.00,
  "paymentMethod": "card",
  "transactionReference": "TXN789012",
  "notes": "Updated payment details"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment updated successfully",
  "data": {
    "id": "uuid",
    "amount": 5500.00,
    "paymentMethod": "card",
    "updatedAt": "2024-01-15T15:00:00Z"
  }
}
```

---

### GET /api/internal/payments/overdue

Get overdue payments.

**Requirements:** 22.1, 22.2

**Authentication Required:** Yes

**Query Parameters:**
- `propertyId` (optional for owners, required for staff)
- `floorNumber` (optional) - Filter by floor
- `roomNumber` (optional) - Filter by room

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "dueDate": "2024-01-10",
      "amount": 5000.00,
      "status": "overdue",
      "daysOverdue": 5,
      "booking": {
        "room": { /* room details */ },
        "user": { /* user details */ }
      }
    }
  ]
}
```

---

### GET /api/internal/payments/schedule/:bookingId

Get payment schedule for a booking.

**Requirements:** 20.1, 20.2, 20.3

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "bookingId": "uuid",
  "count": 12,
  "data": [
    {
      "id": "uuid",
      "dueDate": "2024-02-01",
      "amount": 5000.00,
      "status": "pending",
      "paidDate": null,
      "paymentId": null,
      "daysOverdue": 0
    }
  ]
}
```

---

### POST /api/internal/payments/schedule

Create payment schedule on check-in (PG).

**Requirements:** 20.1

**Authentication Required:** Yes

**Request Body:**
```json
{
  "bookingId": "uuid",
  "monthlyAmount": 5000.00,
  "startDate": "2024-01-15",
  "numberOfMonths": 12
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment schedule created successfully",
  "data": {
    "bookingId": "uuid",
    "schedules": [
      {
        "id": "uuid",
        "dueDate": "2024-02-15",
        "amount": 5000.00,
        "status": "pending"
      }
    ]
  }
}
```

---

