# Internal Booking Management API

This document describes the internal booking management endpoints for the GoRoomz Internal Management System.

## Authentication

All endpoints require authentication using JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Users must have appropriate permissions (admin, owner, or staff with specific permissions).

## Endpoints

### 1. Create Offline Booking

**POST** `/api/internal/bookings`

Create a new offline booking (walk-in or phone reservation).

**Requirements:** 10.1, 10.2, 10.3, 10.4, 10.5, 17.2

**Request Body:**
```json
{
  "roomId": "uuid",
  "bedId": "uuid (optional, for PG shared rooms)",
  "guestName": "string",
  "guestEmail": "string",
  "guestPhone": "string",
  "checkIn": "ISO date string",
  "checkOut": "ISO date string (optional, defaults to 30 days for PG)",
  "guests": "number (optional, defaults to 1)",
  "totalAmount": "number (optional, calculated if not provided)",
  "specialRequests": "string (optional)",
  "paymentStatus": "string (optional, defaults to 'pending')"
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
    "checkIn": "date",
    "checkOut": "date",
    "status": "confirmed",
    "bookingSource": "offline",
    "room": { ... },
    "user": { ... },
    "bed": { ... }
  }
}
```

**Features:**
- Validates room availability
- Prevents double-booking for rooms and beds
- Creates user account if guest doesn't exist
- Supports bed-level booking for PG shared rooms
- Marks booking source as "offline"

---

### 2. Process Check-in

**POST** `/api/internal/bookings/:id/checkin`

Process guest check-in for a booking.

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

**Permissions Required:** `canCheckIn`

**Request Body:**
```json
{
  "securityDepositAmount": "number (optional)",
  "securityDepositMethod": "string (optional, defaults to 'cash')",
  "notes": "string (optional)"
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
    "actualCheckInTime": "timestamp",
    "checkedInBy": "uuid",
    "room": {
      "currentStatus": "occupied"
    },
    "securityDeposit": { ... }
  }
}
```

**Features:**
- Validates booking status (must be pending or confirmed)
- Checks room is clean and available
- Updates room status to "occupied"
- Updates bed status if bed booking
- Records security deposit if provided
- Records staff member who performed check-in

---

### 3. Process Check-out

**POST** `/api/internal/bookings/:id/checkout`

Process guest check-out for a booking.

**Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5

**Permissions Required:** `canCheckOut`

**Request Body:**
```json
{
  "notes": "string (optional)"
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
    "actualCheckOutTime": "timestamp",
    "checkedOutBy": "uuid",
    "room": {
      "currentStatus": "vacant_dirty"
    }
  }
}
```

**Features:**
- Validates booking is checked in
- Updates booking status to "completed"
- Updates room status to "vacant_dirty"
- Frees up bed if bed booking
- Records staff member who performed check-out

---

### 4. Get All Bookings with Filters

**GET** `/api/internal/bookings`

Retrieve all bookings with optional filtering and search.

**Requirements:** 11.3, 11.4, 11.5

**Query Parameters:**
- `status` - Filter by booking status (pending, confirmed, completed, cancelled)
- `bookingSource` - Filter by source (online, offline)
- `startDate` - Filter bookings from this date
- `endDate` - Filter bookings until this date
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
      "checkIn": "date",
      "checkOut": "date",
      "status": "confirmed",
      "bookingSource": "offline",
      "room": { ... },
      "user": { ... },
      "bed": { ... }
    }
  ]
}
```

**Features:**
- Filter by status, booking source, and date range
- Search across guest name, email, phone, and room number
- Pagination support
- Returns associated room, user, and bed information

---

### 5. Get Today's Pending Check-ins

**GET** `/api/internal/bookings/pending-checkin`

Get all bookings scheduled for check-in today that haven't been checked in yet.

**Requirements:** 8.1

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "checkIn": "today's date",
      "status": "confirmed",
      "actualCheckInTime": null,
      "room": { ... },
      "user": { ... }
    }
  ]
}
```

**Features:**
- Filters bookings with check-in date = today
- Excludes already checked-in bookings
- Sorted by check-in time

---

### 6. Get Today's Pending Check-outs

**GET** `/api/internal/bookings/pending-checkout`

Get all bookings scheduled for check-out today that haven't been checked out yet.

**Requirements:** 9.1

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "checkOut": "today's date",
      "status": "confirmed",
      "actualCheckInTime": "timestamp",
      "actualCheckOutTime": null,
      "room": { ... },
      "user": { ... }
    }
  ]
}
```

**Features:**
- Filters bookings with check-out date = today
- Only includes checked-in bookings
- Excludes already checked-out bookings
- Sorted by check-out time

---

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Error description"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Missing required permissions: canCheckIn"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Booking not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error processing request",
  "error": "Detailed error message"
}
```

---

## Double-Booking Prevention

The system implements comprehensive double-booking prevention:

1. **Room-level:** Checks for overlapping bookings on the same room
2. **Bed-level:** For PG shared rooms, checks specific bed availability
3. **Date overlap detection:** Validates that new booking dates don't conflict with existing bookings
4. **Status filtering:** Only considers active bookings (pending, confirmed)

**Overlap Logic:**
```
New booking overlaps if:
  newCheckIn < existingCheckOut AND
  newCheckOut > existingCheckIn
```

---

## Booking Source Tracking

All bookings are tagged with their source:
- **online:** Created through customer-facing website
- **offline:** Created through internal management system (walk-ins, phone reservations)

This enables:
- Filtering and reporting by booking source
- Visual distinction in the UI
- Analytics on booking channels

---

## Status Transitions

**Booking Status Flow:**
```
pending → confirmed → completed
   ↓
cancelled
```

**Room Status Flow (Check-in/Check-out):**
```
vacant_clean → occupied → vacant_dirty → vacant_clean
```

**Bed Status Flow:**
```
vacant → occupied → vacant
```

---

## Testing

Run the test suite:
```bash
npm test -- internalBookings.test.js
```

All endpoints are covered by unit tests validating:
- Check-in/check-out processes
- Offline booking creation
- Double-booking prevention
- Filtering and search functionality
- Pending check-ins/check-outs retrieval
