# Internal Room Management API Documentation

This document describes the internal management API endpoints for room, category, and bed management.

## Overview

These endpoints are part of the Internal Management System and require authentication via JWT token. All endpoints are prefixed with `/api/internal/`.

## Authentication

All endpoints require the `protectInternal` middleware, which verifies:
- Valid JWT token in `Authorization: Bearer <token>` header
- User has internal management access (admin, owner, category_owner, or staff with staffRole)

Some endpoints also require specific permissions via `requirePermissions` middleware.

## Room Status Management

### GET /api/internal/rooms/status

Get all rooms with current status for a property.

**Requirements:** 1.1, 1.2

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property owner ID

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

### PUT /api/internal/rooms/:id/status

Update room status.

**Requirements:** 7.1

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

**Notes:**
- When status is set to `vacant_clean`, `lastCleanedAt` is automatically updated
- Creates a history record in `RoomStatus` table

### GET /api/internal/rooms/floor/:floorNumber

Get all rooms on a specific floor.

**Requirements:** 1.1, 1.4

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property owner ID

**Response:**
```json
{
  "success": true,
  "floorNumber": 1,
  "count": 5,
  "data": [
    // Same format as /status endpoint
  ]
}
```

## Room Category Management

### GET /api/internal/categories

Get all custom categories for a property.

**Requirements:** 2.1

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property owner ID

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

### POST /api/internal/categories

Create a new custom category.

**Requirements:** 2.1

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

**Validation:**
- Category name must be at least 2 characters
- Category name must be unique per property

### PUT /api/internal/categories/:id

Update a category.

**Requirements:** 2.4

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

### DELETE /api/internal/categories/:id

Delete a category (with validation).

**Requirements:** 2.5

**Permissions Required:** `canManageRooms`

**Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully."
}
```

**Error Response (if rooms assigned):**
```json
{
  "success": false,
  "message": "Cannot delete category. 5 room(s) are currently assigned to this category. Please reassign or remove these rooms first.",
  "roomCount": 5
}
```

### POST /api/internal/categories/rooms/:id/assign-category

Assign a category to a room.

**Requirements:** 2.2

**Permissions Required:** `canManageRooms`

**Request Body:**
```json
{
  "categoryId": "uuid"
}
```

**To remove category assignment:**
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

**Validation:**
- Category must exist and belong to same property as room
- Category must be active

## Bed Management (PG Rooms)

### GET /api/internal/rooms/:id/beds

Get all beds for a room.

**Requirements:** 6.1

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
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/internal/rooms/:id/beds

Create bed assignments when sharing type is set.

**Requirements:** 5.2

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

**Validation:**
- Room must have `sharingType` and `totalBeds` set
- Beds must not already exist for the room

### PUT /api/internal/beds/:id/status

Update bed status.

**Requirements:** 5.3

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

**Notes:**
- When marking as `occupied`, `bookingId` is required
- When marking as `vacant`, `bookingId` and `occupantId` are cleared

### GET /api/internal/beds/:id/occupant

Get occupant info for a bed.

**Requirements:** 6.3

**Response (occupied bed):**
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

**Response (vacant bed):**
```json
{
  "success": true,
  "data": {
    "bedId": "uuid",
    "bedNumber": 1,
    "roomNumber": "101",
    "floorNumber": 1,
    "status": "vacant",
    "occupant": null,
    "booking": null,
    "message": "Bed is currently vacant."
  }
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (development only)"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Implementation Notes

1. **Property Access Control:**
   - Admins can access any property by providing `propertyId`
   - Owners/category owners automatically use their own ID
   - Staff users must provide `propertyId` in query parameters

2. **Permissions:**
   - `canUpdateRoomStatus` - Required for updating room/bed status
   - `canManageRooms` - Required for category and bed management

3. **Database Models:**
   - `Room` - Extended with internal management fields
   - `RoomStatus` - History of status changes
   - `RoomCategory` - Custom categories per property
   - `BedAssignment` - Individual beds in shared rooms

4. **Associations:**
   - Room → RoomCategory (customCategory)
   - Room → BedAssignment (beds)
   - BedAssignment → Booking (booking)
   - BedAssignment → User (occupant)
   - RoomStatus → User (updatedByUser)

## Testing

To test these endpoints:

1. Obtain a JWT token via `/api/internal/auth/login`
2. Include token in Authorization header: `Bearer <token>`
3. Ensure user has appropriate role and permissions
4. Use appropriate `propertyId` for staff users

Example using curl:
```bash
curl -X GET "http://localhost:5000/api/internal/rooms/status?propertyId=uuid" \
  -H "Authorization: Bearer <token>"
```
