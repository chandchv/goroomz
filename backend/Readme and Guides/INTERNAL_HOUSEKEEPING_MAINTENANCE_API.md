# Internal Housekeeping and Maintenance API Documentation

This document describes the housekeeping and maintenance management endpoints for the internal management system.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Housekeeping Endpoints

### 1. Get Pending Cleaning Tasks

**Endpoint:** `GET /api/internal/housekeeping/tasks`

**Description:** Retrieves all rooms with `vacant_dirty` status that need cleaning. Tasks are automatically prioritized based on how long the room has been dirty (high priority if > 24 hours).

**Requirements:** 13.1, 13.2, 13.4

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property ID to filter by
- `floorNumber` (optional): Filter tasks by specific floor number

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "room-uuid",
      "roomNumber": "101",
      "floorNumber": 1,
      "category": "Standard",
      "status": "vacant_dirty",
      "lastCleanedAt": "2024-01-15T10:30:00Z",
      "hoursSinceDirty": 26,
      "priority": "high",
      "roomType": "hotel"
    }
  ]
}
```

**Priority Levels:**
- `high`: Room has been dirty for more than 24 hours
- `normal`: Room has been dirty for less than 24 hours

**Example:**
```bash
curl -X GET "http://localhost:5000/api/internal/housekeeping/tasks?floorNumber=1" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Mark Room as Clean

**Endpoint:** `POST /api/internal/housekeeping/tasks/:roomId/complete`

**Description:** Marks a room as clean, updates the room status to `vacant_clean`, and creates a housekeeping log entry.

**Requirements:** 13.3, 7.3

**Permissions Required:** `canUpdateRoomStatus`

**URL Parameters:**
- `roomId`: UUID of the room to mark as clean

**Request Body:**
```json
{
  "timeTaken": 30,
  "checklistCompleted": [
    {
      "item": "Bed made",
      "completed": true
    },
    {
      "item": "Bathroom cleaned",
      "completed": true
    },
    {
      "item": "Floor vacuumed",
      "completed": true
    }
  ],
  "issuesFound": "Minor stain on carpet",
  "notes": "Room cleaned thoroughly"
}
```

**Request Body Fields:**
- `timeTaken` (optional): Time taken to clean in minutes (0-480)
- `checklistCompleted` (optional): Array of checklist items with completion status
- `issuesFound` (optional): Any issues found during cleaning
- `notes` (optional): Additional notes

**Response:**
```json
{
  "success": true,
  "message": "Room marked as clean successfully.",
  "data": {
    "room": {
      "id": "room-uuid",
      "roomNumber": "101",
      "floorNumber": 1,
      "previousStatus": "vacant_dirty",
      "currentStatus": "vacant_clean",
      "lastCleanedAt": "2024-01-16T14:30:00Z"
    },
    "log": {
      "id": "log-uuid",
      "cleanedBy": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "cleanedAt": "2024-01-16T14:30:00Z",
      "timeTaken": 30,
      "checklistCompleted": [...],
      "issuesFound": "Minor stain on carpet",
      "notes": "Room cleaned thoroughly"
    }
  }
}
```

**Validation:**
- Room must exist
- Room must be in `vacant_dirty` status
- `timeTaken` must be between 0 and 480 minutes if provided
- Each checklist item must have `item` (string) and `completed` (boolean) fields

**Example:**
```bash
curl -X POST "http://localhost:5000/api/internal/housekeeping/tasks/room-uuid/complete" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timeTaken": 30,
    "checklistCompleted": [
      {"item": "Bed made", "completed": true},
      {"item": "Bathroom cleaned", "completed": true}
    ],
    "notes": "Room cleaned thoroughly"
  }'
```

---

### 3. Get Cleaning History

**Endpoint:** `GET /api/internal/housekeeping/history/:roomId`

**Description:** Retrieves the cleaning history for a specific room.

**Requirements:** 13.2

**URL Parameters:**
- `roomId`: UUID of the room

**Query Parameters:**
- `limit` (optional, default: 50): Maximum number of records to return
- `offset` (optional, default: 0): Number of records to skip

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room-uuid",
    "roomNumber": "101",
    "floorNumber": 1,
    "currentStatus": "vacant_clean",
    "lastCleanedAt": "2024-01-16T14:30:00Z"
  },
  "count": 15,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "id": "log-uuid",
      "cleanedAt": "2024-01-16T14:30:00Z",
      "cleanedBy": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "housekeeping"
      },
      "timeTaken": 30,
      "checklistCompleted": [...],
      "issuesFound": "Minor stain on carpet",
      "notes": "Room cleaned thoroughly"
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:5000/api/internal/housekeeping/history/room-uuid?limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## Maintenance Endpoints

### 1. Get Maintenance Requests

**Endpoint:** `GET /api/internal/maintenance/requests`

**Description:** Retrieves maintenance requests with optional filtering.

**Requirements:** 30.2

**Query Parameters:**
- `propertyId` (optional for owners, required for staff): Property ID to filter by
- `status` (optional): Filter by status (`pending`, `in_progress`, `completed`, `cancelled`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `urgent`)
- `roomId` (optional): Filter by specific room
- `floorNumber` (optional): Filter by floor number
- `assignedTo` (optional): Filter by assigned staff member
- `limit` (optional, default: 50): Maximum number of records to return
- `offset` (optional, default: 0): Number of records to skip

**Response:**
```json
{
  "success": true,
  "count": 5,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "id": "request-uuid",
      "title": "Leaking faucet",
      "description": "The bathroom faucet is leaking continuously",
      "priority": "high",
      "status": "pending",
      "room": {
        "id": "room-uuid",
        "roomNumber": "101",
        "floorNumber": 1,
        "roomType": "hotel",
        "category": "Standard"
      },
      "reportedBy": {
        "id": "user-uuid",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "owner"
      },
      "assignedTo": {
        "id": "staff-uuid",
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "role": "maintenance"
      },
      "reportedDate": "2024-01-15T10:00:00Z",
      "expectedCompletionDate": "2024-01-16",
      "completedDate": null,
      "workPerformed": null,
      "costIncurred": null,
      "images": ["https://example.com/image1.jpg"],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:5000/api/internal/maintenance/requests?status=pending&priority=high" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Create Maintenance Request

**Endpoint:** `POST /api/internal/maintenance/requests`

**Description:** Creates a new maintenance request for a room.

**Requirements:** 30.1, 30.3

**Request Body:**
```json
{
  "roomId": "room-uuid",
  "title": "Leaking faucet",
  "description": "The bathroom faucet is leaking continuously and needs immediate repair",
  "priority": "high",
  "assignedTo": "staff-uuid",
  "expectedCompletionDate": "2024-01-16",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Request Body Fields:**
- `roomId` (required): UUID of the room
- `title` (required): Brief title (3-200 characters)
- `description` (required): Detailed description
- `priority` (optional, default: "medium"): Priority level (`low`, `medium`, `high`, `urgent`)
- `assignedTo` (optional): UUID of staff member to assign
- `expectedCompletionDate` (optional): Expected completion date (YYYY-MM-DD)
- `images` (optional): Array of image URLs

**Response:**
```json
{
  "success": true,
  "message": "Maintenance request created successfully.",
  "data": {
    "id": "request-uuid",
    "title": "Leaking faucet",
    "description": "The bathroom faucet is leaking continuously",
    "priority": "high",
    "status": "pending",
    "room": {
      "id": "room-uuid",
      "roomNumber": "101",
      "floorNumber": 1,
      "roomType": "hotel"
    },
    "reportedBy": {
      "id": "user-uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "owner"
    },
    "assignedTo": {
      "id": "staff-uuid",
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "role": "maintenance"
    },
    "reportedDate": "2024-01-15T10:00:00Z",
    "expectedCompletionDate": "2024-01-16",
    "images": ["https://example.com/image1.jpg"],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Validation:**
- `roomId`, `title`, and `description` are required
- `title` must be 3-200 characters
- `priority` must be one of: `low`, `medium`, `high`, `urgent`
- Room must exist
- Assigned user must exist if `assignedTo` is provided
- Images must be an array of URL strings

**Example:**
```bash
curl -X POST "http://localhost:5000/api/internal/maintenance/requests" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "title": "Leaking faucet",
    "description": "The bathroom faucet is leaking continuously",
    "priority": "high",
    "images": ["https://example.com/image1.jpg"]
  }'
```

---

### 3. Update Maintenance Request

**Endpoint:** `PUT /api/internal/maintenance/requests/:id`

**Description:** Updates a maintenance request's status, assignment, or other details.

**Requirements:** 30.3, 30.4, 30.5

**URL Parameters:**
- `id`: UUID of the maintenance request

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "urgent",
  "assignedTo": "staff-uuid",
  "expectedCompletionDate": "2024-01-17",
  "workPerformed": "Replaced the faucet washer and tightened connections",
  "costIncurred": 150.50,
  "images": ["https://example.com/before.jpg", "https://example.com/after.jpg"]
}
```

**Request Body Fields (all optional):**
- `status`: New status (`pending`, `in_progress`, `completed`, `cancelled`)
- `priority`: New priority (`low`, `medium`, `high`, `urgent`)
- `assignedTo`: UUID of staff member (or `null` to unassign)
- `expectedCompletionDate`: Expected completion date (YYYY-MM-DD)
- `workPerformed`: Description of work performed
- `costIncurred`: Cost in currency units (non-negative number)
- `images`: Array of image URLs

**Response:**
```json
{
  "success": true,
  "message": "Maintenance request updated successfully.",
  "data": {
    "id": "request-uuid",
    "title": "Leaking faucet",
    "description": "The bathroom faucet is leaking continuously",
    "priority": "urgent",
    "status": "in_progress",
    "room": {...},
    "reportedBy": {...},
    "assignedTo": {...},
    "reportedDate": "2024-01-15T10:00:00Z",
    "expectedCompletionDate": "2024-01-17",
    "completedDate": null,
    "workPerformed": "Replaced the faucet washer",
    "costIncurred": "150.50",
    "images": [...],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-16T11:30:00Z"
  }
}
```

**Validation:**
- Request must exist
- `status` must be one of: `pending`, `in_progress`, `completed`, `cancelled`
- `priority` must be one of: `low`, `medium`, `high`, `urgent`
- `workPerformed` is required when marking as `completed`
- `costIncurred` must be non-negative if provided
- Assigned user must exist if `assignedTo` is provided
- When status is set to `completed`, `completedDate` is automatically set

**Example:**
```bash
curl -X PUT "http://localhost:5000/api/internal/maintenance/requests/request-uuid" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "workPerformed": "Replaced the faucet washer and tightened connections",
    "costIncurred": 150.50
  }'
```

---

### 4. Get Maintenance History

**Endpoint:** `GET /api/internal/maintenance/requests/:roomId/history`

**Description:** Retrieves the maintenance history for a specific room.

**Requirements:** 30.5

**URL Parameters:**
- `roomId`: UUID of the room

**Query Parameters:**
- `limit` (optional, default: 50): Maximum number of records to return
- `offset` (optional, default: 0): Number of records to skip

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room-uuid",
    "roomNumber": "101",
    "floorNumber": 1,
    "roomType": "hotel",
    "category": "Standard",
    "lastMaintenanceAt": "2024-01-16T15:00:00Z"
  },
  "count": 8,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "id": "request-uuid",
      "title": "Leaking faucet",
      "description": "The bathroom faucet is leaking continuously",
      "priority": "high",
      "status": "completed",
      "reportedBy": {...},
      "assignedTo": {...},
      "reportedDate": "2024-01-15T10:00:00Z",
      "expectedCompletionDate": "2024-01-16",
      "completedDate": "2024-01-16T15:00:00Z",
      "workPerformed": "Replaced the faucet washer",
      "costIncurred": "150.50",
      "images": [...],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-16T15:00:00Z"
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:5000/api/internal/maintenance/requests/room-uuid/history?limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided" | "Invalid token"
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
  "message": "Room not found" | "Maintenance request not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to perform operation",
  "error": "Detailed error message (development only)"
}
```

---

## Notes

1. **Housekeeping Priority**: Rooms are automatically prioritized based on how long they've been dirty. High priority is assigned to rooms that have been dirty for more than 24 hours.

2. **Room Status Updates**: When a room is marked as clean, the `lastCleanedAt` timestamp is automatically updated.

3. **Maintenance Tracking**: When a maintenance request is created, the room's `lastMaintenanceAt` timestamp is updated.

4. **Completion Requirements**: Maintenance requests marked as `completed` must include `workPerformed` description.

5. **Permissions**: Housekeeping staff need `canUpdateRoomStatus` permission to mark rooms as clean. All authenticated internal users can create and view maintenance requests.

6. **Data Validation**: All endpoints perform thorough validation of input data to ensure data integrity.
